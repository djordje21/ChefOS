-- ChefOS Phase 2.0 · security hardening (additive, non-destructive)
--
-- H1  An invitation is honoured only while the person who sent it could still
--     grant it: active member of an active workspace, holds member.manage, holds
--     every permission of the invited role, has all-outlet access if the
--     invitation grants it, and holds every outlet permission it grants.
--     Checked again at acceptance; open invitations that stop qualifying are
--     revoked automatically when the inviter's access changes.
-- M1  Invitations cannot be accepted into a suspended workspace.
-- M2  A deactivated outlet grants no outlet permission to anyone. Only members
--     with the workspace-level outlet.manage permission still see it (to
--     reactivate it). Existing outlet assignments are kept, so reactivation
--     restores exactly the previous access; while inactive they grant nothing.

alter table public.invitations
  add column revoked_reason text check (revoked_reason in ('manual', 'replaced', 'inviter_access_changed', 'outlet_deactivated'));

-- Outlet permission of an arbitrary user (the caller-based helper below delegates to it).
create function private.user_has_outlet_perm(p_workspace_id uuid, p_outlet_id uuid, p_user_id uuid, p_perm text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    join public.outlets o on o.workspace_id = m.workspace_id and o.id = p_outlet_id
    where m.workspace_id = p_workspace_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and w.status = 'active'
      and o.active
      and (
        (m.all_outlets and exists (
          select 1 from public.role_permissions rp
          where rp.role_id = m.role_id and rp.permission_code = p_perm))
        or exists (
          select 1
          from public.outlet_memberships om
          join public.role_permissions rp on rp.role_id = om.role_id
          where om.workspace_id = m.workspace_id
            and om.outlet_id = p_outlet_id
            and om.user_id = m.user_id
            and rp.permission_code = p_perm)
      )
  )
$$;

