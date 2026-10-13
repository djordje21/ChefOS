import { beforeAll, describe, expect, it } from "vitest";
import { admin, createUser, expectPgError, first, roleId, rpc, type User } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let H: Hotel;
beforeAll(async () => {
  H = await createHotel("Invite Hotel");
});

const invite = (by: User, email: string, roleKey: string, extra: Record<string, unknown> = {}) =>
  roleId(H.ws, roleKey).then((role) =>
    rpc<{ invitation_id: string; token: string }>(by, "create_invitation", {
      p_workspace_id: H.ws, p_email: email, p_role_id: role, ...extra,
    }).then(first),
  );

describe("invitations", () => {
  it("only members with member.manage can invite", async () => {
    for (const actor of [H.execChef, H.editor, H.viewer, H.loungeChef]) {
      await expectPgError(invite(actor, "new@example.test", "viewer"), "42501", /member\.manage/);
    }
  });

  it("stores only a hash of the token, never the token", async () => {
    const { invitation_id, token } = await invite(H.owner, "hash@example.test", "viewer");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const row = (await admin(`select token_hash, encode(token_hash, 'hex') as hex from public.invitations where id = $1`, [invitation_id])).rows[0];
    expect(row.hex).not.toContain(token);
    expect(JSON.stringify(await admin(`select * from public.audit_log where entity = 'invitations'`))).not.toContain(token);
  });

  it("accepting creates exactly the invited role and outlet access", async () => {
    const u = await createUser();
    const { token } = await invite(H.owner, u.email, "editor", {
      p_all_outlets: false,
      p_outlet_grants: JSON.stringify([{ outlet_id: H.main, role_id: await roleId(H.ws, "outlet_viewer") }]),
    });
    const preview = await rpc(u, "get_invitation", { p_token: token });
    expect(first(preview)).toMatchObject({ workspace_name: "Invite Hotel", role_name: "Chef / Editor", state: "open" });
    expect(await rpc(u, "accept_invitation", { p_token: token })).toEqual([{ accept_invitation: H.ws }]);
    const m = (await admin(`select r.key, m.all_outlets from public.memberships m join public.roles r on r.id = m.role_id where m.workspace_id = $1 and m.user_id = $2`, [H.ws, u.id])).rows[0];
    expect(m).toEqual({ key: "editor", all_outlets: false });
    const om = (await admin(`select outlet_id from public.outlet_memberships where user_id = $1`, [u.id])).rows;
    expect(om).toEqual([{ outlet_id: H.main }]);
  });

  it("is single-use", async () => {
    const u = await createUser();
    const { token } = await invite(H.owner, u.email, "viewer");
    await rpc(u, "accept_invitation", { p_token: token });
    await expectPgError(rpc(u, "accept_invitation", { p_token: token }), "P0001", /invalid, expired or already used/);
  });

  it("must be accepted by the invited email address, confirmed", async () => {
    const intended = await createUser();
    const thief = await createUser();
    const { token } = await invite(H.owner, intended.email, "viewer");
    await expectPgError(rpc(thief, "accept_invitation", { p_token: token }), "42501", /different email/);

    const unconfirmed = await createUser({ confirmed: false });
    const inv2 = await invite(H.owner, unconfirmed.email, "viewer");
    await expectPgError(rpc(unconfirmed, "accept_invitation", { p_token: inv2.token }), "42501", /Confirm your email/);
  });

  it("matches email case-insensitively", async () => {
    const u = await createUser({ email: `MiXeD-${Date.now()}@Example.TEST` });
    const { token } = await invite(H.owner, u.email.toUpperCase(), "viewer");
    await rpc(u, "accept_invitation", { p_token: token });
  });

  it("revoked and expired invitations cannot be accepted", async () => {
    const u = await createUser();
    const a = await invite(H.owner, u.email, "viewer");
    await rpc(H.owner, "revoke_invitation", { p_invitation_id: a.invitation_id });
    await expectPgError(rpc(u, "accept_invitation", { p_token: a.token }), "P0001");

    const b = await invite(H.owner, u.email, "viewer");
    await admin(`update public.invitations set expires_at = now() - interval '1 minute' where id = $1`, [b.invitation_id]);
    expect(first(await rpc(u, "get_invitation", { p_token: b.token })).state).toBe("expired");
    await expectPgError(rpc(u, "accept_invitation", { p_token: b.token }), "P0001");
  });

  it("re-inviting the same email replaces the open invitation", async () => {
    const u = await createUser();
    const first = await invite(H.owner, u.email, "viewer");
    const second = await invite(H.owner, u.email, "editor");
    await expectPgError(rpc(u, "accept_invitation", { p_token: first.token }), "P0001");
    await rpc(u, "accept_invitation", { p_token: second.token });
  });

  it("unknown tokens reveal nothing; anonymous users cannot look tokens up", async () => {
    const u = await createUser();
    expect(await rpc(u, "get_invitation", { p_token: "0".repeat(64) })).toEqual([]);
    await expectPgError(rpc("anon", "get_invitation", { p_token: "0".repeat(64) }), "42501");
  });

  it("rejects existing members and invalid input", async () => {
    await expectPgError(invite(H.owner, H.viewer.email, "viewer"), "P0001", /already a member/);
    await expectPgError(invite(H.owner, "not-an-email", "viewer"), "23514");
    await expectPgError(invite(H.owner, "ok@example.test", "viewer", { p_valid_days: 90 }), "22023");
    await expectPgError(invite(H.owner, "ok@example.test", "outlet_chef"), "22023", /Unknown workspace role/);
  });
});

