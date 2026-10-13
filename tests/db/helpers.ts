import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, expect, inject } from "vitest";

export const pool = new pg.Pool({ connectionString: inject("dbUrl"), max: 4 });
afterAll(async () => {
  await pool.end();
});

export type User = { id: string; email: string };
export type Actor = User | "anon";

/** Superuser query — fixtures and assertions only, never used to "prove" access. */
export const admin = (sql: string, params: unknown[] = []) => pool.query(sql, params);

/** Creates an auth user the way Supabase Auth would (the profile trigger fires). */
export async function createUser(opts: { confirmed?: boolean; fullName?: string; email?: string } = {}): Promise<User> {
  const id = randomUUID();
  const email = (opts.email ?? `user-${id.slice(0, 8)}@example.test`).toLowerCase();
  await admin(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, $2, $3, $4)`,
    [id, email, opts.confirmed === false ? null : new Date(), { full_name: opts.fullName ?? `User ${id.slice(0, 4)}` }],
  );
  return { id, email };
}

/**
 * Runs SQL exactly as a PostgREST request would: role anon/authenticated with
 * the JWT claims in request.jwt.claims, inside its own transaction.
 */
export async function as(actor: Actor, sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (actor === "anon") {
      await client.query("set local role anon");
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: "anon" })]);
    } else {
      await client.query("set local role authenticated");
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: actor.id, role: "authenticated", email: actor.email }),
      ]);
    }
    const result = await client.query(sql, params);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Calls public.<fn>(p_x => ...) as the actor and returns the rows. */
export async function rpc<T = Record<string, unknown>>(actor: Actor, fn: string, args: Record<string, unknown> = {}) {
  const keys = Object.keys(args);
  const named = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
  const res = await as(actor, `select * from public.${fn}(${named})`, keys.map((k) => args[k]));
  return res.rows as T[];
}

/** First row, failing loudly if there is none. */
export function first<T>(rows: T[]): T {
  if (rows.length === 0) throw new Error("expected at least one row");
  return rows[0] as T;
}

export async function rpcValue<T = unknown>(actor: Actor, fn: string, args: Record<string, unknown> = {}) {
  const rows = await rpc(actor, fn, args);
  return Object.values(rows[0] ?? {})[0] as T;
}

/** Asserts that the promise fails with a PostgreSQL error (optionally a specific SQLSTATE / message). */
export async function expectPgError(p: Promise<unknown>, code?: string, message?: RegExp) {
  const err = await p.then(
    () => null,
    (e: unknown) => e as { code?: string; message: string },
  );
  expect(err, "expected the database to reject this").not.toBeNull();
  if (code) expect(err!.code, err!.message).toBe(code);
  if (message) expect(err!.message).toMatch(message);
}

export const roleId = async (workspaceId: string, key: string) =>
  (await admin(`select id from public.roles where workspace_id = $1 and key = $2`, [workspaceId, key])).rows[0].id as string;

export async function createWorkspace(owner: User, name = "Test Kitchen", currency = "EUR") {
  return rpcValue<string>(owner, "create_workspace", {
    p_name: name, p_base_currency: currency, p_locale: "en", p_timezone: "Europe/Belgrade",
  });
}

export async function createOutlet(actor: Actor, workspaceId: string, name: string) {
  const res = await as(actor, `insert into public.outlets (workspace_id, name) values ($1, $2) returning id`, [workspaceId, name]);
  return res.rows[0].id as string;
}

/** Invites and accepts in one step. */
export async function addMember(
  inviter: User, workspaceId: string, roleKey: string,
  opts: { allOutlets?: boolean; outletGrants?: { outlet_id: string; role_id: string }[]; user?: User } = {},
) {
  const user = opts.user ?? (await createUser());
  const { token } = first(await rpc<{ token: string }>(inviter, "create_invitation", {
    p_workspace_id: workspaceId, p_email: user.email, p_role_id: await roleId(workspaceId, roleKey),
    p_all_outlets: opts.allOutlets ?? true, p_outlet_grants: JSON.stringify(opts.outletGrants ?? []),
  }));
  await rpc(user, "accept_invitation", { p_token: token });
  return user;
}
