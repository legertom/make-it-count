import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * One database handle per process.
 *
 * - DATABASE_URL set  -> Neon Postgres over HTTP (production / Vercel).
 * - DATABASE_URL unset -> PGlite, an embedded Postgres persisted in ./.data,
 *   so local development needs no database setup at all. Migrations in
 *   ./drizzle are applied automatically on first use.
 */
const globalForDb = globalThis as unknown as {
  __makeItCountDb?: Promise<Db>;
  __makeItCountMigrated?: string;
};

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/** Newest migration tag, so dev can notice a freshly generated migration. */
function journalTag(): string {
  try {
    const journal = JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8")) as {
      entries?: { tag: string }[];
    };
    return journal.entries?.at(-1)?.tag ?? "";
  } catch {
    return "";
  }
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__makeItCountDb) {
    globalForDb.__makeItCountDb = createDb().catch((err) => {
      globalForDb.__makeItCountDb = undefined;
      throw err;
    });
  } else if (usingEmbeddedDb && globalForDb.__makeItCountMigrated !== journalTag()) {
    // A new migration landed while the dev server was running: apply it to the open PGlite.
    globalForDb.__makeItCountDb = globalForDb.__makeItCountDb.then(async (db) => {
      await migrateEmbedded(db);
      return db;
    });
  }
  return globalForDb.__makeItCountDb;
}

export const usingEmbeddedDb = !process.env.DATABASE_URL;

async function migrateEmbedded(db: Db) {
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  await migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_DIR });
  globalForDb.__makeItCountMigrated = journalTag();
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrateEmbedded(db);
  return db;
}
