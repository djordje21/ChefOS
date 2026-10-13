/**
 * Creates a brand-new PostgreSQL database for every `npm run test:db` run,
 * applies the Supabase stub (local mode) and then every migration in
 * supabase/migrations in filename order. The database is dropped afterwards.
 *
 * Modes (CHEFOS_TEST_DB_MODE):
 *   "local"    (default) TEST_DATABASE_URL points at any PostgreSQL server where
 *              the user may CREATE DATABASE; a fresh database is created.
 *   "supabase" TEST_DATABASE_URL points at a `supabase start` database that
 *              already has the migrations applied; used as is.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
  }
}

const root = path.resolve(import.meta.dirname, "../..");

export async function migrationFiles(): Promise<string[]> {
  const dir = path.join(root, "supabase/migrations");
  return (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(dir, f));
}

export default async function setup(project: TestProject) {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Run `npm run db:local:start` and export the URL it prints " +
        "(a local PostgreSQL superuser connection). Never point this at a production database.",
    );
  }
  if (/supabase\.co|pooler\.supabase\.com/.test(serverUrl)) {
    throw new Error("Refusing to run tests against a hosted Supabase database.");
  }

  if (process.env.CHEFOS_TEST_DB_MODE === "supabase") {
    project.provide("dbUrl", serverUrl);
    return;
  }

  const dbName = `chefos_test_${Date.now()}_${process.pid}`;
  const admin = new pg.Client({ connectionString: serverUrl });
  await admin.connect();
  await admin.query(`create database ${dbName}`);
  await admin.end();

  const url = new URL(serverUrl);
  url.pathname = `/${dbName}`;
  const dbUrl = url.toString();

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(await readFile(path.join(root, "tests/db/support/supabase-stub.sql"), "utf8"));
    for (const file of await migrationFiles()) {
      try {
        await client.query(await readFile(file, "utf8"));
      } catch (error) {
        throw new Error(`Migration failed: ${path.basename(file)}: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }

  project.provide("dbUrl", dbUrl);

  return async () => {
    if (process.env.CHEFOS_KEEP_TEST_DB) return;
    const drop = new pg.Client({ connectionString: serverUrl });
    await drop.connect();
    await drop.query(`drop database if exists ${dbName} with (force)`);
    await drop.end();
  };
}
