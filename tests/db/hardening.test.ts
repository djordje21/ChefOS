/**
 * Regression tests for the Phase 2.0 security audit findings:
 *   H1 invitations outliving the inviter's authority
 *   M1 accepting invitations into a suspended workspace
 *   M2 deactivated outlets leaving access behind
 */
import { beforeEach, describe, expect, it } from "vitest";
import { addMember, admin, as, createUser, expectPgError, first, roleId, rpc, type User } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let H: Hotel;
let manager: User; // custom role: Executive Chef permissions + member.manage, all outlets
let loungeManager: User; // custom role: Viewer permissions + member.manage, Lounge only (Outlet Chef)

async function customRole(key: string, basedOn: string) {
  const id = (
    await admin(`insert into public.roles (workspace_id, key, name, level) values ($1, $2, $2, 'workspace') returning id`, [H.ws, key])
  ).rows[0].id as string;
  await admin(
    `insert into public.role_permissions (workspace_id, role_id, permission_code)
     select $1::uuid, $2::uuid, permission_code from public.role_permissions where role_id = $3
     union select $1::uuid, $2::uuid, 'member.manage'`,
    [H.ws, id, await roleId(H.ws, basedOn)],
  );
  return id;
}

const invite = async (by: User, email: string, roleKey: string, extra: Record<string, unknown> = {}) =>
  first(
    await rpc<{ invitation_id: string; token: string }>(by, "create_invitation", {
      p_workspace_id: H.ws, p_email: email, p_role_id: await roleId(H.ws, roleKey), ...extra,
    }),
  );

const invitationRow = async (id: string) =>
  (await admin(`select revoked_at is not null as revoked, revoked_reason, accepted_at is not null as accepted from public.invitations where id = $1`, [id])).rows[0];

const loungeGrant = async () => JSON.stringify([{ outlet_id: H.lounge, role_id: await roleId(H.ws, "outlet_chef") }]);

beforeEach(async () => {
  H = await createHotel("Hardening Hotel");
  await customRole("people_manager", "executive_chef");
  manager = await addMember(H.owner, H.ws, "people_manager");
  await customRole("lounge_manager", "viewer");
  loungeManager = await addMember(H.owner, H.ws, "lounge_manager", {
    allOutlets: false,
    outletGrants: [{ outlet_id: H.lounge, role_id: await roleId(H.ws, "outlet_chef") }],
  });
});

describe("H1: an invitation is honoured only while its sender could still grant it", () => {
  it("control: a valid invitation is accepted", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "executive_chef");
    await rpc(u, "accept_invitation", { p_token: inv.token });
  });

  it("sender demoted to a role without the invited permissions", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "executive_chef");
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: manager.id, p_role_id: await roleId(H.ws, "viewer"), p_all_outlets: true,
    });
    expect(await invitationRow(inv.invitation_id)).toEqual({ revoked: true, revoked_reason: "inviter_access_changed", accepted: false });
    expect(first(await rpc(u, "get_invitation", { p_token: inv.token })).state).toBe("revoked");
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
    expect(await rpc(u, "my_workspaces")).toEqual([]);
  });

  it("sender loses member.manage but keeps the other permissions", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "viewer");
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: manager.id, p_role_id: await roleId(H.ws, "executive_chef"), p_all_outlets: true,
    });
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(true);
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("sender removed from the workspace", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "editor");
    await rpc(H.owner, "remove_member", { p_workspace_id: H.ws, p_user_id: manager.id });
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(true);
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("sender leaves the workspace", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "editor");
    await rpc(manager, "remove_member", { p_workspace_id: H.ws, p_user_id: manager.id });
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("sender's membership suspended", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "editor");
    await admin(`update public.memberships set status = 'suspended' where workspace_id = $1 and user_id = $2`, [H.ws, manager.id]);
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(true);
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("sender loses all-outlet access after inviting someone to all outlets", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "viewer", { p_all_outlets: true });
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: manager.id, p_role_id: await roleId(H.ws, "people_manager"), p_all_outlets: false,
    });
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("sender loses the outlet access the invitation grants", async () => {
    const u = await createUser();
    const inv = await invite(loungeManager, u.email, "viewer", { p_all_outlets: false, p_outlet_grants: await loungeGrant() });
    await rpc(H.owner, "set_outlet_access", {
      p_workspace_id: H.ws, p_user_id: loungeManager.id, p_outlet_id: H.lounge, p_role_id: await roleId(H.ws, "outlet_viewer"),
    });
    expect(await invitationRow(inv.invitation_id)).toMatchObject({ revoked: true, revoked_reason: "inviter_access_changed" });
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001");
  });

  it("the sender's role loses a permission directly (no trigger path): rejected at acceptance", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "editor");
    await admin(`delete from public.role_permissions where role_id = $1 and permission_code = 'price.edit'`, [
      await roleId(H.ws, "people_manager"),
    ]);
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(false);
    expect(first(await rpc(u, "get_invitation", { p_token: inv.token })).state).toBe("invalid");
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001", /no longer valid/);
  });

  it("unrelated changes to the sender do not revoke a still-valid invitation", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "viewer");
    await rpc(H.owner, "update_member", {
      p_workspace_id: H.ws, p_user_id: manager.id, p_role_id: await roleId(H.ws, "owner"), p_all_outlets: true,
    });
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(false);
    await rpc(u, "accept_invitation", { p_token: inv.token });
  });

  it("changes to other members do not touch the sender's invitations", async () => {
    const u = await createUser();
    const inv = await invite(manager, u.email, "viewer");
    await rpc(H.owner, "remove_member", { p_workspace_id: H.ws, p_user_id: H.editor.id });
    expect((await invitationRow(inv.invitation_id)).revoked).toBe(false);
  });

  it("records why invitations were revoked", async () => {
    const a = await invite(H.owner, "a-reason@example.test", "viewer");
    await rpc(H.owner, "revoke_invitation", { p_invitation_id: a.invitation_id });
    expect((await invitationRow(a.invitation_id)).revoked_reason).toBe("manual");
    const b1 = await invite(H.owner, "b-reason@example.test", "viewer");
    await invite(H.owner, "b-reason@example.test", "editor");
    expect((await invitationRow(b1.invitation_id)).revoked_reason).toBe("replaced");
  });
});

