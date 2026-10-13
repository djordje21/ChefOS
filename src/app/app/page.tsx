import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { AppHeader } from "@/components/app-header";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { COMMON_CURRENCIES, LOCALES, timeZones } from "@/lib/options";
import { createWorkspace } from "./actions";

export const metadata = { title: "Workspaces" };

type WorkspaceRow = { workspace_id: string; name: string; kind: string; base_currency: string; role_name: string };

export default async function WorkspacesPage() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("my_workspaces");
  const workspaces = (data ?? []) as WorkspaceRow[];

  return (
    <>
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader title="Your workspaces" description="Each workspace is a separate business with its own data, settings and team." />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {error && <p className="text-sm text-danger">Could not load workspaces.</p>}
            {workspaces.length === 0 ? (
              <EmptyState title="No workspaces yet">
                Create your own workspace, or open the invitation link a colleague sent you.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {workspaces.map((w) => (
                  <li key={w.workspace_id}>
                    <Link href={`/app/w/${w.workspace_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas">
                      <span className="font-medium">{w.name}</span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        {w.kind === "demo" && <Badge tone="warn">Demo</Badge>}
                        <Badge>{w.base_currency}</Badge>
                        {w.role_name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Card>
            <h2 className="mb-4 font-semibold">New workspace</h2>
            <ActionForm action={createWorkspace}>
              <Field label="Business name"><Input name="name" required maxLength={120} placeholder="e.g. Hotel Restaurant" /></Field>
              <Field label="Base currency" hint="Used for all costing in this workspace. It cannot be changed later.">
                <Input name="baseCurrency" required list="currencies" maxLength={3} defaultValue="EUR" className="uppercase" />
                <datalist id="currencies">{COMMON_CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Language">
                  <Select name="locale" defaultValue="en">{LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select>
                </Field>
                <Field label="Time zone">
                  <Select name="timezone" defaultValue="Europe/Belgrade">{timeZones().map((z) => <option key={z}>{z}</option>)}</Select>
                </Field>
              </div>
              <SubmitButton className="w-full">Create workspace</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </main>
    </>
  );
}
