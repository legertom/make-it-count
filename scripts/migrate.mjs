// Applies ./drizzle migrations to the Neon database in DATABASE_URL.
// Runs before `next build` so a fresh Vercel deploy has its tables.
// With no DATABASE_URL (local dev) it is a no-op: PGlite migrates itself.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set; skipping (local PGlite migrates on first use).");
  process.exit(0);
}

await migrate(drizzle(neon(url)), { migrationsFolder: "./drizzle" });
console.log("[migrate] migrations applied");
