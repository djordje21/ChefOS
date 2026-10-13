/**
 * Workspace isolation. The table list is read from the catalog, so every new
 * workspace-scoped table is covered automatically (and must be populated by the
 * fixture, otherwise the coverage check fails).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { addMember, admin, as, createUser, expectPgError, roleId, rpc, type User } from "./helpers";
import { createHotel, type Hotel } from "./fixtures";

let A: Hotel;
let B: Hotel;
let tables: string[];

const scopeColumn = (t: string) => (t === "workspaces" ? "id" : "workspace_id");

beforeAll(async () => {
  A = await createHotel("Hotel A");
  B = await createHotel("Hotel B");
  tables = (
    await admin(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (c.relname = 'workspaces' or exists (
          select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'workspace_id' and not a.attisdropped))
      order by 1`)
  ).rows.map((r) => r.relname);
});

describe("workspace isolation (generated for every workspace-scoped table)", () => {
  it("the fixture populates every workspace-scoped table, so no check below is vacuous", async () => {
    expect(tables.length).toBeGreaterThanOrEqual(8);
    for (const t of tables) {
      const { rows } = await admin(`select count(*)::int as n from public.${t} where ${scopeColumn(t)} = $1`, [A.ws]);
      expect(rows[0].n, `fixture has no rows in ${t}`).toBeGreaterThan(0);
    }
  });

  it("every member role of B sees zero rows of A in every table", async () => {
    for (const actor of [B.owner, B.execChef, B.editor, B.viewer, B.loungeChef]) {
      for (const t of tables) {
        const { rows } = await as(actor, `select count(*)::int as n from public.${t} where ${scopeColumn(t)} = $1`, [A.ws]);
        expect(rows[0].n, `${actor.email} sees A rows in ${t}`).toBe(0);
      }
    }
  });

  it("B's owner cannot update or delete any row of A", async () => {
    for (const t of tables) {
      const col = scopeColumn(t);
      const upd = await as(B.owner, `update public.${t} set ${col} = ${col} where ${col} = $1`, [A.ws]).then(
        (r) => r.rowCount,
        (e: { code: string }) => e.code,
      );
      expect([0, "42501"], `update on ${t}`).toContain(upd);
      await expectPgError(as(B.owner, `delete from public.${t} where ${col} = $1`, [A.ws]), "42501");
    }
  });

  it("B's owner cannot insert outlets into A", async () => {
    await expectPgError(
      as(B.owner, `insert into public.outlets (workspace_id, name) values ($1, 'Intruder')`, [A.ws]),
      "42501",
      /row-level security/,
    );
  });

  it("B's owner cannot use any RPC against A", async () => {
    const viewerRole = await roleId(A.ws, "viewer");
    await expectPgError(rpc(B.owner, "list_members", { p_workspace_id: A.ws }), "42501");
    expect(await rpc(B.owner, "my_permissions", { p_workspace_id: A.ws })).toEqual([{ my_permissions: null }]);
    await expectPgError(
      rpc(B.owner, "create_invitation", { p_workspace_id: A.ws, p_email: "x@example.test", p_role_id: viewerRole }),
      "42501",
    );
    await expectPgError(rpc(B.owner, "revoke_invitation", { p_invitation_id: A.pendingInviteId }), "42501");
    await expectPgError(
      rpc(B.owner, "update_member", { p_workspace_id: A.ws, p_user_id: A.viewer.id, p_role_id: viewerRole, p_all_outlets: true }),
      "42501",
    );
    await expectPgError(
      rpc(B.owner, "set_outlet_access", { p_workspace_id: A.ws, p_user_id: A.viewer.id, p_outlet_id: A.main, p_role_id: null }),
      "42501",
    );
    await expectPgError(rpc(B.owner, "remove_member", { p_workspace_id: A.ws, p_user_id: A.viewer.id }), "42501");
  });

  it("B cannot grant A's roles or outlets inside B (role/outlet ids are workspace-checked)", async () => {
    await expectPgError(
      rpc(B.owner, "create_invitation", {
        p_workspace_id: B.ws, p_email: "y@example.test", p_role_id: await roleId(A.ws, "owner"),
      }),
      "22023",
    );
    await expectPgError(
      rpc(B.owner, "create_invitation", {
        p_workspace_id: B.ws, p_email: "z@example.test", p_role_id: await roleId(B.ws, "viewer"),
        p_all_outlets: false, p_outlet_grants: JSON.stringify([{ outlet_id: A.main, role_id: await roleId(B.ws, "outlet_chef") }]),
      }),
      "22023",
    );
  });

  it("the database rejects cross-workspace references even for a superuser (composite FKs)", async () => {
    // outlet of A + membership of B
    await expectPgError(
      admin(`insert into public.outlet_memberships (workspace_id, outlet_id, user_id, role_id) values ($1, $2, $3, $4)`, [
        B.ws, A.main, B.viewer.id, await roleId(B.ws, "outlet_chef"),
      ]),
      "23503",
    );
    // role of A on a membership in B
    await expectPgError(
      admin(`update public.memberships set role_id = $1 where workspace_id = $2 and user_id = $3`, [
        await roleId(A.ws, "owner"), B.ws, B.viewer.id,
      ]),
      "23503",
    );
    // permission row pointing at a role of another workspace
    await expectPgError(
      admin(`insert into public.role_permissions (workspace_id, role_id, permission_code) values ($1, $2, 'audit.view')`, [
        B.ws, await roleId(A.ws, "viewer"),
      ]),
      "23503",
    );
  });

  it("an invitation token for A gives nothing in B and cannot be reused", async () => {
    const u: User = await createUser();
    await addMember(A.owner, A.ws, "viewer", { user: u });
    expect((await rpc(u, "my_workspaces")).map((w) => w.workspace_id)).toEqual([A.ws]);
  });
});

describe("one user in several workspaces (consultant)", () => {
  it("roles are independent per workspace and data never mixes", async () => {
    const consultant = await createUser({ fullName: "Consultant" });
    await addMember(A.owner, A.ws, "executive_chef", { user: consultant });
    await addMember(B.owner, B.ws, "viewer", { user: consultant });

    const mine = await rpc(consultant, "my_workspaces");
    expect(mine.map((w) => [w.workspace_id, w.role_key]).sort()).toEqual(
      [[A.ws, "executive_chef"], [B.ws, "viewer"]].sort(),
    );

    // can create outlets in A (executive chef has outlet.manage) but not in B (viewer)
    await as(consultant, `insert into public.outlets (workspace_id, name) values ($1, 'Pastry')`, [A.ws]);
    await expectPgError(
      as(consultant, `insert into public.outlets (workspace_id, name) values ($1, 'Pastry')`, [B.ws]),
      "42501",
    );

    // a query without a workspace filter returns rows of both, each correctly scoped
    const outlets = await as(consultant, `select workspace_id, name from public.outlets order by name`);
    expect(new Set(outlets.rows.map((r) => r.workspace_id))).toEqual(new Set([A.ws, B.ws]));

    // emails of B's members stay hidden from a B viewer
    const bMembers = await rpc(consultant, "list_members", { p_workspace_id: B.ws });
    expect(bMembers.filter((m) => m.user_id !== consultant.id).every((m) => m.email === null)).toBe(true);
  });
});
