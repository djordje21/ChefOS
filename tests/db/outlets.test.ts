import { beforeEach, describe, expect, it } from "vitest";
import { admin, as, createOutlet, expectPgError, first, roleId, rpc } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let H: Hotel;
beforeEach(async () => {
  H = await createHotel("Outlet Hotel");
});

const visibleOutlets = async (actor: Parameters<typeof as>[0]) =>
  (await as(actor, `select name from public.outlets where workspace_id = $1 order by name`, [H.ws])).rows.map((r) => r.name);

const perms = async (actor: Parameters<typeof rpc>[0]) =>
  first(await rpc<{ my_permissions: { workspace: string[]; all_outlets: boolean; outlets: Record<string, string[]> } }>(
    actor, "my_permissions", { p_workspace_id: H.ws },
  )).my_permissions;

describe("outlet-level permissions", () => {
  it("all-outlet members see every outlet; restricted members only their own", async () => {
    expect(await visibleOutlets(H.owner)).toEqual(["Lounge Bar", "Main Restaurant"]);
    expect(await visibleOutlets(H.viewer)).toEqual(["Lounge Bar", "Main Restaurant"]);
    expect(await visibleOutlets(H.loungeChef)).toEqual(["Lounge Bar"]);
  });

  it("outlet permissions resolve per outlet; workspace permissions only from the workspace role", async () => {
    const p = await perms(H.loungeChef);
    expect(p.all_outlets).toBe(false);
    expect(Object.keys(p.outlets)).toEqual([H.lounge]);
    expect(p.outlets[H.lounge]).toEqual(
      expect.arrayContaining(["outlet.view", "recipe.edit", "recipe.approve", "menu.edit", "menu.price.edit"]),
    );
    // The Outlet Chef role grants no workspace-level permission; the member's workspace role (Viewer) does.
    expect(p.workspace).not.toContain("member.manage");
    expect(p.workspace).not.toContain("outlet.manage");
    expect(p.workspace).not.toContain("price.view");

    const viewer = await perms(H.viewer);
    expect(viewer.outlets[H.main]).toEqual(["outlet.view", "report.outlet"]);
  });

  it("only outlet.manage can create or rename outlets", async () => {
    for (const actor of [H.editor, H.viewer, H.loungeChef]) {
      await expectPgError(as(actor, `insert into public.outlets (workspace_id, name) values ($1, 'Banquets')`, [H.ws]), "42501");
      const r = await as(actor, `update public.outlets set name = 'Renamed' where id = $1`, [H.lounge]).then(
        (x) => x.rowCount,
        (e: { code: string }) => e.code,
      );
      expect([0, "42501"]).toContain(r);
    }
    await createOutlet(H.execChef, H.ws, "Banquets");
    await as(H.owner, `update public.outlets set active = false where id = $1`, [H.main]);
  });

  it("outlet names are unique per workspace, case-insensitively", async () => {
    await expectPgError(createOutlet(H.owner, H.ws, "  lounge bar "), "23505");
  });

  it("granting and revoking outlet access takes effect immediately", async () => {
    await rpc(H.owner, "set_outlet_access", {
      p_workspace_id: H.ws, p_user_id: H.loungeChef.id, p_outlet_id: H.main, p_role_id: await roleId(H.ws, "outlet_viewer"),
    });
    expect(await visibleOutlets(H.loungeChef)).toEqual(["Lounge Bar", "Main Restaurant"]);
    expect((await perms(H.loungeChef)).outlets[H.main]).toEqual(["outlet.view", "report.outlet"]);

    await rpc(H.owner, "set_outlet_access", {
      p_workspace_id: H.ws, p_user_id: H.loungeChef.id, p_outlet_id: H.lounge, p_role_id: null,
    });
    expect(await visibleOutlets(H.loungeChef)).toEqual(["Main Restaurant"]);
  });

  it("switching a member between all outlets and restricted access", async () => {
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: H.viewer.id, p_role_id: await roleId(H.ws, "viewer"), p_all_outlets: false,
    });
    expect(await visibleOutlets(H.viewer)).toEqual([]);
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: H.loungeChef.id, p_role_id: await roleId(H.ws, "viewer"), p_all_outlets: true,
    });
    expect(await visibleOutlets(H.loungeChef)).toEqual(["Lounge Bar", "Main Restaurant"]);
  });

  it("a workspace role cannot be used as an outlet role and vice versa", async () => {
    await expectPgError(
      rpc(H.owner, "set_outlet_access", {
        p_workspace_id: H.ws, p_user_id: H.viewer.id, p_outlet_id: H.main, p_role_id: await roleId(H.ws, "owner"),
      }),
      "22023",
    );
    await expectPgError(
      admin(`update public.memberships set role_id = $1 where workspace_id = $2 and user_id = $3`, [
        await roleId(H.ws, "outlet_chef"), H.ws, H.viewer.id,
      ]),
      "23503",
    );
  });

  it("enforces the plan outlet limit", async () => {
    const limit = (await admin(`select (limits->>'max_outlets')::int as n from public.plans where is_default`)).rows[0].n;
    for (let i = 2; i < limit; i++) await createOutlet(H.owner, H.ws, `Outlet ${i}`);
    await expectPgError(createOutlet(H.owner, H.ws, "Over the limit"), "P0001", /Outlet limit/);
  });
});
