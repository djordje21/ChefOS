#!/usr/bin/env bash
# Proves the security tests are not vacuous: each sabotage below weakens one
# protection in a throwaway extra migration; the DB test suite MUST fail for
# every one of them. Requires TEST_DATABASE_URL (local PostgreSQL only).
set -uo pipefail
cd "$(dirname "$0")/.."
M=supabase/migrations/29991231235959_sabotage.sql
trap 'rm -f "$M"' EXIT
SABOTAGES=(
  "alter table public.outlets disable row level security;"
  "drop policy outlets_read on public.outlets; create policy outlets_read on public.outlets for select to authenticated using (true);"
  "create or replace function private.assert_can_grant_ws_role(p_workspace_id uuid, p_role_id uuid) returns void language plpgsql stable security definer set search_path = '' as \$\$ begin if not exists (select 1 from public.roles where id = p_role_id and workspace_id = p_workspace_id and level = 'workspace') then raise exception 'Unknown workspace role' using errcode = '22023'; end if; end \$\$;"
  "grant select on public.invitations to authenticated;"
  "create or replace function private.has_outlet_perm(p_workspace_id uuid, p_outlet_id uuid, p_perm text) returns boolean language sql stable security definer set search_path = '' as \$\$ select private.has_ws_perm(p_workspace_id, p_perm) \$\$;"
  "create or replace function private.active_owner_count(p_workspace_id uuid) returns int language sql stable security definer set search_path = '' as \$\$ select 99 \$\$;"
  "grant select on public.workspaces to anon;"
  "alter table public.outlet_memberships drop constraint outlet_memberships_workspace_id_outlet_id_fkey; alter table public.outlet_memberships add foreign key (outlet_id) references public.outlets (id);"
)
missed=0
for i in "${!SABOTAGES[@]}"; do
  echo "${SABOTAGES[$i]}" > "$M"
  if npx vitest run --project db >/dev/null 2>&1; then
    echo "NOT DETECTED  sabotage $((i + 1)): ${SABOTAGES[$i]:0:90}"; missed=1
  else
    echo "detected      sabotage $((i + 1)): ${SABOTAGES[$i]:0:90}"
  fi
done
exit $missed
