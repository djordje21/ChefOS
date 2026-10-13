import { beforeAll, describe, expect, it } from "vitest";
import { admin, as, expectPgError, roleId, rpc } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let H: Hotel;
beforeAll(async () => {
  H = await createHotel("Audit Hotel");
});

describe("audit log", () => {
  it("records who did what for access changes", async () => {
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: H.viewer.id, p_role_id: await roleId(H.ws, "editor"), p_all_outlets: true,
    });
    const { rows } = await admin(
      `select actor_user_id, action, before->>'role_id' as before_role, after->>'role_id' as after_role
       from public.audit_log where workspace_id = $1 and entity = 'memberships' and entity_id = $2 and action = 'update'`,
      [H.ws, H.viewer.id],
    );
    expect(rows).toEqual([
      { actor_user_id: H.owner.id, action: "update", before_role: await roleId(H.ws, "viewer"), after_role: await roleId(H.ws, "editor") },
    ]);
    const entities = (await admin(`select distinct entity from public.audit_log where workspace_id = $1 order by 1`, [H.ws])).rows.map((r) => r.entity);
    expect(entities).toEqual(["invitations", "memberships", "outlet_memberships", "outlets", "role_permissions", "roles", "workspaces"]);
  });

  it("is readable only with audit.view, and never writable", async () => {
    const asOwner = await as(H.owner, `select count(*)::int as n from public.audit_log where workspace_id = $1`, [H.ws]);
    expect(asOwner.rows[0].n).toBeGreaterThan(0);
    const asExec = await as(H.execChef, `select count(*)::int as n from public.audit_log where workspace_id = $1`, [H.ws]);
    expect(asExec.rows[0].n).toBeGreaterThan(0); // Executive Chef holds audit.view by default
    for (const actor of [H.editor, H.viewer, H.loungeChef]) {
      const r = await as(actor, `select count(*)::int as n from public.audit_log where workspace_id = $1`, [H.ws]);
      expect(r.rows[0].n).toBe(0);
    }
    await expectPgError(as(H.owner, `delete from public.audit_log where workspace_id = $1`, [H.ws]), "42501");
    await expectPgError(as(H.owner, `update public.audit_log set action = 'insert' where workspace_id = $1`, [H.ws]), "42501");
    await expectPgError(
      as(H.owner, `insert into public.audit_log (workspace_id, entity, action) values ($1, 'x', 'insert')`, [H.ws]),
      "42501",
    );
  });
});
