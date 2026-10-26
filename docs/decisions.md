# Decisions

## Decision 1 — One Next.js application instead of a separate API

- **Chose:** Next.js App Router with Server Components for reads and Server
  Actions for writes. One repository, one deployment.
- **Rejected:** An Express API plus a React SPA. That is the stack I would
  normally reach for, but it doubles the deployment surface and makes the
  "permissions must be enforced on the server" requirement something I have to
  prove twice.
- **Why:** Every mutation already runs on the server, so the rule checks live in
  the same functions that write the data. There is no client-side filtering to
  accidentally rely on.

## Decision 2 — libSQL/Turso instead of Postgres

- **Chose:** SQLite-compatible libSQL through `@libsql/client`, a local file in
  development and Turso in production.
- **Rejected:** Postgres on Supabase with Prisma. This was my first choice and I
  started down that road.
- **Why:** The same driver and the same schema work locally and in production,
  with no Docker and no external service needed to run the app on my machine.
  Turso's free tier is enough for a demo and the connection is a URL plus token,
  which is easy to keep in environment variables.
- **Later reversed:** I originally planned **Prisma + Postgres** and had written
  the first schema that way. The problem was that local development needed a
  database service before I could test anything, and the deploy story then had
  two providers to keep in sync. I switched to Drizzle + libSQL so that
  `file:./dev.db` and Turso share one dialect and one migration path. The cost
  was losing Prisma's generated client and its migration tooling; Drizzle's
  `push` covered it.

## Decision 3 — Server-side sessions in a table, not stateless JWTs

- **Chose:** A random token in an `httpOnly` cookie, with a `sessions` row that
  holds the user and an expiry.
- **Rejected:** Signed JWTs in a cookie.
- **Why:** Logout and revocation are trivial (delete the row), and the session
  lookup is one indexed query. A JWT would avoid that query but make "sign out
  everywhere" and expiry changes harder than they need to be here.

## Decision 4 — Revisions as their own table

- **Chose:** `revisions` rows that carry their own status and only overwrite
  `articles` when the revision reaches Published.
- **Rejected:** Versioning articles by inserting a new article row per revision,
  or keeping a `previous_body` column.
- **Why:** A revision has its own review path. Giving it its own row and status
  means the same state machine rules apply to it without pretending it is a new
  article. The article keeps serving the live content while the revision is in
  review, which is exactly what the brief asks for.

## Decision 5 — Append-only events table for the timeline

- **Chose:** `article_events` with no update or delete path in the application.
  Comments are events too, with `type = 'comment'`.
- **Rejected:** A `comments` table plus audit columns on `articles`
  (`created_by`, `approved_by`, etc.).
- **Why:** The brief requires one timeline that cannot be rewritten. One table
  with one insert-only path is the simplest way to make that true by
  construction. Audit columns on `articles` would only hold the latest value and
  would be overwritten.

## Decision 6 — Overdue alerts as a timestamp on the article

- **Chose:** `articles.alert_dismissed_at`, cleared every time the article is
  scheduled.
- **Rejected:** A separate `alerts` table with one row per scheduling attempt.
- **Why:** The rule is "dismissed until it is scheduled again with a new time
  that also passes". Clearing one nullable column on scheduling expresses that
  exactly, and the overdue list stays a single indexed query. A separate table
  would have been more flexible (history of alerts) but nothing in the brief
  needs that history.

## Decision 7 — Turn off Cache Components

- **Chose:** `cacheComponents: false` in `next.config.ts`.
- **Rejected:** The Next.js 16 scaffold default (`cacheComponents: true`) with
  Suspense boundaries around every dynamic read.
- **Why:** Every page in this app reads the session cookie and the database per
  request. The static-shell model would have added Suspense plumbing around
  nearly every component for no user-visible benefit, and the production build
  failed on the first dynamic route. This is a small reversal of the scaffold's
  default, made after seeing the build error rather than before.
