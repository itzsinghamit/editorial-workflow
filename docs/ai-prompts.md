# AI prompts

I used an AI coding agent (OpenCode) for the whole build. Below are the prompts I
actually typed, in the order I typed them, grouped by what I was trying to get
done. For each group: what I asked, what came back, and what I had to fix.

The check was the same every time: read the diff, `npx tsc --noEmit`,
`npm run lint`, `npm run build`, then click through the page in a browser.

## Understanding the assignment

### Prompt

`mujhe ek project bnana hai`

Then the assignment email, then the zip: `ye files bhi attech thi email ke sath`.

### What I got

A breakdown of the ten goals before any code, with a rough difficulty per goal
and a note that goal 4 (lifecycle plus revisions) and goal 10 (alert re-arming)
are where a naive build fails the brief.

### What I corrected

Nothing in the output, but I used that order to plan the sessions in
`docs/plan.md`. The one requirement I nearly missed is in goal 5: "one list of
every article they have written". It is the reason writers have a **My
articles** link in the sidebar instead of having to find the author filter.

## Choosing the stack

### Prompt

`Aap decide karo`, after I was offered Next.js, Express + EJS, or "you decide".

### What I got

Next.js + Prisma + Supabase + Vercel.

### What I corrected

I kept Next.js and Vercel and replaced Prisma/Supabase with Drizzle + libSQL
(Turso in production) so that local development needs no external service.
Written up as Decision 2, including the fact that I had already started on the
Prisma schema before switching.

## Schema, sessions and the rules

### Prompt

`Ab core code likhta hoon`, meaning: go ahead now that the schema was agreed.

### What I got

`lib/db/schema.ts`, `lib/auth.ts`, `lib/lifecycle.ts`, `lib/permissions.ts`.

### What I corrected

Nothing in this step needed a fix. The schema rewrite for SQLite is part of the
stack change above: the first draft was Prisma-shaped, and the second uses text
enums, integer timestamps and composite primary keys that SQLite and Turso both
accept.

## Server actions, the write path

### Prompt

`Ab server actions — yahi permission enforcement ka core hai`

### What I got

`lib/actions/articles.ts` and `lib/actions/sections.ts`, with one
`performTransition()` used by both the single-article actions and the bulk
action.

### What I corrected

Two things in `createArticle`. The first version contained a pointless
`db.select().from(articles).limit(0)` and a dynamic `await import()` of the
schema before the real section lookup. It would have run, but it made no sense,
so both came out and `sections` is imported at the top of the file.

The second was a name collision the compiler caught: the article page imported
the `openRevision` action and also declared `const openRevision =
revisions.find(...)`. The local variable shadowed the action, so the form got
`undefined` as its action. `tsc` reported `Type 'undefined' is not assignable to
type '(state, formData) => Promise<ActionState>'`; I renamed the local variable
to `pendingRevision`.

## Demo data

### Prompt

`Ab Drizzle config + seed script`

### What I got

`drizzle.config.ts` and `scripts/seed.ts`: four users, four sections (one
archived), seventeen articles across every status, comments, an overdue article
and one published article with an open revision.

### What I corrected

The first seed inserted the revision twice, once before the events and once
after, which would have failed on the primary key. I removed the second block.
Two helpers also came back with unbalanced parentheses inside template strings;
reading the file caught them before anything ran.

## Pages and components

### Prompt

The same `Ab core code likhta hoon` instruction, continued: pages and components
once the actions existed.

### What I got

The App Router pages under `app/(app)/`, plus `ArticleTable`, `StateForm`,
`WeeklyChart` and the login form.

### What I corrected

Nothing structural. The list, filters and pagination were built in
`lib/queries.ts` as SQL from the start, so the only client-side JavaScript is the
table selection, the forms' pending/error state and the nav highlight.

## Production build and deployment

### Prompt

`Aap khud kar do (token se)`: deploy it to Vercel using the account I was already
logged into, with Turso as the production database.

### What I got

The deployment steps and the commands, not code.

### What I corrected

Three failures, all recorded in `docs/plan.md`:

- `next build` failed on `/alerts` with "uncached or runtime data during
  prerendering" because the Next 16 scaffold enables Cache Components and every
  page here reads the session cookie. I tried adding Suspense boundaries first,
  then turned the flag off (Decision 7).
- The first Turso token I pasted was a few characters short, so every query
  returned 401. I re-copied the full token from the dashboard.
- The Vercel project was created from the CLI, so `git push` does not deploy.
  Every release is `vercel --prod`.

## Documentation

### Prompt

`Ab documentation likhta hoon (ye submission ka bada hissa hai)`

### What I got

Drafts of the five files under `docs/` plus `SUBMISSION.md`, written from the
code that exists.

### What I corrected

The drafts described Prisma migrations, which are not in the repository. Claims
that did not match the implementation came out, and the files were checked
against the actual routes, actions and tables.

## Honest note

The code was generated with AI assistance and then reviewed, type-checked, built
and clicked through. I can explain every file: the state machine in
`lib/lifecycle.ts`, the checks in `lib/permissions.ts`, the revision model in
`lib/db/schema.ts`, and why the bulk action calls the same `performTransition`
as the single-article action.
