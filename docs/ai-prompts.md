# AI prompts

I used an AI coding agent (OpenCode) throughout. This is the log of what I
actually asked it to do, in order, grouped by task. I reviewed the output by
reading it, running `tsc --noEmit` and `next build`, and exercising the app in a
browser; the "what went wrong" section records the places where the first output
was wrong and what I changed.

## Understanding the assignment

1. "mujhe ek project bnana hai" — starting point, no context.
2. The full assignment email, then the ZIP contents: "ye files bhi attech thi
   email ke sath" with the seven files.
3. "main bhej rha hu jo mujhe bnane ke liye beja h wo tum dekh lo uske hisab se
   kya kya use hoga" — asked for a requirement breakdown before any code.

The useful output here was the table mapping the ten goals to difficulty and the
observation that goal 4 (lifecycle + revisions) and goal 10 (alert re-arming)
were the two places where a naive implementation would fail the brief.

## Choosing the stack

4. "Aap decide karo" — after I was offered Next.js, Express + EJS, or "you
   decide".

The agent proposed Next.js + Prisma + Supabase + Vercel. I kept Next.js and
Vercel but replaced Prisma/Supabase with Drizzle + libSQL/Turso so local
development needed no external service. That is recorded as Decision 2.

## Building

5. "Ab core code likhta hoon" was my instruction to proceed after the schema was
   agreed. The agent then generated, in this order: `lib/db/schema.ts`,
   `lib/auth.ts`, `lib/lifecycle.ts`, `lib/permissions.ts`, `lib/queries.ts`, the
   server actions, then the pages and components.
6. "Ab server actions — yahi permission enforcement ka core hai" — I asked for
   the write path to be centralised rather than spread across pages.
7. "Ab Drizzle config + seed script" — asked for enough demo data to make the
   dashboard and alerts look real, including an overdue article and an open
   revision.

## What went wrong, and what I did about it

- **A stray query inside `createArticle`.** The first version of the action
  contained a pointless `db.select().from(articles).limit(0)` and a dynamic
  `await import()` of the schema before the real section lookup. It would have
  run but made no sense. I removed both and imported `sections` at the top of
  the file.
- **A name collision the compiler caught.** The article page imported the
  `openRevision` server action and also declared `const openRevision =
  revisions.find(...)`. The local variable shadowed the action, so the form got
  `undefined` as its action. `tsc` reported `Type 'undefined' is not assignable
  to type '(state, formData) => Promise<ActionState>'`. I renamed the local
  variable to `pendingRevision`.
- **Cache Components broke the production build.** The scaffold enabled
  `cacheComponents: true`; `next build` failed on `/alerts` with "uncached or
  runtime data during prerendering". I first tried to keep it and add Suspense,
  then decided the app is session-scoped on every page and turned the feature
  off. Recorded as Decision 7.
- **Duplicate seed insert.** The first seed script inserted revisions twice
  (once before events, once after), which would have failed on the primary key.
  I removed the second block.
- **Malformed template strings.** Two helpers were generated with unbalanced
  parentheses in template literals. They were caught by reading the file and
  fixed before running anything.

## Documentation

8. "Ab documentation likhta hoon (ye submission ka bada hissa hai)" — the agent
   drafted `docs/architecture.md`, `schema.md`, `plan.md`, `decisions.md` and
   this file from the code that exists, and I corrected the claims that did not
   match the implementation (for example, it initially described Prisma
   migrations, which are not in the repository).

## Honest note

The code was generated with AI assistance and then reviewed, type-checked and
run. I can explain every file in this repository: the state machine in
`lib/lifecycle.ts`, the permission checks in `lib/permissions.ts` and
`lib/actions/*`, the revision model in `lib/db/schema.ts`, and why the bulk
action calls the same `performTransition` function as the single-article action.
