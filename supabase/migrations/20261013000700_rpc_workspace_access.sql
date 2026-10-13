-- ChefOS Phase 1 · 007 · RPCs for workspace creation, invitations and membership management
--
-- All functions are SECURITY DEFINER with an empty search_path, so they bypass
-- RLS and must check everything themselves. The rules they enforce:
--   * the caller must be signed in (and have a confirmed email where stated);
--   * least privilege: a caller can only grant a role whose permissions are a
--     subset of their own, and can only act on members whose role is a subset
--     of their own (an Executive Chef cannot demote or remove an Owner);
--   * a caller without all-outlet access can grant only outlet access they hold;
--   * nobody changes their own role; the last active owner cannot be removed
--     or demoted;
--   * plan limits are respected.

create function private.require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

create function private.require_ws_perm(p_workspace_id uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_ws_perm(p_workspace_id, p_perm) then
    raise exception 'Permission denied: % required', p_perm using errcode = '42501';
  end if;
end $$;

-- Caller may grant workspace role p_role_id in p_workspace_id.
create function private.assert_can_grant_ws_role(p_workspace_id uuid, p_role_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.roles where id = p_role_id and workspace_id = p_workspace_id and level = 'workspace') then
    raise exception 'Unknown workspace role' using errcode = '22023';
  end if;
  if not (private.role_perms(p_role_id) <@ private.my_role_perms(p_workspace_id)) then
    raise exception 'You cannot grant a role with permissions you do not have' using errcode = '42501';
  end if;
end $$;

-- Caller may grant outlet role p_role_id on outlet p_outlet_id: the caller must
-- hold every permission of that role on that outlet.
create function private.assert_can_grant_outlet_role(p_workspace_id uuid, p_outlet_id uuid, p_role_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_perm text;
begin
  if not exists (select 1 from public.outlets where id = p_outlet_id and workspace_id = p_workspace_id) then
    raise exception 'Unknown outlet' using errcode = '22023';
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

create function private.caller_has_all_outlets(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select all_outlets from public.memberships
                   where workspace_id = p_workspace_id and user_id = auth.uid() and status = 'active'), false)
$$;

-- Caller may act on target member p_user_id.
create function private.assert_can_manage_member(p_workspace_id uuid, p_user_id uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role_id uuid;
begin
  perform private.require_ws_perm(p_workspace_id, 'member.manage');
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own membership' using errcode = '42501';
  end if;
  select role_id into v_role_id from public.memberships
   where workspace_id = p_workspace_id and user_id = p_user_id;
  if v_role_id is null then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if not (private.role_perms(v_role_id) <@ private.my_role_perms(p_workspace_id)) then
    raise exception 'You cannot manage a member with permissions you do not have' using errcode = '42501';
  end if;
  return v_role_id;
end $$;

-- Validates the outlet_grants payload: [{"outlet_id": uuid, "role_id": uuid}, ...]
create function private.assert_outlet_grants(p_workspace_id uuid, p_grants jsonb) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_grant jsonb;
begin
  if jsonb_typeof(p_grants) <> 'array' then
    raise exception 'outlet_grants must be an array' using errcode = '22023';
  end if;
  for v_grant in select * from jsonb_array_elements(p_grants) loop
    perform private.assert_can_grant_outlet_role(
      p_workspace_id, (v_grant ->> 'outlet_id')::uuid, (v_grant ->> 'role_id')::uuid);
  end loop;
  if (select count(distinct g ->> 'outlet_id') from jsonb_array_elements(p_grants) g)
     <> jsonb_array_length(p_grants) then
    raise exception 'Duplicate outlet in outlet_grants' using errcode = '22023';
  end if;
end $$;

-- Seeds the editable system roles of a new workspace.
create function private.seed_workspace_roles(p_workspace_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_role  uuid;
begin
  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'owner', 'Owner', 'workspace', true, 10) returning id into v_owner;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_owner, code from public.sys_permissions;

  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'executive_chef', 'Executive Chef', 'workspace', true, 20) returning id into v_role;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_role, code from public.sys_permissions
  where code not in ('member.manage', 'workspace.settings');

  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'editor', 'Chef / Editor', 'workspace', true, 30) returning id into v_role;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_role, code from public.sys_permissions
  where code in ('ingredient.view', 'ingredient.edit', 'supplier.view', 'supplier.edit',
                 'price.view', 'price.edit', 'recipe.library.edit', 'export.run',
                 'outlet.view', 'recipe.edit', 'menu.edit', 'menu.price.edit', 'report.outlet');

  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'viewer', 'Viewer', 'workspace', true, 40) returning id into v_role;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_role, code from public.sys_permissions
  where code in ('ingredient.view', 'supplier.view', 'outlet.view', 'report.outlet');

  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'outlet_chef', 'Outlet Chef', 'outlet', true, 50) returning id into v_role;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_role, code from public.sys_permissions
  where code in ('outlet.view', 'recipe.edit', 'recipe.approve', 'menu.edit',
                 'menu.price.edit', 'menu.approve', 'report.outlet');

  insert into public.roles (workspace_id, key, name, level, is_system, sort_order)
  values (p_workspace_id, 'outlet_viewer', 'Outlet Viewer', 'outlet', true, 60) returning id into v_role;
  insert into public.role_permissions (workspace_id, role_id, permission_code)
  select p_workspace_id, v_role, code from public.sys_permissions
  where code in ('outlet.view', 'report.outlet');

  return v_owner;