describe("least privilege when inviting", () => {
  it("a manager cannot grant a role with more permissions than their own", async () => {
    // A custom role: Viewer permissions plus member.manage (so it can invite Viewers, nothing more).
    const manager = await createUser();
    const custom = (await admin(
      `insert into public.roles (workspace_id, key, name, level) values ($1, 'people_manager', 'People manager', 'workspace') returning id`,
      [H.ws],
    )).rows[0].id;
    await admin(
      `insert into public.role_permissions (workspace_id, role_id, permission_code)
       select $1::uuid, $2::uuid, permission_code from public.role_permissions where role_id = $3
       union select $1::uuid, $2::uuid, 'member.manage'`,
      [H.ws, custom, await roleId(H.ws, "viewer")],
    );
    const { token } = await invite(H.owner, manager.email, "people_manager");
    await rpc(manager, "accept_invitation", { p_token: token });

    await expectPgError(invite(manager, "boss@example.test", "owner"), "42501", /permissions you do not have/);
    await expectPgError(invite(manager, "chef@example.test", "executive_chef"), "42501");
    const ok = await invite(manager, "viewer@example.test", "viewer");
    expect(ok.token).toBeTruthy();
  });

  it("a manager restricted to some outlets cannot grant all-outlet access or other outlets", async () => {
    const manager = await createUser();
    const role = (await admin(
      `insert into public.roles (workspace_id, key, name, level) values ($1, 'lounge_manager', 'Lounge manager', 'workspace') returning id`,
      [H.ws],
    )).rows[0].id;
    await admin(
      `insert into public.role_permissions (workspace_id, role_id, permission_code)
       select $1::uuid, $2::uuid, permission_code from public.role_permissions where role_id = $3
       union select $1::uuid, $2::uuid, 'member.manage'`,
      [H.ws, role, await roleId(H.ws, "viewer")],
    );
    const { token } = await invite(H.owner, manager.email, "lounge_manager", {
      p_all_outlets: false,
      p_outlet_grants: JSON.stringify([{ outlet_id: H.lounge, role_id: await roleId(H.ws, "outlet_chef") }]),
    });
    await rpc(manager, "accept_invitation", { p_token: token });

    await expectPgError(invite(manager, "a@example.test", "viewer", { p_all_outlets: true }), "42501", /all outlets/);
    await expectPgError(
      invite(manager, "b@example.test", "viewer", {
        p_all_outlets: false,
        p_outlet_grants: JSON.stringify([{ outlet_id: H.main, role_id: await roleId(H.ws, "outlet_viewer") }]),
      }),
      "42501",
    );
    const ok = await invite(manager, "c@example.test", "viewer", {
      p_all_outlets: false,
      p_outlet_grants: JSON.stringify([{ outlet_id: H.lounge, role_id: await roleId(H.ws, "outlet_chef") }]),
    });
    expect(ok.token).toBeTruthy();
  });

  it("outlet roles can never hold workspace-level permissions", async () => {
    await expectPgError(
      admin(`insert into public.role_permissions (workspace_id, role_id, permission_code) values ($1, $2, 'member.manage')`, [
        H.ws, await roleId(H.ws, "outlet_chef"),
      ]),
      "23514",
    );
  });
});
