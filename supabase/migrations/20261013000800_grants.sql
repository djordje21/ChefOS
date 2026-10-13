-- ChefOS Phase 1 · 008 · explicit privileges (deny by default)
-- anon gets nothing. authenticated gets only what is listed; RLS narrows rows.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.sys_permissions, public.plans to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, ui_language) on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant update (name, locale, timezone) on public.workspaces to authenticated;
grant select on public.roles, public.role_permissions, public.memberships to authenticated;
grant select, insert on public.outlets to authenticated;
grant update (name, type, active) on public.outlets to authenticated;
grant select on public.outlet_memberships to authenticated;
grant select (id, workspace_id, email, role_id, all_outlets, outlet_grants, invited_by,
              created_at, expires_at, accepted_at, accepted_by, revoked_at)
  on public.invitations to authenticated;
grant select on public.audit_log to authenticated;

grant execute on function
  public.create_workspace(text, text, text, text),
  public.my_workspaces(),
  public.my_permissions(uuid),
  public.list_members(uuid),
  public.create_invitation(uuid, text, uuid, boolean, jsonb, int),
  public.revoke_invitation(uuid),
  public.get_invitation(text),
  public.accept_invitation(text),
  public.update_member(uuid, uuid, uuid, boolean),
  public.set_outlet_access(uuid, uuid, uuid, uuid),
  public.remove_member(uuid, uuid)
to authenticated;

revoke execute on all functions in schema private from public, anon;
grant execute on function
  private.is_member(uuid),
  private.has_ws_perm(uuid, text),
  private.has_outlet_perm(uuid, uuid, text),
  private.shares_workspace(uuid)
to authenticated;
