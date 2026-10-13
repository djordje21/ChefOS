import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";

export const metadata = { title: "Audit log" };

type Entry = { id: number; actor_user_id: string | null; entity: string; entity_id: string | null; action: string; at: string; after: Record<string, unknown> | null; before: Record<string, unknown> | null };

const ENTITY_LABELS: Record<string, string> = {
  workspaces: "Workspace", roles: "Role", role_permissions: "Role permission", memberships: "Membership",
  outlets: "Outlet", outlet_memberships: "Outlet access", invitations: "Invitation",
};

function summary(e: Entry): string {
  const row = e.after ?? e.before ?? {};
  const name = (row.name ?? row.email ?? row.permission_code ?? "") as string;
  return name ? String(name) : "";
}

export default async function AuditPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { supabase, workspace, can } = await requireWorkspace(workspaceId);
  if (!can("audit.view")) notFound();

  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_user_id, entity, entity_id, action, at, after, before")
    .eq("workspace_id", workspace.id)
    .neq("entity", "role_permissions")
    .order("at", { ascending: false })
    .limit(200);
  const entries = (data ?? []) as Entry[];
  const actorIds = [...new Set(entries.map((e) => e.actor_user_id).filter((x): x is string => !!x))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const actor = new Map(((profiles ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));

  return (
    <>
      <PageHeader title="Audit log" description="Every change to access and workspace structure, newest first. Entries cannot be edited or deleted." />
      {entries.length === 0 ? <EmptyState title="No entries yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">What</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{new Date(e.at).toLocaleString("en-GB", { timeZone: workspace.timezone })}</td>
                  <td className="px-3 py-2">{e.actor_user_id ? actor.get(e.actor_user_id) || "Member" : "System"}</td>
                  <td className="px-3 py-2">{ENTITY_LABELS[e.entity] ?? e.entity}</td>
                  <td className="px-3 py-2">{e.action}</td>
                  <td className="px-3 py-2 text-muted">{summary(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