end $$;

create function private.validate_workspace() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone %', new.timezone using errcode = '22023';
  end if;
  new.name := btrim(new.name);
  return new;
end $$;

create trigger workspaces_validate before insert or update on public.workspaces
  for each row execute function private.validate_workspace();

-- ── Public RPCs ──────────────────────────────────────────────────────────────

create function public.create_workspace(
  p_name text, p_base_currency text, p_locale text default 'en', p_timezone text default 'UTC')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_uid();
  v_plan  public.plans;
  v_owned int;
  v_ws    uuid;
  v_owner uuid;
begin
  if not exists (select 1 from auth.users where id = v_uid and email_confirmed_at is not null) then
    raise exception 'Confirm your email address before creating a workspace' using errcode = '42501';
  end if;
  select * into v_plan from public.plans where is_default;
  select count(*) into v_owned from public.workspaces where created_by = v_uid;
  if v_owned >= (v_plan.limits ->> 'max_owned_workspaces')::int then
    raise exception 'Workspace limit of % reached for this plan', v_plan.limits ->> 'max_owned_workspaces'
      using errcode = 'P0001';
  end if;

  insert into public.workspaces (name, base_currency, locale, timezone, plan_id, created_by)
  values (p_name, upper(btrim(p_base_currency)), p_locale, p_timezone, v_plan.id, v_uid)
  returning id into v_ws;

  v_owner := private.seed_workspace_roles(v_ws);
  insert into public.memberships (workspace_id, user_id, role_id, all_outlets)
  values (v_ws, v_uid, v_owner, true);
  return v_ws;
end $$;

create function public.my_workspaces()
returns table (workspace_id uuid, name text, kind text, base_currency text,
               role_name text, role_key text, all_outlets boolean)
language sql stable security definer set search_path = '' as $$
  select w.id, w.name, w.kind, w.base_currency, r.name, r.key, m.all_outlets
  from public.memberships m
  join public.workspaces w on w.id = m.workspace_id
  join public.roles r on r.id = m.role_id
  where m.user_id = auth.uid() and m.status = 'active' and w.status = 'active'
  order by w.name
$$;

