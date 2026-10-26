# Architecture

## The moving pieces

There are three:

1. **The Next.js application** (App Router). It renders every page on the server
   and owns all business rules. There is no separate API server; mutations are
   React Server Actions that run in the same process.
2. **A libSQL database** (a SQLite file in development, a Turso database in
   production). All state lives here: users, sessions, sections, assignments,
   articles, revisions and the append-only event log.
3. **The browser**. It renders the HTML it is given and posts forms back. It is
   never trusted to decide what a user may do.

How they talk:

- Browser → Next.js: normal HTTP requests and form POSTs (server actions).
  The only client-side JavaScript is for the small interactive pieces: the
  article table's selection and the forms' pending/error states.
- Next.js → libSQL: `@libsql/client` over a local file in development and over
  HTTPS to Turso in production. Drizzle ORM builds the SQL.
- Sessions: the browser holds one `httpOnly` cookie. The cookie value is a
  random token; the `sessions` table maps it to a user and an expiry.

## Where each piece runs

| Piece | Development | Production |
|-------|-------------|------------|
| Next.js | `next dev` on the laptop | Vercel (serverless functions) |
| Database | `file:./dev.db` | Turso (managed libSQL) |
| Session store | same database | same database |

## Request path for one representative action

**An editor approves an article that is In Review.**

1. The article page is a Server Component. It has already checked the session
   cookie, loaded the article and rendered an "Approve" form whose `action` is
   the `articleTransition` server action.
2. The editor submits the form. React posts the form data to the server; the
   `articleTransition` function runs on the server.
3. `requireUser()` reads the cookie, looks up the session row, rejects expired
   sessions and returns the user.
4. The action loads the article and checks that this user can see its section.
5. `canApproveArticle()` rejects the request if the user is not an editor, or if
   they are the article's author. This is the same rule the UI used to decide
   whether to show the button, but it is enforced again here.
6. `transitionError()` checks the state machine: `in_review → approved` is
   allowed; anything else is rejected with a message that explains why.
7. Two writes happen: `articles.status` becomes `approved`, and a row is
   appended to `article_events` recording the old status, the new status and the
   actor.
8. `revalidatePath("/", "layout")` marks the cached page tree stale, so the
   response carries fresh data for the article page and the navigation badge.
9. The browser re-renders with the new status. No client-side filtering or
   permission logic was involved.

## What I decided not to build

- **Automatic publishing at the scheduled time.** The brief treats a passed
  publish time as an *overdue alert*, not as an automatic transition, so an
  editor stays in control. A cron job would have added a second deployment and
  a second place where the state machine runs.
- **A separate REST API.** Server actions give the same server-side enforcement
  with fewer moving parts. The trade-off is that the app is not a public API;
  that was not asked for.
- **Rich text / attachments.** Articles are plain text. The lifecycle and audit
  trail were the point, not the editor widget.
- **Email or push notifications.** The alerts area and nav badge cover the
  "nobody noticed" problem described in the brief.
- **Per-passage comments, diffs, public preview links, tagging, payment
  tracking.** These are the brief's optional stretch items; I stopped at the
  ten required goals so that they would be solid rather than half-done.