describe("M1: suspended workspaces", () => {
  it("an invitation cannot be accepted while the workspace is suspended, and works again after reactivation", async () => {
    const u = await createUser();
    const inv = await invite(H.owner, u.email, "viewer");
    await admin(`update public.workspaces set status = 'suspended' where id = $1`, [H.ws]);
    expect(first(await rpc(u, "get_invitation", { p_token: inv.token })).state).toBe("invalid");
    await expectPgError(rpc(u, "accept_invitation", { p_token: inv.token }), "P0001", /not active/);
    expect((await admin(`select count(*)::int as n from public.memberships where user_id = $1`, [u.id])).rows[0].n).toBe(0);

    await admin(`update public.workspaces set status = 'active' where id = $1`, [H.ws]);
    await rpc(u, "accept_invitation", { p_token: inv.token });
  });

  it("nobody can invite into a suspended workspace", async () => {
    await admin(`update public.workspaces set status = 'suspended' where id = $1`, [H.ws]);
    await expectPgError(invite(H.owner, "late@example.test", "viewer"), "42501");
  });
});

describe("M2: deactivated outlets grant no access", () => {
  const visible = async (actor: Parameters<typeof as>[0]) =>
    (await as(actor, `select name from public.outlets where workspace_id = $1 order by name`, [H.ws])).rows.map((r) => r.name);
  const outletPerms = async (actor: Parameters<typeof rpc>[0]) =>
    first(await rpc<{ my_permissions: { outlets: Record<string, string[]> } }>(actor, "my_permissions", { p_workspace_id: H.ws }))
      .my_permissions.outlets;
  const deactivate = () => as(H.owner, `update public.outlets set active = false where id = $1`, [H.lounge]);

  it("restricted and all-outlet members lose all outlet permissions; managers still see it", async () => {
    await deactivate();
    expect(await visible(H.loungeChef)).toEqual([]);
    expect(await outletPerms(H.loungeChef)).toEqual({});
    expect(await visible(H.viewer)).toEqual(["Main Restaurant"]);
    expect(Object.keys(await outletPerms(H.viewer))).toEqual([H.main]);
    expect(await visible(H.editor)).toEqual(["Main Restaurant"]);
    // outlet.manage (Owner, Executive Chef) keeps sight of it in order to reactivate
    expect(await visible(H.owner)).toEqual(["Lounge Bar", "Main Restaurant"]);
    expect(await visible(H.execChef)).toEqual(["Lounge Bar", "Main Restaurant"]);
    expect(Object.keys(await outletPerms(H.owner))).toEqual([H.main]);
  });

  it("no new access can be granted on an inactive outlet", async () => {
    await deactivate();
    await expectPgError(
      rpc(H.owner, "set_outlet_access", {
        p_workspace_id: H.ws, p_user_id: H.viewer.id, p_outlet_id: H.lounge, p_role_id: await roleId(H.ws, "outlet_chef"),
      }),
      "22023",
      /inactive/,
    );
    await expectPgError(
      invite(H.owner, "x-inactive@example.test", "viewer", { p_all_outlets: false, p_outlet_grants: await loungeGrant() }),
      "22023",
      /inactive/,
    );
  });

  it("deactivation revokes open invitations that grant that outlet, and only those", async () => {
    const toLounge = await invite(H.owner, "to-lounge@example.test", "viewer", { p_all_outlets: false, p_outlet_grants: await loungeGrant() });
    const toAll = await invite(H.owner, "to-all@example.test", "viewer");
    await deactivate();
    expect(await invitationRow(toLounge.invitation_id)).toMatchObject({ revoked: true, revoked_reason: "outlet_deactivated" });
    expect((await invitationRow(toAll.invitation_id)).revoked).toBe(false);
  });

  it("assignments are kept and come back exactly on reactivation", async () => {
    await deactivate();
    await as(H.owner, `update public.outlets set active = true where id = $1`, [H.lounge]);
    expect(await visible(H.loungeChef)).toEqual(["Lounge Bar"]);
    expect((await outletPerms(H.loungeChef))[H.lounge]).toContain("recipe.edit");
  });

  it("an outlet manager who is restricted to the deactivated outlet loses the ability to grant it", async () => {
    await deactivate();
    await expectPgError(
      invite(loungeManager, "y-inactive@example.test", "viewer", { p_all_outlets: false, p_outlet_grants: await loungeGrant() }),
      "22023",
    );
  });
});
