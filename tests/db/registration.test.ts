import { describe, expect, it } from "vitest";
import { admin, as, createUser, createWorkspace, expectPgError, rpc, rpcValue } from "./helpers";

describe("registration and workspace creation", () => {
  it("sign-up creates a profile and nothing else", async () => {
    const u = await createUser({ fullName: "Ana Kuvar" });
    const profile = await admin(`select full_name from public.profiles where id = $1`, [u.id]);
    expect(profile.rows[0].full_name).toBe("Ana Kuvar");
    const m = await admin(`select count(*)::int as n from public.memberships where user_id = $1`, [u.id]);
    expect(m.rows[0].n).toBe(0);
    expect(await rpc(u, "my_workspaces")).toEqual([]);
  });

  it("an unconfirmed email cannot create a workspace", async () => {
    const u = await createUser({ confirmed: false });
    await expectPgError(createWorkspace(u), "42501", /Confirm your email/);
  });

  it("anonymous callers cannot create workspaces or read anything", async () => {
    await expectPgError(
      as("anon", `select public.create_workspace('X', 'EUR')`), "42501", /permission denied/);
    await expectPgError(as("anon", `select * from public.workspaces`), "42501");
    await expectPgError(as("anon", `select * from public.sys_permissions`), "42501");
  });

  it("the creator becomes Owner of the new workspace only, with all outlets", async () => {
    const other = await createUser();
    const otherWs = await createWorkspace(other, "Someone else");
    const u = await createUser();
    const ws = await createWorkspace(u, "  Bistro  ", "rsd");
    const mine = await rpc(u, "my_workspaces");
    expect(mine).toEqual([
      expect.objectContaining({ workspace_id: ws, name: "Bistro", base_currency: "RSD", role_key: "owner", all_outlets: true }),
    ]);
    expect(mine.find((w) => w.workspace_id === otherWs)).toBeUndefined();
  });

  it("a new workspace starts empty apart from its editable system roles", async () => {
    const u = await createUser();
    const ws = await createWorkspace(u);
    const outlets = await as(u, `select count(*)::int as n from public.outlets where workspace_id = $1`, [ws]);
    expect(outlets.rows[0].n).toBe(0);
    const roles = await as(u, `select key, level from public.roles where workspace_id = $1 order by sort_order`, [ws]);
    expect(roles.rows).toEqual([
      { key: "owner", level: "workspace" },
      { key: "executive_chef", level: "workspace" },
      { key: "editor", level: "workspace" },
      { key: "viewer", level: "workspace" },
      { key: "outlet_chef", level: "outlet" },
      { key: "outlet_viewer", level: "outlet" },
    ]);
  });

  it("validates currency and time zone", async () => {
    const u = await createUser();
    await expectPgError(createWorkspace(u, "X", "EURO"), "23514");
    await expectPgError(
      rpcValue(u, "create_workspace", { p_name: "X", p_base_currency: "EUR", p_timezone: "Mars/Olympus" }),
      "22023",
    );
  });

  it("enforces the plan limit on owned workspaces", async () => {
    const u = await createUser();
    const limit = (await admin(`select (limits->>'max_owned_workspaces')::int as n from public.plans where is_default`)).rows[0].n;
    for (let i = 0; i < limit; i++) await createWorkspace(u, `W${i}`);
    await expectPgError(createWorkspace(u, "one too many"), "P0001", /limit/);
  });

  it("users can update only their own profile, and only safe columns", async () => {
    const a = await createUser();
    const b = await createUser();
    const r = await as(a, `update public.profiles set full_name = 'Hacked' where id = $1`, [b.id]);
    expect(r.rowCount).toBe(0);
    await as(a, `update public.profiles set full_name = 'Me' where id = $1`, [a.id]);
    expect((await admin(`select full_name from public.profiles where id = $1`, [a.id])).rows[0].full_name).toBe("Me");
    await expectPgError(as(a, `update public.profiles set id = gen_random_uuid() where id = $1`, [a.id]), "42501");
  });

  it("workspace settings are editable only with workspace.settings, and not plan/owner fields", async () => {
    const owner = await createUser();
    const ws = await createWorkspace(owner);
    await as(owner, `update public.workspaces set name = 'Renamed' where id = $1`, [ws]);
    expect((await admin(`select name from public.workspaces where id = $1`, [ws])).rows[0].name).toBe("Renamed");
    await expectPgError(as(owner, `update public.workspaces set plan_id = plan_id where id = $1`, [ws]), "42501");
    await expectPgError(as(owner, `update public.workspaces set status = 'active' where id = $1`, [ws]), "42501");
    await expectPgError(as(owner, `insert into public.workspaces (name, base_currency, plan_id, created_by) select 'x','EUR',id,$1 from public.plans`, [owner.id]), "42501");
  });
});
