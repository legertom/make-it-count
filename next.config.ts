import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // PGlite (the embedded local Postgres used when DATABASE_URL is unset)
  // ships WASM assets that must be loaded by Node directly, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

// withEve boots the feedback agent (./agent) beside `next dev` and mounts its
// routes at /eve/v1/* on the same origin, so the browser never needs a second host.
export default withEve(nextConfig);
