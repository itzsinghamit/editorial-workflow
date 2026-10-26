import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const USER_ROLES = ["editor", "writer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * The article lifecycle. Every transition is validated in lib/lifecycle.ts and
 * never in the UI alone.
 */
export const ARTICLE_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const EVENT_TYPES = [
  "created",
  "status_changed",
  "revision_opened",
  "revision_published",
  "comment",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: USER_ROLES }).notNull(),
  createdAt: timestamps.createdAt,
});

export const sessions = sqliteTable(
  "sessions",
  {
    // The session id is the raw token stored in the httpOnly cookie.
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ownerEditorId: text("owner_editor_id")
    .notNull()
    .references(() => users.id),
  // Soft delete: archived sections keep their articles and assignments.
  archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

/**
 * Many-to-many: writers <-> sections. Editors are not stored here; they can
 * see every section.
 */
export const sectionWriters = sqliteTable(
  "section_writers",
  {
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.sectionId, table.userId] }),
    index("section_writers_user_idx").on(table.userId),
  ],
);

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ARTICLE_STATUSES })
      .notNull()
      .default("draft"),
    publishAt: integer("publish_at", { mode: "timestamp_ms" }),
    // Set when an editor dismisses the overdue alert. Cleared on every new
    // scheduling so the alert can come back (goal 10).
    alertDismissedAt: integer("alert_dismissed_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("articles_section_idx").on(table.sectionId),
    index("articles_author_idx").on(table.authorId),
    index("articles_status_idx").on(table.status),
    index("articles_publish_at_idx").on(table.publishAt),
    index("articles_updated_idx").on(table.updatedAt),
  ],
);

/**
 * A revision is a separate draft of an already-published article. It carries
 * its own lifecycle and only overwrites `articles` once it reaches published.
 */
export const revisions = sqliteTable(
  "revisions",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ARTICLE_STATUSES })
      .notNull()
      .default("draft"),
    ...timestamps,
  },
  (table) => [
    index("revisions_article_idx").on(table.articleId),
    index("revisions_status_idx").on(table.status),
  ],
);

/**
 * Append-only audit trail. The application never issues UPDATE or DELETE
 * against this table.
 */
export const articleEvents = sqliteTable(
  "article_events",
  {
    id: text("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    type: text("type", { enum: EVENT_TYPES }).notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    fromStatus: text("from_status", { enum: ARTICLE_STATUSES }),
    toStatus: text("to_status", { enum: ARTICLE_STATUSES }),
    revisionId: text("revision_id").references(() => revisions.id),
    // Used for comment bodies and human readable explanations.
    message: text("message"),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index("article_events_article_idx").on(table.articleId, table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
  ownedSections: many(sections),
  assignments: many(sectionWriters),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  owner: one(users, {
    fields: [sections.ownerEditorId],
    references: [users.id],
  }),
  articles: many(articles),
  writers: many(sectionWriters),
}));

export const sectionWritersRelations = relations(sectionWriters, ({ one }) => ({
  section: one(sections, {
    fields: [sectionWriters.sectionId],
    references: [sections.id],
  }),
  user: one(users, {
    fields: [sectionWriters.userId],
    references: [users.id],
  }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  section: one(sections, {
    fields: [articles.sectionId],
    references: [sections.id],
  }),
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  revisions: many(revisions),
  events: many(articleEvents),
}));

export const revisionsRelations = relations(revisions, ({ one }) => ({
  article: one(articles, {
    fields: [revisions.articleId],
    references: [articles.id],
  }),
  author: one(users, {
    fields: [revisions.authorId],
    references: [users.id],
  }),
}));

export const articleEventsRelations = relations(articleEvents, ({ one }) => ({
  article: one(articles, {
    fields: [articleEvents.articleId],
    references: [articles.id],
  }),
  actor: one(users, {
    fields: [articleEvents.actorId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Revision = typeof revisions.$inferSelect;
export type ArticleEvent = typeof articleEvents.$inferSelect;
