import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, PageHeader, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { removeMember, revokeInvitation, setOutletAccess, updateMember } from "../../../actions";
import { InviteForm } from "./invite-form";

export const metadata = { title: "Team" };

type Member = {
  user_id: string; full_name: string | null; email: string | null; role_id: string; role_name: string; role_key: string | null;
  all_outlets: boolean; status: string; outlet_access: { outlet_id: string; role_id: string }[] | null;
};
type Role = { id: string; name: string; level: "workspace" | "outlet"; sort_order: number };
type Invitation = { id: string; email: string; role_id: string; all_outlets: boolean; expires_at: string };

export default async function MembersPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { supabase, user, workspace, permissions, can } = await requireWorkspace(workspaceId);
  const manage = can("member.manage");

  const [membersRes, rolesRes, outletsRes, invitesRes, rolePermsRes] = await Promise.all([
    supabase.rpc("list_members", { p_workspace_id: workspace.id }),
    supabase.from("roles").select("id, name, level, sort_order").eq("workspace_id", workspace.id).order("sort_order"),
    supabase.from("outlets").select("id, name").eq("workspace_id", workspace.id).order("name"),
    manage
      ? supabase.from("invitations").select("id, email, role_id, all_outlets, expires_at").eq("workspace_id", workspace.id)
          .is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("role_permissions").select("role_id, permission_code").eq("workspace_id", workspace.id),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const roles = (rolesRes.data ?? []) as Role[];
  const outlets = (outletsRes.data ?? []) as { id: string; name: string }[];
  const invites = (invitesRes.data ?? []) as Invitation[];
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const outletName = new Map(outlets.map((o) => [o.id, o.name]));

  // UI hint only: offer roles whose permissions the caller holds (the database enforces the same rule).
  const mine = new Set(permissions.workspace);
  const permsByRole = new Map<string, string[]>();
  for (const rp of (rolePermsRes.data ?? []) as { role_id: string; permission_code: string }[]) {
    permsByRole.set(rp.role_id, [...(permsByRole.get(rp.role_id) ?? []), rp.permission_code]);
  }
  const grantable = (r: Role) => (permsByRole.get(r.id) ?? []).every((p) => mine.has(p));
  const wsRoles = roles.filter((r) => r.level === "workspace");
  const outletRoles = roles.filter((r) => r.level === "outlet");

  return (
    <>
      <PageHeader
        title="Team"
        description="Workspace roles control shared data (ingredients, suppliers, prices, settings). Outlet roles control a single outlet's recipes, menus and selling prices."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {members.map((m) => {
            const isMe = m.user_id === user.id;
            const editable = manage && !isMe && wsRoles.some((r) => r.id === m.role_id && grantable(r));
            return (
              <Card key={m.user_id} className="p-4 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.full_name || "Unnamed member"} {isMe && <Badge>You</Badge>}</p>
                    {m.email && <p className="text-sm text-muted">{m.email}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge tone="accent">{m.role_name}</Badge>
                    <Badge>{m.all_outlets ? "All outlets" : "Selected outlets"}</Badge>
                    {m.status !== "active" && <Badge tone="warn">{m.status}</Badge>}
                  </div>
                </div>

                {!m.all_outlets && m.outlet_access && m.outlet_access.length > 0 && (
                  <p className="mt-2 text-sm text-muted">
                    {m.outlet_access.map((a) => `${outletName.get(a.outlet_id) ?? "Outlet"}: ${roleName.get(a.role_id) ?? "—"}`).join(" · ")}
                  </p>
                )}

                {editable && (
                  <details className="mt-3 border-t border-line pt-3">
                    <summary className="cursor-pointer text-sm text-accent">Manage access</summary>
                    <ActionForm action={updateMember} className="mt-3 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <input type="hidden" name="userId" value={m.user_id} />
                      <label className="text-sm">Workspace role
                        <Select name="roleId" defaultValue={m.role_id} className="w-48">
                          {wsRoles.filter(grantable).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </Select>
                      </label>
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input type="checkbox" name="allOutlets" defaultChecked={m.all_outlets} disabled={!permissions.all_outlets} /> All outlets
                      </label>
                      <SubmitButton variant="secondary">Save role</SubmitButton>
                    </ActionForm>

                    {!m.all_outlets && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Outlet access</p>
                        {outlets.map((o) => {
                          const current = m.outlet_access?.find((a) => a.outlet_id === o.id)?.role_id ?? "";
                          return (
                            <ActionForm key={o.id} action={setOutletAccess} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="workspaceId" value={workspace.id} />
                              <input type="hidden" name="userId" value={m.user_id} />
                              <input type="hidden" name="outletId" value={o.id} />
                              <span className="w-40 text-sm">{o.name}</span>
                              <Select name="roleId" defaultValue={current} className="mt-0 w-44">
                                <option value="">No access</option>
                                {outletRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </Select>
                              <SubmitButton variant="secondary">Apply</SubmitButton>
                            </ActionForm>
                          );
                        })}
                      </div>
                    )}

                    <ActionForm action={removeMember} className="mt-4">
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <input type="hidden" name="userId" value={m.user_id} />
                      <SubmitButton variant="danger">Remove from workspace</SubmitButton>
                    </ActionForm>
                  </details>
                )}

                {isMe && m.role_key !== "owner" && (
                  <ActionForm action={removeMember} className="mt-3">
                    <input type="hidden" name="workspaceId" value={workspace.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <SubmitButton variant="danger">Leave workspace</SubmitButton>
                  </ActionForm>
                )}
              </Card>
            );
          })}
        </div>

        {manage && (
          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 font-semibold">Invite someone</h2>
              <InviteForm
                workspaceId={workspace.id}
                siteUrl={publicEnv().siteUrl}
                roles={wsRoles.filter(grantable)}
                outletRoles={outletRoles}
                outlets={outlets}
                canGrantAll={permissions.all_outlets}
              />
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Open invitations</h2>
              {invites.length === 0 && <p className="text-sm text-muted">None.</p>}
              <ul className="space-y-3">
                {invites.map((i) => (
                  <li key={i.id} className="text-sm">
                    <p className="font-medium">{i.email}</p>
                    <p className="text-muted">{roleName.get(i.role_id)} · expires {new Date(i.expires_at).toLocaleDateString("en-GB")}</p>
                    <ActionForm action={revokeInvitation} className="mt-1">
                      <input type="hidden" name="workspaceId" value={workspace.id} />
                      <input type="hidden" name="invitationId" value={i.id} />
                      <SubmitButton variant="secondary">Revoke</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
