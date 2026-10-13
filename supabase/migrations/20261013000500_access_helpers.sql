-- ChefOS Phase 1 · 005 · permission helpers used by RLS policies and RPCs
--
-- Resolution rules:
--   workspace-level permission  = granted by the member's WORKSPACE role only.
--   outlet-level permission on X = (workspace role grants it AND member has all_outlets)
--                                  OR the member's OUTLET role on X grants it.
-- Only active members of active workspaces have any permission.

create function private.is_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and w.status = 'active'
  )
$$;

create function private.has_ws_perm(p_workspace_id uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and w.status = 'active'
      and rp.permission_code = p_perm
  )
$$;

create function private.has_outlet_perm(p_workspace_id uuid, p_outlet_id uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and w.status = 'active'
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

-- Permission codes of a role.
create function private.role_perms(p_role_id uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(permission_code order by permission_code), '{}')
  from public.role_permissions where role_id = p_role_id
$$;

-- Permission codes of the caller's workspace role (empty if not an active member).
create function private.my_role_perms(p_workspace_id uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.role_perms(m.role_id)
    from public.memberships m
    join public.workspaces w on w.id = m.workspace_id
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
      and m.status = 'active' and w.status = 'active'), '{}')
$$;

create function private.is_owner_role(p_role_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.roles where id = p_role_id and key = 'owner')
$$;

create function private.active_owner_count(p_workspace_id uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.memberships m join public.roles r on r.id = m.role_id
  where m.workspace_id = p_workspace_id and m.status = 'active' and r.key = 'owner'
$$;

create function private.plan_limit(p_workspace_id uuid, p_key text) returns int
language sql stable security definer set search_path = '' as $$
  select (p.limits ->> p_key)::int
  from public.workspaces w join public.plans p on p.id = w.plan_id
  where w.id = p_workspace_id
$$;

-- Users share a workspace (used to let members see each other's profile names).
create function private.shares_workspace(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and mine.status = 'active'
      and theirs.user_id = p_user_id
  )
$$;

-- Outlet limit per plan.
create function private.enforce_outlet_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limit int := private.plan_limit(new.workspace_id, 'max_outlets');
begin
  if v_limit is not null and
     (select count(*) from public.outlets where workspace_id = new.workspace_id) >= v_limit then
    raise exception 'Outlet limit of % reached for this plan', v_limit using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger outlets_limit before insert on public.outlets
  for each row execute function private.enforce_outlet_limit();

revoke execute on all functions in schema private from public;
grant execute on function
  private.is_member(uuid),
  private.has_ws_perm(uuid, text),
  private.has_outlet_perm(uuid, uuid, text),
  private.shares_workspace(uuid)
to authenticated;
