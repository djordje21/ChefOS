-- ChefOS Phase 1 · 006 · Row-Level Security
-- Writes to memberships, outlet_memberships, invitations and roles go ONLY
-- through the security-definer RPCs in migration 007, which enforce
-- least-privilege and last-owner rules. Hence no write policies here.

alter table public.sys_permissions    enable row level security;
alter table public.plans              enable row level security;
alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.roles              enable row level security;
alter table public.role_permissions   enable row level security;
alter table public.memberships        enable row level security;
alter table public.outlets            enable row level security;
alter table public.outlet_memberships enable row level security;
alter table public.invitations        enable row level security;
alter table public.audit_log          enable row level security;

-- Reference data
create policy sys_permissions_read on public.sys_permissions for select to authenticated using (true);
create policy plans_read on public.plans for select to authenticated using (true);

-- Profiles: yourself, or people you share a workspace with. Update only yourself.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or private.shares_workspace(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: members read; workspace.settings updates. Creation via RPC only.
create policy workspaces_read on public.workspaces for select to authenticated
  using (private.is_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (private.has_ws_perm(id, 'workspace.settings'))
  with check (private.has_ws_perm(id, 'workspace.settings'));

-- Roles and their permissions: readable by members (needed to show role names).
create policy roles_read on public.roles for select to authenticated
  using (private.is_member(workspace_id));
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (private.is_member(workspace_id));

-- Memberships: a member sees the workspace's member list.
create policy memberships_read on public.memberships for select to authenticated
  using (private.is_member(workspace_id));

-- Outlets: visible with outlet.view on that outlet; managed with outlet.manage.
create policy outlets_read on public.outlets for select to authenticated
  using (private.has_outlet_perm(workspace_id, id, 'outlet.view')
         or private.has_ws_perm(workspace_id, 'outlet.manage'));
create policy outlets_insert on public.outlets for insert to authenticated
  with check (private.has_ws_perm(workspace_id, 'outlet.manage'));
create policy outlets_update on public.outlets for update to authenticated
  using (private.has_ws_perm(workspace_id, 'outlet.manage'))
  with check (private.has_ws_perm(workspace_id, 'outlet.manage'));

-- Outlet memberships: your own, or all of them with member.manage.
create policy outlet_memberships_read on public.outlet_memberships for select to authenticated
  using (private.is_member(workspace_id)
         and (user_id = auth.uid() or private.has_ws_perm(workspace_id, 'member.manage')));

-- Invitations: member.manage only. token_hash is never granted (see grants).
create policy invitations_read on public.invitations for select to authenticated
  using (private.has_ws_perm(workspace_id, 'member.manage'));

-- Audit log: audit.view only; no write policy, no write grant.
create policy audit_log_read on public.audit_log for select to authenticated
  using (private.has_ws_perm(workspace_id, 'audit.view'));
