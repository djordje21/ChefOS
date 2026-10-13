"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Field, Input, Select } from "@/components/ui";
import { createInvitation } from "../../../actions";

type Role = { id: string; name: string };
type Outlet = { id: string; name: string };

export function InviteForm({ workspaceId, siteUrl, roles, outletRoles, outlets, canGrantAll }: {
  workspaceId: string; siteUrl: string; roles: Role[]; outletRoles: Role[]; outlets: Outlet[]; canGrantAll: boolean;
}) {
  const [allOutlets, setAllOutlets] = useState(canGrantAll);
  return (
    <ActionForm action={createInvitation} showOk={false}>
      {(state) => (
        <>
          {state?.token && (
            <Alert tone="success">
              <p className="font-medium">{state.ok}</p>
              <p className="mt-1">Send this link to the person. It is shown only once and works only for their email address.</p>
              <input readOnly className="mt-2 w-full rounded border border-line bg-surface px-2 py-1 font-mono text-xs" value={`${siteUrl}/invite/${state.token}`} onFocus={(e) => e.currentTarget.select()} />
            </Alert>
          )}
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Field label="Email"><Input name="email" type="email" required /></Field>
          <Field label="Workspace role" hint="You can only grant roles whose permissions you hold yourself.">
            <Select name="roleId" required defaultValue={roles.at(-1)?.id}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allOutlets" checked={allOutlets} disabled={!canGrantAll} onChange={(e) => setAllOutlets(e.target.checked)} />
            Access to all outlets
          </label>
          {!allOutlets && (
            <fieldset className="space-y-2 rounded-md border border-line p-3">
              <legend className="px-1 text-xs text-muted">Outlet access</legend>
              {outlets.length === 0 && <p className="text-sm text-muted">No outlets yet.</p>}
              {outlets.map((o) => (
                <label key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{o.name}</span>
                  <Select name={`grant:${o.id}`} defaultValue="" className="mt-0 w-44">
                    <option value="">No access</option>
                    {outletRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </Select>
                </label>
              ))}
            </fieldset>
          )}
          <Field label="Valid for (days)"><Input name="validDays" type="number" min={1} max={30} defaultValue={7} /></Field>
          <SubmitButton className="w-full">Create invitation</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
