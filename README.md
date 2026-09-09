# Make It Count

Clever's short internal course on using AI on purpose, as a Next.js app with Google SSO
(clever.com only), a built-in feedback assistant, and an admin view for feedback and learner
progress.

## What's in here

| Area | Where | Notes |
| --- | --- | --- |
| Course | `components/course/MakeItCount.tsx`, `lib/course-pages.ts` | Ported from the original prototype. Progress and answers sync to the database, so learners resume across devices. |
| Sign-in | `auth.config.ts`, `auth.ts`, `proxy.ts`, `app/login` | Auth.js with Google. Only verified `@clever.com` accounts get in. Admins come from `ADMIN_EMAILS`. |
| Feedback widget | `components/feedback/*` | Floating button → chat with the eve agent, or a direct form. Screenshot capture with draw / arrow / box / text annotation. |
| Feedback agent | `agent/*` | An [eve.dev](https://eve.dev) agent mounted at `/eve/v1/*` by `withEve()` in `next.config.ts`. It verifies the Auth.js cookie, chats, and files feedback through `POST /api/internal/feedback`. |
| Admin | `app/(app)/admin/*` | Feedback list and detail (status, notes, screenshot). Learners: roster, completion, time per page, per-learner detail, reset progress, CSV export. |
| Data | `lib/db/*`, `drizzle/` | Drizzle ORM. Local dev uses embedded Postgres (PGlite) in `./.data` with zero setup; production uses Neon via `DATABASE_URL`. |

## Run it locally

```bash
npm install
npm run dev
```

`npm run dev` starts Next.js and the eve agent together on <http://localhost:3000>.
`.env.local` already has a generated `AUTH_SECRET` and `INTERNAL_API_SECRET`. What's left:

1. **Sign-in.** Until Google OAuth is configured, `AUTH_DEV_BYPASS=1` shows a local-only
   "dev sign-in" box on `/login` that accepts any `@clever.com` address. To use real Google
   SSO, create an OAuth client in Google Cloud Console (Web application) with redirect URI
   `http://localhost:3000/api/auth/callback/google`, then set `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET` and turn the bypass off.
2. **Admins.** Set `ADMIN_EMAILS` to the real Clever addresses (comma-separated).
3. **Feedback agent model.** Set either `AI_GATEWAY_API_KEY` (Vercel AI Gateway, from the Clever
   Vercel team) or `ANTHROPIC_API_KEY`. Without one, the chat shows an error and offers the
   direct form, which works regardless.
4. **Database.** Nothing to do locally. `DATABASE_URL` switches to Neon.

Useful scripts:

```bash
npm run typecheck     # tsc
npm run lint          # eslint
npm run db:generate   # regenerate ./drizzle after editing lib/db/schema.ts
npm run db:migrate    # apply migrations to the Neon DB in .env.local
```

## Deploying to Vercel (Clever team only)

1. Create the project under the Clever Vercel team and connect this repo.
2. Add a Neon Postgres store from the Vercel Marketplace; it sets `DATABASE_URL`.
   `npm run build` runs migrations before `next build`.
3. Set the environment variables from `.env.example`: `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`, `INTERNAL_API_SECRET`, and an AI Gateway key
   (or rely on the project's OIDC token for the gateway). Leave `AUTH_DEV_BYPASS` unset.
4. Add the production redirect URI `https://<domain>/api/auth/callback/google` to the Google
   OAuth client.

The eve agent deploys as a Vercel service alongside the app; `withEve()` writes the routing.

## How the pieces talk to each other

- The browser calls `/eve/v1/*` on the same origin. In dev, Next.js proxies that to the eve dev
  server; on Vercel it's a separate service. The Auth.js session cookie rides along, and
  `agent/channels/eve.ts` decodes it into an eve user principal.
- The agent's `submit_feedback` tool posts to `/api/internal/feedback` with
  `INTERNAL_API_SECRET`. The screenshot id the browser uploaded to `/api/screenshots` is passed
  through in the chat text as `[Screenshot attached: shot_…]`.
- Learner telemetry: the course posts to `/api/progress` on every page change (and on tab close)
  with the page they left, how long it was visible, their current page, and their answers.
