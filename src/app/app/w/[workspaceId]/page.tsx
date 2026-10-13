import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { LOCALES, timeZones } from "@/lib/options";
import { updateWorkspaceSettings } from "../../actions";

export const metadata = { title: "Overview" };

export default async function WorkspaceOverview({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { supabase, workspace, permissions, can } = await requireWorkspace(workspaceId);
  const [{ count: outletCount }, { count: memberCount }, { data: role }] = await Promise.all([
    supabase.from("outlets").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.rpc("my_workspaces").then((r) => ({
      data: ((r.data ?? []) as { workspace_id: string; role_name: string }[]).find((w) => w.workspace_id === workspace.id),
    })),
  ]);

  return (
    <>
      <PageHeader title={workspace.name} description={`Base currency ${workspace.base_currency} · ${workspace.timezone}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Your role</p><p className="mt-1 text-lg font-semibold">{role?.role_name ?? "—"}</p>
          <p className="mt-1 text-xs text-muted">{permissions.all_outlets ? "All outlets" : `${Object.keys(permissions.outlets).length} outlet(s)`}</p></Card>
        <Card><p className="text-sm text-muted">Outlets you can see</p><p className="mt-1 text-lg font-semibold">{outletCount ?? 0}</p></Card>
        <Card><p className="text-sm text-muted">Team members</p><p className="mt-1 text-lg font-semibold">{memberCount ?? 0}</p></Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-1 font-semibold">Workspace settings</h2>
        <p className="mb-4 text-sm text-muted">Costing rules, units and categories arrive with the costing phase.</p>
        <ActionForm action={updateWorkspaceSettings} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <Field label="Name"><Input name="name" defaultValue={workspace.name} disabled={!can("workspace.settings")} required /></Field>
          <Field label="Language">
            <Select name="locale" defaultValue={workspace.locale} disabled={!can("workspace.settings")}>
              {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Time zone">
            <Select name="timezone" defaultValue={workspace.timezone} disabled={!can("workspace.settings")}>
              {timeZones().map((z) => <option key={z}>{z}</option>)}
            </Select>
          </Field>
          {can("workspace.settings") && <div className="sm:col-span-3"><SubmitButton>Save settings</SubmitButton></div>}
        </ActionForm>
      </Card>
    </>
  );
}
