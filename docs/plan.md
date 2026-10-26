# Plan

## How I split the work

I planned five sessions of roughly two hours, with the documentation written as
I went rather than at the end.

| Session | Goal | Estimated | Actual |
|---------|------|-----------|--------|
| 1 | Read the brief, choose the stack, scaffold the app, design the schema, seed data | 2h | ~2.5h |
| 2 | Auth, sessions, roles, sections and writer assignments | 2h | ~2h |
| 3 | Article lifecycle, revisions, comments, timeline | 3h | ~3.5h |
| 4 | Server-side list/filter/sort/pagination, bulk actions, CSV, dashboard, alerts | 3h | ~3h |
| 5 | Deploy, seed production, write docs and submission | 2h | ~2h |

I front-loaded the schema because every later goal depends on it. The lifecycle
came next because it is the hardest rule set and the one most likely to reveal a
schema mistake.

## Order and why

1. **Schema first.** Sections, assignments, articles, revisions and events. I
   wrote the relationships before any screen so that the permission checks had
   something concrete to check.
2. **Auth second.** Every action needs a user. Doing it early meant later pages
   never had a "temporary" unauthenticated path.
3. **Lifecycle third.** One module (`lib/lifecycle.ts`) plus one transition
   function used by both single and bulk actions. This was the main design bet:
   if bulk actions called a different code path, goal 7 would have drifted from
   goal 4.
4. **Lists and dashboard fourth.** These are read-only once the write rules are
   correct, so they were lower risk and could be built quickly.
5. **Alerts last among features.** They depend on scheduling already working.
6. **Deployment and docs last.** Deployment exposed environment issues that were
   easier to fix once the app was complete.

## What I cut when time ran short

- **Scheduling a revision.** Revisions can be published immediately but cannot
  be scheduled. The brief only requires that a revision reaches Published before
  it replaces live content, so this is compliant, but it is a real limitation.
- **Editing a revision after it is approved.** Draft and in-review revisions can
  be edited; approved ones cannot, because editing approved content would need
  the same "send back to review" rule as articles. I chose not to duplicate that
  rule for revisions in the time available.
- **Full content versioning.** The timeline records status changes and revision
  events, not a diff of every body edit. A visual diff was a stretch goal.
- **All stretch goals.** None were attempted; the ten required goals came first.

## What I would do with another session

Add automated tests around the state machine and permissions (the two places
where a regression would be silent), then a proper revision history with content
snapshots, then FTS5 search.
