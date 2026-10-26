# Schema

The database is SQLite-compatible (libSQL). Timestamps are stored as integers
(milliseconds since the epoch) and surfaced as `Date` objects by Drizzle.

## Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `email` | text, unique, not null | lower-cased on login |
| `name` | text, not null | display name |
| `password_hash` | text, not null | `salt:scrypt-hash`, both hex |
| `role` | text, not null | `editor` or `writer` |
| `created_at` | integer, not null | |

### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | the raw token stored in the cookie |
| `user_id` | text FK → users.id, cascade | |
| `expires_at` | integer, not null | |
| `created_at` | integer, not null | |

Index: `user_id`. Sessions are server-side so a logout can revoke a token.

### `sections`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `name` | text, not null | |
| `description` | text, not null, default `''` | |
| `owner_editor_id` | text FK → users.id, not null | |
| `archived_at` | integer, nullable | soft delete |
| `created_at`, `updated_at` | integer, not null | |

### `section_writers`
| Column | Type | Notes |
|--------|------|-------|
| `section_id` | text FK → sections.id, cascade | part of composite PK |
| `user_id` | text FK → users.id, cascade | part of composite PK |
| `created_at` | integer, not null | |

Index: `user_id`.

### `articles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `section_id` | text FK → sections.id, not null | |
| `author_id` | text FK → users.id, not null | |
| `title` | text, not null | |
| `body` | text, not null | plain text |
| `status` | text, not null, default `draft` | `draft`, `in_review`, `approved`, `scheduled`, `published` |
| `publish_at` | integer, nullable | set on schedule/publish, cleared on unpublish |
| `alert_dismissed_at` | integer, nullable | cleared whenever the article is scheduled |
| `created_at`, `updated_at` | integer, not null | |

Indexes: `section_id`, `author_id`, `status`, `publish_at`, `updated_at`.

### `revisions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `article_id` | text FK → articles.id, cascade | |
| `author_id` | text FK → users.id | who opened it |
| `title`, `body` | text, not null | the proposed replacement |
| `status` | text, not null, default `draft` | same lifecycle vocabulary |
| `created_at`, `updated_at` | integer, not null | |

Indexes: `article_id`, `status`.

### `article_events` (append-only)
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | |
| `article_id` | text FK → articles.id, cascade | |
| `type` | text, not null | `created`, `status_changed`, `revision_opened`, `revision_published`, `comment` |
| `actor_id` | text FK → users.id | |
| `from_status`, `to_status` | text, nullable | set for status changes |
| `revision_id` | text FK → revisions.id, nullable | links revision events |
| `message` | text, nullable | comment body or explanation |
| `created_at` | integer, not null | |

Index: `(article_id, created_at)`.

## Relationships

- user → articles: **one-to-many** (an author writes many articles).
- user → sections (as owner): **one-to-many** (an editor can own several).
- section → articles: **one-to-many** (every article belongs to exactly one).
- user ↔ sections (as writer): **many-to-many**, through `section_writers`.
- article → revisions: **one-to-many**.
- article → events: **one-to-many**.
- event → revision: many-to-one, nullable.

## Constraints: database vs application

In the database: primary keys, foreign keys, `users.email` unique, the
`section_writers` composite key (which also makes double assignment impossible),
not-null columns and indexes. These are invariants that should never be violated,
so the cheapest place to enforce them is the database.

In application code: everything about *who* may do *what* and *when*. Examples:

- "Only an editor may approve, and never their own article." This depends on the
  actor and the row, so it lives in `lib/permissions.ts` and is called from every
  action.
- "`in_review → approved` is legal, `draft → published` is not." This is the
  state machine in `lib/lifecycle.ts`.
- "Editing an approved article sends it back to review." That is a multi-column
  write plus an audit event, not a column constraint.
- "An article can only have one open revision." It could be a partial unique
  index, but SQLite's support for partial indexes with status lists is awkward,
  and the rule is already checked in the action.

I drew the line at: *structural* rules in the database, *workflow* rules in one
module that every action calls. Duplicating workflow rules in SQL triggers would
have made them harder to test and easier to drift from the UI.

## Deliberate denormalisation

`articles` stores the **current** title and body even though `revisions` keeps
older text. That is deliberate: every list, dashboard count and detail page
reads the live article, and a join-to-latest-published-revision on every query
would be more complex for no benefit. The history lives in `article_events`
(who changed what and when) and in the revision rows themselves; the *previous
content* is not versioned in full, which is the main thing I would add next.

There are no stored counters. Dashboard numbers are computed with `count(*)`
and `group by`, because correctness after every lifecycle move matters more than
saving a few milliseconds at this data size.

## What would break first at 100x the data

1. **Search.** `like '%term%'` on `title` and `body` cannot use an index; it is a
   full scan of the visible articles on every request. At 100x, this is the first
   query to become slow. The fix is SQLite FTS5 (or a search service).
2. **Pagination.** The list does a `count(*)` with the same filters plus
   `limit/offset`. Large offsets get slower as the offset grows. Keyset
   pagination on `(updated_at, id)` would fix the page query, though the total
   count would still need a cheaper strategy.
3. **Dashboard.** Several `count(*)` and `group by` queries run per page view.
   At 100x they would want either covering indexes or a small materialised
   summary table updated on each status change.
4. **Timeline.** Events are loaded for an article without a limit. A very busy
   article with thousands of comments would eventually need pagination.
5. **Write contention.** SQLite/libSQL serialises writes. This app is
   editorially low-write, so it is fine, but a 100x increase in concurrent
   writers would push toward Postgres.