-- For UI gating only. The database enforces permissions independently.
create function public.my_permissions(p_workspace_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not private.is_member(p_workspace_id) then null else jsonb_build_object(
    'workspace', to_jsonb(private.my_role_perms(p_workspace_id)),
    'all_outlets', private.caller_has_all_outlets(p_workspace_id),
    'outlets', coalesce((
      select jsonb_object_agg(o.id, (
        select coalesce(jsonb_agg(sp.code order by sp.code), '[]'::jsonb)
        from public.sys_permissions sp
        where sp.level = 'outlet' and private.has_outlet_perm(p_workspace_id, o.id, sp.code)))
      from public.outlets o
      where o.workspace_id = p_workspace_id
        and private.has_outlet_perm(p_workspace_id, o.id, 'outlet.view')), '{}'::jsonb))
  end
$$;

create function public.list_members(p_workspace_id uuid)
returns table (user_id uuid, full_name text, email text, role_id uuid, role_name text, role_key text,
               all_outlets boolean, status text, joined_at timestamptz, outlet_access jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_manage boolean;
begin
  if not private.is_member(p_workspace_id) then
    raise exception 'Permission denied' using errcode = '42501';
  end if;
  v_manage := private.has_ws_perm(p_workspace_id, 'member.manage');
  return query
  select m.user_id, p.full_name,
         case when v_manage or m.user_id = auth.uid() then u.email::text end,
         m.role_id, r.name, r.key, m.all_outlets, m.status, m.created_at,
         case when v_manage or m.user_id = auth.uid() then coalesce((
           select jsonb_agg(jsonb_build_object('outlet_id', om.outlet_id, 'role_id', om.role_id) order by om.created_at)
           from public.outlet_memberships om
           where om.workspace_id = m.workspace_id and om.user_id = m.user_id), '[]'::jsonb) end
  from public.memberships m
  join public.roles r on r.id = m.role_id
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.workspace_id = p_workspace_id
  order by r.sort_order, p.full_name;
end $$;

create function public.create_invitation(
  p_workspace_id uuid, p_email text, p_role_id uuid,
  p_all_outlets boolean default true, p_outlet_grants jsonb default '[]'::jsonb,
  p_valid_days int default 7)
returns table (invitation_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := private.require_uid();
  v_email text := lower(btrim(p_email));
  v_token text;
  v_id    uuid;
  v_limit int;
begin
  perform private.require_ws_perm(p_workspace_id, 'member.manage');
  perform private.assert_can_grant_ws_role(p_workspace_id, p_role_id);
  if p_all_outlets and not private.caller_has_all_outlets(p_workspace_id) then
    raise exception 'You cannot grant access to all outlets' using errcode = '42501';
  end if;
  perform private.assert_outlet_grants(p_workspace_id, coalesce(p_outlet_grants, '[]'::jsonb));
  if p_valid_days not between 1 and 30 then
    raise exception 'Invitation validity must be 1–30 days' using errcode = '22023';
  end if;
  if exists (select 1 from public.memberships m join auth.users u on u.id = m.user_id
             where m.workspace_id = p_workspace_id and lower(u.email) = v_email) then
    raise exception 'This person is already a member' using errcode = 'P0001';
  end if;
  v_limit := private.plan_limit(p_workspace_id, 'max_members');
  if v_limit is not null and (select count(*) from public.memberships where workspace_id = p_workspace_id) >= v_limit then
    raise exception 'Member limit of % reached for this plan', v_limit using errcode = 'P0001';
  end if;

  -- 244 bits of randomness from two v4 UUIDs; only the SHA-256 hash is stored.
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  -- Re-inviting the same email replaces the previous open invitation.
  update public.invitations set revoked_at = now()
   where workspace_id = p_workspace_id and email = v_email and accepted_at is null and revoked_at is null;

  insert into public.invitations (workspace_id, email, role_id, all_outlets, outlet_grants,
                                  token_hash, invited_by, expires_at)
  values (p_workspace_id, v_email, p_role_id, p_all_outlets, coalesce(p_outlet_grants, '[]'::jsonb),
          sha256(convert_to(v_token, 'UTF8')), v_uid, now() + make_interval(days => p_valid_days))
  returning id into v_id;

  return query select v_id, v_token;
end $$;

create function public.revoke_invitation(p_invitation_id uuid)
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
  update public.invitations set revoked_at = now()
   where id = p_invitation_id and accepted_at is null and revoked_at is null;
end $$;

-- Preview for the accept page. Returns nothing for unknown tokens.
create function public.get_invitation(p_token text)
returns table (workspace_name text, role_name text, email text, invited_by_name text,
               expires_at timestamptz, state text)
language sql stable security definer set search_path = '' as $$
  select w.name, r.name, i.email, coalesce(nullif(p.full_name, ''), 'A workspace member'), i.expires_at,
         case when i.accepted_at is not null then 'accepted'
              when i.revoked_at is not null then 'revoked'
              when i.expires_at <= now() then 'expired'
              else 'open' end
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  join public.roles r on r.id = i.role_id
  left join public.profiles p on p.id = i.invited_by
  where auth.uid() is not null
    and i.token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
$$;

create function public.accept_invitation(p_token text)
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

  -- Outlet grants were validated at invitation time; outlets or roles deleted
  -- since then are skipped rather than failing the whole acceptance.
  for v_grant in select * from jsonb_array_elements(v_inv.outlet_grants) loop
    insert into public.outlet_memberships (workspace_id, outlet_id, user_id, role_id)
    select v_inv.workspace_id, o.id, v_uid, r.id
    from public.outlets o, public.roles r
    where o.workspace_id = v_inv.workspace_id and o.id = (v_grant ->> 'outlet_id')::uuid
      and r.workspace_id = v_inv.workspace_id and r.id = (v_grant ->> 'role_id')::uuid and r.level = 'outlet';
  end loop;

  update public.invitations set accepted_at = now(), accepted_by = v_uid where id = v_inv.id;
  return v_inv.workspace_id;
end $$;

create function public.update_member(
  p_workspace_id uuid, p_user_id uuid, p_role_id uuid, p_all_outlets boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current_role uuid;
begin
  perform private.require_uid();
  v_current_role := private.assert_can_manage_member(p_workspace_id, p_user_id);
  perform private.assert_can_grant_ws_role(p_workspace_id, p_role_id);
  if p_all_outlets and not private.caller_has_all_outlets(p_workspace_id) then
    raise exception 'You cannot grant access to all outlets' using errcode = '42501';
  end if;
  if private.is_owner_role(v_current_role) and not private.is_owner_role(p_role_id)
     and private.active_owner_count(p_workspace_id) <= 1 then
    raise exception 'A workspace must keep at least one owner' using errcode = 'P0001';
  end if;
  update public.memberships set role_id = p_role_id, all_outlets = p_all_outlets
   where workspace_id = p_workspace_id and user_id = p_user_id;
end $$;

-- Grants (p_role_id not null) or removes (p_role_id null) a member's access to one outlet.
create function public.set_outlet_access(
  p_workspace_id uuid, p_user_id uuid, p_outlet_id uuid, p_role_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_uid();
  perform private.assert_can_manage_member(p_workspace_id, p_user_id);
  if p_role_id is null then
    if not private.caller_has_all_outlets(p_workspace_id)
       and not private.has_outlet_perm(p_workspace_id, p_outlet_id, 'outlet.view') then
      raise exception 'You cannot change access to this outlet' using errcode = '42501';
    end if;
    delete from public.outlet_memberships
     where workspace_id = p_workspace_id and user_id = p_user_id and outlet_id = p_outlet_id;
  else
    perform private.assert_can_grant_outlet_role(p_workspace_id, p_outlet_id, p_role_id);
    insert into public.outlet_memberships (workspace_id, outlet_id, user_id, role_id)
    values (p_workspace_id, p_outlet_id, p_user_id, p_role_id)
    on conflict (outlet_id, user_id) do update set role_id = excluded.role_id;
  end if;
end $$;

-- Removes a member, or lets a member leave (p_user_id = caller).
create function public.remove_member(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := private.require_uid();
  v_role uuid;
begin
  if p_user_id = v_uid then
    select role_id into v_role from public.memberships where workspace_id = p_workspace_id and user_id = v_uid;
    if v_role is null then
      raise exception 'Member not found' using errcode = 'P0002';
    end if;
  else
    v_role := private.assert_can_manage_member(p_workspace_id, p_user_id);
  end if;
  if private.is_owner_role(v_role) and private.active_owner_count(p_workspace_id) <= 1 then
    raise exception 'A workspace must keep at least one owner' using errcode = 'P0001';
  end if;
  delete from public.memberships where workspace_id = p_workspace_id and user_id = p_user_id;
end $$;
