import { mkdirSync } from "node:fs";
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
const globalForDb = globalThis as unknown as { __makeItCountDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__makeItCountDb) {
    globalForDb.__makeItCountDb = createDb().catch((err) => {
      globalForDb.__makeItCountDb = undefined;
      throw err;
    });
  }
  return globalForDb.__makeItCountDb;
}

export const usingEmbeddedDb = !process.env.DATABASE_URL;

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}
