import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireWorkspace } from "@/lib/auth";
import { OUTLET_TYPE_LABELS } from "@/lib/options";
import { OUTLET_TYPES } from "@/lib/validation";
import { createOutlet, updateOutlet } from "../../../actions";

export const metadata = { title: "Outlets" };

type Outlet = { id: string; name: string; type: string; active: boolean };

function TypeSelect({ defaultValue, disabled }: { defaultValue?: string; disabled?: boolean }) {
  return (
    <Select name="type" defaultValue={defaultValue ?? "restaurant"} disabled={disabled}>
      {OUTLET_TYPES.map((t) => <option key={t} value={t}>{OUTLET_TYPE_LABELS[t]}</option>)}
    </Select>
  );
}

export default async function OutletsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const { supabase, workspace, permissions, can } = await requireWorkspace(workspaceId);
  const { data } = await supabase.from("outlets").select("id, name, type, active").eq("workspace_id", workspace.id).order("name");
  const outlets = (data ?? []) as Outlet[];
  const manage = can("outlet.manage");

  return (
    <>
      <PageHeader
        title="Outlets"
        description="Restaurants, bars, breakfast, banqueting, room service… Ingredients and suppliers are shared; menus, selling prices and reports belong to an outlet."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {outlets.length === 0 && (
            <EmptyState title="No outlets visible">
              {manage ? "Create the first outlet of this workspace." : "You have not been given access to any outlet yet."}
            </EmptyState>
          )}
          {outlets.map((o) => (
            <Card key={o.id} className="p-4 sm:p-4">
              <ActionForm action={updateOutlet} className="grid items-end gap-3 sm:grid-cols-[1fr_200px_auto_auto]">
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <input type="hidden" name="outletId" value={o.id} />
                <Field label="Name"><Input name="name" defaultValue={o.name} disabled={!manage} required /></Field>
                <Field label="Type"><TypeSelect defaultValue={o.type} disabled={!manage} /></Field>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={o.active} disabled={!manage} /> Active
                </label>
                <div className="flex items-center gap-2 pb-0.5">
                  {manage ? <SubmitButton variant="secondary">Save</SubmitButton> : (
                    <Badge tone="accent">{(permissions.outlets[o.id] ?? []).includes("recipe.edit") ? "Can edit" : "View"}</Badge>
                  )}
                </div>
              </ActionForm>
            </Card>
          ))}
        </div>
        {manage && (
          <Card>
            <h2 className="mb-4 font-semibold">New outlet</h2>
            <ActionForm action={createOutlet}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <Field label="Name"><Input name="name" required maxLength={120} placeholder="e.g. Lounge Bar" /></Field>
              <Field label="Type"><TypeSelect /></Field>
              <SubmitButton className="w-full">Create outlet</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
