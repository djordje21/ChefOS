/**
 * Structural security guarantees. These are generated from the live catalog,
 * so a new table or function that breaks a rule fails the build automatically.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { admin } from "./helpers";

// Tables in `public` that are intentionally not workspace-scoped.
const GLOBAL_TABLES = ["plans", "profiles", "sys_permissions"];

describe("migrations", () => {
  it("are uniquely named, timestamp-ordered SQL files", async () => {
    const files = (await readdir(path.resolve(import.meta.dirname, "../../supabase/migrations"))).filter((f) =>
      f.endsWith(".sql"),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    expect(new Set(files.map((f) => f.slice(0, 14))).size).toBe(files.length);
  });
});

describe("schema security invariants", () => {
  it("every table in public has row-level security enabled", async () => {
    const { rows } = await admin(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`);
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("anon has no privilege on any table, sequence or function in public", async () => {
    const tables = await admin(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'S')
        and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
          or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))`);
    expect(tables.rows).toEqual([]);
    const fns = await admin(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')`);
    expect(fns.rows).toEqual([]);
  });

  it("authenticated cannot delete from any table (deletes go through checked RPCs)", async () => {
    const { rows } = await admin(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and has_table_privilege('authenticated', c.oid, 'delete')`);
    expect(rows).toEqual([]);
  });

  it("every business table carries a NOT NULL workspace_id", async () => {
    const { rows } = await admin(
      `
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'workspaces'
        and not (c.relname = any($1))
        and not exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'workspace_id'
                        and a.attnotnull and not a.attisdropped)`,
      [GLOBAL_TABLES],
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("every foreign key between workspace-scoped tables includes workspace_id (composite)", async () => {
    const { rows } = await admin(
      `
      select con.conname
      from pg_constraint con
      join pg_class src on src.oid = con.conrelid
      join pg_class dst on dst.oid = con.confrelid
      join pg_namespace n on n.oid = src.relnamespace
      where con.contype = 'f' and n.nspname = 'public'
        and dst.relnamespace = n.oid
        and dst.relname not in ('workspaces', 'plans', 'sys_permissions', 'profiles')
        and not exists (
          select 1 from unnest(con.conkey) k join pg_attribute a on a.attrelid = src.oid and a.attnum = k
          where a.attname = 'workspace_id')`,
    );
    expect(rows.map((r) => r.conname)).toEqual([]);
  });

  it("every SECURITY DEFINER function pins its search_path", async () => {
    const { rows } = await admin(`
      select n.nspname || '.' || p.proname as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
    expect(rows).toEqual([]);
  });

  it("the invitation token hash is never readable through the API", async () => {
    const { rows } = await admin(
      `select has_column_privilege('authenticated', 'public.invitations', 'token_hash', 'select') as can`,
    );
    expect(rows[0].can).toBe(false);
  });

  it("the private schema exposes only the RLS helpers to authenticated", async () => {
    const { rows } = await admin(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute') order by 1`);
    expect(rows.map((r) => r.proname)).toEqual(["has_outlet_perm", "has_ws_perm", "is_member", "shares_workspace"]);
  });
});
