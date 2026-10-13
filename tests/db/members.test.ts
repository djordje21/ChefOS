import { beforeEach, describe, expect, it } from "vitest";
import { addMember, admin, as, createUser, expectPgError, roleId, rpc } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let H: Hotel;
beforeEach(async () => {
  H = await createHotel("Member Hotel");
});

const update = (actor: Parameters<typeof rpc>[0], userId: string, roleKey: string, allOutlets = true) =>
  roleId(H.ws, roleKey).then((r) =>
    rpc(actor, "update_member", { p_workspace_id: H.ws, p_user_id: userId, p_role_id: r, p_all_outlets: allOutlets }),
  );

describe("membership management", () => {
  it("lists members; emails only for member.manage or yourself", async () => {
    const asOwner = await rpc(H.owner, "list_members", { p_workspace_id: H.ws });
    expect(asOwner).toHaveLength(5);
    expect(asOwner.every((m) => typeof m.email === "string")).toBe(true);
    const asViewer = await rpc(H.viewer, "list_members", { p_workspace_id: H.ws });
    expect(asViewer.filter((m) => m.email !== null).map((m) => m.user_id)).toEqual([H.viewer.id]);
    expect(asViewer.filter((m) => m.outlet_access !== null).map((m) => m.user_id)).toEqual([H.viewer.id]);
  });

  it("owner changes a member's role; the change applies immediately", async () => {
    await expectPgError(as(H.viewer, `insert into public.outlets (workspace_id, name) values ($1, 'X')`, [H.ws]), "42501");
    await update(H.owner, H.viewer.id, "executive_chef");
    await as(H.viewer, `insert into public.outlets (workspace_id, name) values ($1, 'X')`, [H.ws]);
  });

  it("only member.manage can change members, and nobody can change themselves", async () => {
    for (const actor of [H.execChef, H.editor, H.viewer, H.loungeChef]) {
      await expectPgError(update(actor, H.viewer.id, "editor"), "42501");
    }
    await expectPgError(update(H.owner, H.owner.id, "viewer"), "42501", /your own/);
  });

  it("members cannot write memberships directly", async () => {
    await expectPgError(
      as(H.viewer, `update public.memberships set role_id = $1 where user_id = $2 and workspace_id = $3`, [
        await roleId(H.ws, "owner"), H.viewer.id, H.ws,
      ]),
      "42501",
    );
    await expectPgError(
      as(H.owner, `insert into public.memberships (workspace_id, user_id, role_id) values ($1, $2, $3)`, [
        H.ws, (await createUser()).id, await roleId(H.ws, "viewer"),
      ]),
      "42501",
    );
  });

  it("the last owner can be neither demoted nor removed, nor leave", async () => {
    const second = await addMember(H.owner, H.ws, "owner");
    await update(second, H.owner.id, "viewer"); // allowed: another owner remains
    await expectPgError(update(H.owner, second.id, "viewer"), "42501"); // H.owner is no longer allowed to manage
    await expectPgError(rpc(second, "remove_member", { p_workspace_id: H.ws, p_user_id: second.id }), "P0001", /at least one owner/);
  });

  it("a removed member loses access immediately", async () => {
    const before = await as(H.editor, `select count(*)::int as n from public.outlets where workspace_id = $1`, [H.ws]);
    expect(before.rows[0].n).toBe(2);
    await rpc(H.owner, "remove_member", { p_workspace_id: H.ws, p_user_id: H.editor.id });
    for (const t of ["workspaces", "outlets", "roles", "memberships"]) {
      const col = t === "workspaces" ? "id" : "workspace_id";
      const r = await as(H.editor, `select count(*)::int as n from public.${t} where ${col} = $1`, [H.ws]);
      expect(r.rows[0].n, t).toBe(0);
    }
    expect(await rpc(H.editor, "my_workspaces")).toEqual([]);
  });

  it("a member can leave a workspace", async () => {
    await rpc(H.viewer, "remove_member", { p_workspace_id: H.ws, p_user_id: H.viewer.id });
    expect(await rpc(H.viewer, "my_workspaces")).toEqual([]);
  });

  it("removing a member also removes their outlet access", async () => {
    await rpc(H.owner, "remove_member", { p_workspace_id: H.ws, p_user_id: H.loungeChef.id });
    const r = await admin(`select count(*)::int as n from public.outlet_memberships where user_id = $1`, [H.loungeChef.id]);
    expect(r.rows[0].n).toBe(0);
  });

  it("a suspended membership has no access", async () => {
    await admin(`update public.memberships set status = 'suspended' where workspace_id = $1 and user_id = $2`, [H.ws, H.editor.id]);
    const r = await as(H.editor, `select count(*)::int as n from public.outlets where workspace_id = $1`, [H.ws]);
    expect(r.rows[0].n).toBe(0);
  });

  it("a suspended workspace is invisible to its members", async () => {
    await admin(`update public.workspaces set status = 'suspended' where id = $1`, [H.ws]);
    expect(await rpc(H.owner, "my_workspaces")).toEqual([]);
    const r = await as(H.owner, `select count(*)::int as n from public.workspaces where id = $1`, [H.ws]);
    expect(r.rows[0].n).toBe(0);
  });
});
