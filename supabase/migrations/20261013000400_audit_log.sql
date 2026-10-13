-- ChefOS Phase 1 · 004 · append-only audit log, written by triggers only

create table public.audit_log (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  actor_user_id uuid,
  entity        text not null,
  entity_id     text,
  action        text not null check (action in ('insert', 'update', 'delete')),
  before        jsonb,
  after         jsonb,
  at            timestamptz not null default now()
);
create index audit_log_workspace_at_idx on public.audit_log (workspace_id, at desc);

create function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'token_hash' end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'token_hash' end;
  v_row jsonb := coalesce(v_new, v_old);
  v_ws  uuid;
  v_id  text;
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;
  v_ws := case when tg_table_name = 'workspaces' then (v_row ->> 'id')::uuid
               else (v_row ->> 'workspace_id')::uuid end;
  v_id := coalesce(v_row ->> 'id',
                   case tg_table_name
                     when 'memberships' then v_row ->> 'user_id'
                     when 'outlet_memberships' then (v_row ->> 'outlet_id') || ':' || (v_row ->> 'user_id')
                     when 'role_permissions' then (v_row ->> 'role_id') || ':' || (v_row ->> 'permission_code')
                   end);
  -- A workspace being deleted cascades to its children; skip rows whose workspace is gone.
  if not exists (select 1 from public.workspaces w where w.id = v_ws) then
    return null;
  end if;
  insert into public.audit_log (workspace_id, actor_user_id, entity, entity_id, action, before, after)
  values (v_ws, auth.uid(), tg_table_name, v_id, lower(tg_op), v_old, v_new);
  return null;
end $$;

create trigger audit after insert or update or delete on public.workspaces
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.roles
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.role_permissions
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.memberships
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.outlets
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.outlet_memberships
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.invitations
  for each row execute function private.audit_row();