-- Same signature as before; now also requires the outlet to be active (M2).
create or replace function private.has_outlet_perm(p_workspace_id uuid, p_outlet_id uuid, p_perm text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select private.user_has_outlet_perm(p_workspace_id, p_outlet_id, auth.uid(), p_perm)
$$;

-- Outlet access can be granted only on active outlets.
create or replace function private.assert_can_grant_outlet_role(p_workspace_id uuid, p_outlet_id uuid, p_role_id uuid)
returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_perm   text;
  v_active boolean;
begin
  select active into v_active from public.outlets where id = p_outlet_id and workspace_id = p_workspace_id;
  if v_active is null then
    raise exception 'Unknown outlet' using errcode = '22023';
  end if;
  if not v_active then
    raise exception 'This outlet is inactive' using errcode = '22023';
  end if;
  if not exists (select 1 from public.roles where id = p_role_id and workspace_id = p_workspace_id and level = 'outlet') then
    raise exception 'Unknown outlet role' using errcode = '22023';
  end if;
  foreach v_perm in array private.role_perms(p_role_id) loop
    if not private.has_outlet_perm(p_workspace_id, p_outlet_id, v_perm) then
      raise exception 'You cannot grant outlet permissions you do not have' using errcode = '42501';
    end if;
  end loop;
end $$;

-- H1: could the inviter still grant everything this invitation grants?
create function private.invitation_still_grantable(p_invitation_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv     public.invitations;
  v_inviter public.memberships;
  v_grant   jsonb;
  v_perm    text;
begin
  select * into v_inv from public.invitations where id = p_invitation_id;
  if v_inv.id is null then
    return false;
  end if;
  select m.* into v_inviter
  from public.memberships m
  join public.workspaces w on w.id = m.workspace_id
  where m.workspace_id = v_inv.workspace_id and m.user_id = v_inv.invited_by
    and m.status = 'active' and w.status = 'active';
  if v_inviter.user_id is null then
    return false;
  end if;
  if not ('member.manage' = any (private.role_perms(v_inviter.role_id))) then
    return false;
  end if;
  if not (private.role_perms(v_inv.role_id) <@ private.role_perms(v_inviter.role_id)) then
    return false;
  end if;
  if v_inv.all_outlets and not v_inviter.all_outlets then
    return false;
  end if;
  for v_grant in select * from jsonb_array_elements(v_inv.outlet_grants) loop
    foreach v_perm in array private.role_perms((v_grant ->> 'role_id')::uuid) loop
      if not private.user_has_outlet_perm(v_inv.workspace_id, (v_grant ->> 'outlet_id')::uuid, v_inv.invited_by, v_perm) then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $$;

-- Revokes open invitations that no longer qualify. Called by triggers.
create function private.revoke_ungrantable_invitations(
  p_workspace_id uuid, p_inviter uuid, p_outlet_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.invitations i
     set revoked_at = now(), revoked_reason = p_reason
   where i.workspace_id = p_workspace_id
     and (p_inviter is null or i.invited_by = p_inviter)
     and (p_outlet_id is null or i.outlet_grants @> jsonb_build_array(jsonb_build_object('outlet_id', p_outlet_id)))
     and i.accepted_at is null and i.revoked_at is null
     and not private.invitation_still_grantable(i.id);
end $$;

create function private.on_inviter_access_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.revoke_ungrantable_invitations(old.workspace_id, old.user_id, null, 'inviter_access_changed');
  return null;
end $$;

create trigger revoke_invitations_on_membership_change
  after update of role_id, all_outlets, status or delete on public.memberships
  for each row execute function private.on_inviter_access_change();

create trigger revoke_invitations_on_outlet_access_change
  after update of role_id or delete on public.outlet_memberships
  for each row execute function private.on_inviter_access_change();

create function private.on_outlet_deactivated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.active and not new.active then
    perform private.revoke_ungrantable_invitations(new.workspace_id, null, new.id, 'outlet_deactivated');
  end if;
  return null;
end $$;

create trigger revoke_invitations_on_outlet_deactivated
  after update of active on public.outlets
  for each row execute function private.on_outlet_deactivated();

-- Record why an invitation was revoked by the existing RPCs.
create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ws uuid;
begin
  perform private.require_uid();
  select workspace_id into v_ws from public.invitations where id = p_invitation_id;
  if v_ws is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  perform private.require_ws_perm(v_ws, 'member.manage');
  update public.invitations set revoked_at = now(), revoked_reason = 'manual'
   where id = p_invitation_id and accepted_at is null and revoked_at is null;
end $$;

create function private.mark_replaced_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- create_invitation revokes the previous open invitation for the same email
  -- just before inserting the new one; label that revocation.
  if new.revoked_at is not null and old.revoked_at is null and new.revoked_reason is null then
    new.revoked_reason := 'replaced';
  end if;
  return new;
end $$;

create trigger invitations_revoked_reason
  before update of revoked_at on public.invitations
  for each row execute function private.mark_replaced_invitations();

-- Preview: an invitation that can no longer be honoured shows as 'invalid'.
create or replace function public.get_invitation(p_token text)
returns table (workspace_name text, role_name text, email text, invited_by_name text,
               expires_at timestamptz, state text)
language sql stable security definer set search_path = '' as $$
  select w.name, r.name, i.email, coalesce(nullif(p.full_name, ''), 'A workspace member'), i.expires_at,
         case when i.accepted_at is not null then 'accepted'
              when i.revoked_at is not null then 'revoked'
              when i.expires_at <= now() then 'expired'
              when w.status <> 'active' or not private.invitation_still_grantable(i.id) then 'invalid'
              else 'open' end
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  join public.roles r on r.id = i.role_id
  left join public.profiles p on p.id = i.invited_by
  where auth.uid() is not null
    and i.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_uid();
  v_inv   public.invitations;
  v_user  record;
  v_grant jsonb;
  v_limit int;
begin
  select * into v_inv from public.invitations
   where token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
   for update;
  if v_inv.id is null or v_inv.revoked_at is not null or v_inv.accepted_at is not null
     or v_inv.expires_at <= now() then
    raise exception 'This invitation is invalid, expired or already used' using errcode = 'P0001';
  end if;
  -- M1
  if not exists (select 1 from public.workspaces where id = v_inv.workspace_id and status = 'active') then
    raise exception 'This workspace is not active' using errcode = 'P0001';
  end if;
  -- H1
  if not private.invitation_still_grantable(v_inv.id) then
    raise exception 'This invitation is no longer valid because its sender can no longer grant this access. Ask for a new invitation.'
      using errcode = 'P0001';
  end if;
  select lower(email) as email, email_confirmed_at into v_user from auth.users where id = v_uid;
  if v_user.email_confirmed_at is null then
    raise exception 'Confirm your email address before accepting an invitation' using errcode = '42501';
  end if;
  if v_user.email <> v_inv.email then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;
  if exists (select 1 from public.memberships where workspace_id = v_inv.workspace_id and user_id = v_uid) then
    raise exception 'You are already a member of this workspace' using errcode = 'P0001';
  end if;
  v_limit := private.plan_limit(v_inv.workspace_id, 'max_members');
  if v_limit is not null and (select count(*) from public.memberships where workspace_id = v_inv.workspace_id) >= v_limit then
    raise exception 'Member limit of % reached for this plan', v_limit using errcode = 'P0001';
  end if;

  insert into public.memberships (workspace_id, user_id, role_id, all_outlets)
  values (v_inv.workspace_id, v_uid, v_inv.role_id, v_inv.all_outlets);

  -- Every granted outlet was re-checked above, so all of them exist and are active.
  for v_grant in select * from jsonb_array_elements(v_inv.outlet_grants) loop
    insert into public.outlet_memberships (workspace_id, outlet_id, user_id, role_id)
    values (v_inv.workspace_id, (v_grant ->> 'outlet_id')::uuid, v_uid, (v_grant ->> 'role_id')::uuid);
  end loop;

  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.workspace_id;
end $$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_member(uuid),
  private.has_ws_perm(uuid, text),
  private.has_outlet_perm(uuid, uuid, text),
  private.shares_workspace(uuid)
to authenticated;
grant select (revoked_reason) on public.invitations to authenticated;
