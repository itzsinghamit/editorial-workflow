# Submission

## Links

- **GitHub repository:** https://github.com/itzsinghamit/editorial-workflow
- **Live application:** https://editorial-workflow-orcin.vercel.app

## Notes for the reviewer

- The app runs on Vercel with a Turso (libSQL) database. Both are free tiers. If
  the first request is slow, the serverless function is waking up.
- Demo data is seeded: 17 articles across every status, four sections (one
  archived), two editors and two writers, one overdue alert, one published
  article with an open revision, and comments in the timeline.
- Two editor accounts exist so you can see the self-approval rule without
  getting stuck: an editor cannot approve their own article, so use the second
  editor to complete an approval.
- Scheduling a publish time in the past is rejected by design. To see the
  overdue alert, use the seeded article that is already overdue.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Editor | `editor@newsroom.test` | `editor123` |
| Editor (second) | `editor2@newsroom.test` | `editor123` |
| Writer | `writer@newsroom.test` | `writer123` |
| Writer (second) | `writer2@newsroom.test` | `writer123` |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4 | Server-rendered pages with small client islands; one deploy |
| Backend | Next.js Server Actions + Server Components (TypeScript) | All permission and lifecycle checks run on the server |
| Database | libSQL — SQLite file locally, Turso in production; Drizzle ORM | Same dialect and schema in dev and prod, no Docker |
| Hosting | Vercel (app) + Turso (database) | Free tiers, secrets in environment variables |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Cookie sessions in a table; editor/writer rules checked in every server action, not just hidden in the UI. |
| 2 | Sections | Done | Create, edit, archive, restore. Archived sections are hidden from default views and keep their data. |
| 3 | Articles inside sections | Done | Every article has one section, a title, a body and an author. Writers can only create in assigned sections. |
| 4 | Article lifecycle with rules | Done | Full state machine, self-approval blocked, editing approved/scheduled returns to review, published content immutable, revisions with their own path. Revision scheduling is the one thing I left out (revisions publish immediately). |
| 5 | Section assignments | Done | Many-to-many assignments managed by editors; writers get their own section and article lists. |
| 6 | Finding articles | Done | Search over title/body, section/status/author filters, three sorts and pagination all run in SQL; the total count is returned. |
| 7 | Acting on many articles at once | Done | Bulk schedule/unpublish returns a per-article result with reasons; calendar CSV export. |
| 8 | Dashboard | Done | Four headline numbers, status and section breakdowns, eight-week published-per-week chart. |
| 9 | History you cannot rewrite | Done | Append-only `article_events`: creation, status changes with old/new status and actor, revisions, comments. No update/delete path in the app. |
| 10 | Overdue publish alerts | Done | Overdue list plus nav badge, editor-only dismiss, and the alert re-arms when the article is scheduled again. Verified end to end. |

## How much time did you actually spend?

Roughly 10–11 hours across two days: schema and setup (~2.5h), auth and
sections (~2h), lifecycle and revisions (~3.5h), lists/bulk/dashboard/alerts
(~3h), deployment and documentation (~2h).

## What would you do next, with another 12 hours?

1. Tests around the state machine and permission matrix — those are the two
   places where a silent regression would be worst.
2. Content snapshots for every revision and a visual diff between two of them.
3. Full-text search (SQLite FTS5) and keyset pagination, the first two things
   that would break at 100x the data.
4. Scheduling a revision, so a correction can be planned rather than published
   immediately.
5. A public preview link for articles awaiting approval.

## What are you least happy with in this codebase, and why?

The revision rules are slightly thinner than the article rules: a revision can
be edited while it is a draft or in review, but once approved it cannot be sent
back to review by editing it, because I did not duplicate the article's
"editing approved content returns it to review" rule for revisions. It is a
deliberate scope cut, but it is the first inconsistency a reviewer would find.

The second is the absence of automated tests. The build, typecheck and manual
browser pass cover the happy paths, but the illegal transitions are only
verified by hand.
