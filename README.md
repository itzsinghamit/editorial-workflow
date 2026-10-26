# Editorial Workflow

Newsroom tool for the take-home brief in [`docs/assignment.md`](docs/assignment.md).

Writers draft in the sections they are assigned to. An editor who did not write
the piece signs it off. Once an article is published it stops being editable,
and every move (submit, approve, schedule, publish, unpublish, comment, open a
revision) leaves a row in an append-only log that nobody can rewrite, me
included.

## What it does

- **Roles enforced on the server.** Editors and writers. Every server action
  re-checks the session and the rules; the UI only decides what to render.
- **Sections.** Create, edit, archive and restore. Archived sections disappear
  from default views but keep their articles and assignments.
- **Article lifecycle.** Draft → In Review → Approved → Scheduled → Published.
  The author can never approve their own work. Illegal moves are rejected with a
  message that says why.
- **Revisions.** A published article's content is immutable; opening a revision
  starts a second draft with its own review path and only replaces the live
  content when the revision reaches Published.
- **Assignments.** Writers can be assigned to any number of sections; only
  editors manage assignments. Writers see only their sections.
- **Server-side browsing.** Search, section/status/author filters, sorting and
  pagination all run in SQL. Nothing is filtered in the browser.
- **Bulk actions.** Schedule or unpublish many articles at once with a
  per-article success/rejection report, plus a CSV export of the editorial
  calendar.
- **Dashboard.** In review, scheduled this week, published this week, open
  drafts, breakdowns by status and section, and an eight-week publishing chart.
- **Immutable timeline.** Creation, every status change (old → new, who), every
  revision and every comment. The app has no update or delete path for events.
- **Overdue alerts.** A scheduled article whose time has passed shows in the
  alerts area and as a nav badge. Editors can dismiss it; scheduling again
  re-arms it.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router, Server Components + Server Actions) | One deploy, all rules on the server |
| Language | TypeScript | Types caught two real bugs during the build |
| Database | libSQL — SQLite file locally, Turso in production | Same driver and schema in both places |
| ORM | Drizzle | Typed SQL, simple `push` migrations |
| Styling | Tailwind CSS 4 | Fast, no component library to explain |
| Auth | Cookie session + `sessions` table, scrypt password hashing | Revocable sessions, no native dependency |
| Hosting | Vercel + Turso | Free tiers, environment variables only |

## Run it locally

```bash
npm install
cp .env.example .env.local        # DATABASE_URL=file:./dev.db
npm run db:push                   # create the SQLite schema
npm run db:seed                   # demo users, sections and 18 articles
npm run dev
```

Open http://localhost:3000.

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Editor | `editor@newsroom.test` | `editor123` |
| Editor (second) | `editor2@newsroom.test` | `editor123` |
| Writer | `writer@newsroom.test` | `writer123` |
| Writer (second) | `writer2@newsroom.test` | `writer123` |

Two editors exist on purpose: it is how you can see the self-approval rule and
still complete an approval flow.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply the schema to the configured database |
| `npm run db:seed` | Reset and re-seed demo data |
| `npm run db:studio` | Drizzle Studio |

## Where the rules live

- `lib/lifecycle.ts` — the article state machine and the wording of rejection
  messages.
- `lib/permissions.ts` — who may edit, approve, open a revision or manage
  sections.
- `lib/actions/articles.ts` — `performTransition()` is used by both the single
  article actions and the bulk action, so the two cannot drift.
- `lib/queries.ts` — every read is scoped by the viewer's visible sections.

## Deployment

This one is deployed from the CLI rather than from a GitHub integration, so a
push to `main` does not deploy by itself. Every release is `vercel --prod`.

1. Create the Turso database and take its URL and token.
2. Put both in `.env.local`, then run `npm run db:push` and `npm run db:seed`
   against it.
3. `vercel link` once, then add `DATABASE_URL` and `DATABASE_AUTH_TOKEN` as
   environment variables for Production and Preview.
4. `vercel --prod`.

`.env*` files are git-ignored; only `.env.example` is committed.

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/schema.md`](docs/schema.md)
- [`docs/plan.md`](docs/plan.md)
- [`docs/decisions.md`](docs/decisions.md)
- [`docs/ai-prompts.md`](docs/ai-prompts.md)

## On AI

I used an AI coding agent for most of the first drafts and worked through it file
by file rather than one big prompt. `docs/ai-prompts.md` is the log, including
the prompts that produced broken output and what I did about it.

The rule I set for myself: if a reviewer points at a line and asks why it is
there, the answer is either in `docs/` or in the commit that added it. If it is
in neither, that line should not be in the repository.
