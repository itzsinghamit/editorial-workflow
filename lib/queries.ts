import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ARTICLE_STATUSES,
  articles,
  articleEvents,
  revisions,
  sectionWriters,
  sections,
  users,
  type ArticleStatus,
  type User,
} from "@/lib/db/schema";
import { addDays, startOfWeek } from "@/lib/format";

export const PAGE_SIZE = 10;

export async function getAssignedSectionIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ sectionId: sectionWriters.sectionId })
    .from(sectionWriters)
    .where(eq(sectionWriters.userId, userId));
  return rows.map((r) => r.sectionId);
}

/**
 * Returns `null` for editors (every section) and the assigned ids for writers.
 * Every list query funnels through this so a writer cannot widen their scope
 * by editing a query string.
 */
export async function getVisibleSectionIds(user: User): Promise<string[] | null> {
  if (user.role === "editor") return null;
  return getAssignedSectionIds(user.id);
}

export async function scopeCondition(user: User): Promise<SQL | undefined> {
  const ids = await getVisibleSectionIds(user);
  if (ids === null) return undefined;
  if (ids.length === 0) return sql`0 = 1`;
  return inArray(articles.sectionId, ids);
}

export type ArticleFilters = {
  q?: string;
  sectionId?: string;
  status?: string;
  authorId?: string;
  sort?: string;
  page?: number;
};

const STATUS_ORDER = sql`case ${articles.status}
  when 'draft' then 0
  when 'in_review' then 1
  when 'approved' then 2
  when 'scheduled' then 3
  when 'published' then 4
  else 5 end`;

function buildFilters(filters: ArticleFilters, scope: SQL | undefined) {
  const conds: (SQL | undefined)[] = [scope];

  if (filters.sectionId) conds.push(eq(articles.sectionId, filters.sectionId));
  if (
    filters.status &&
    (ARTICLE_STATUSES as readonly string[]).includes(filters.status)
  ) {
    conds.push(eq(articles.status, filters.status as ArticleStatus));
  }
  if (filters.authorId) conds.push(eq(articles.authorId, filters.authorId));

  const term = filters.q?.trim().replace(/[%_]/g, "");
  if (term) {
    conds.push(
      or(like(articles.title, `%${term}%`), like(articles.body, `%${term}%`)),
    );
  }

  return and(...conds);
}

export async function listArticles(user: User, filters: ArticleFilters) {
  const scope = await scopeCondition(user);
  const where = buildFilters(filters, scope);
  const page = Math.max(1, filters.page ?? 1);

  const sort = filters.sort ?? "updated";
  const orderBy =
    sort === "status"
      ? [asc(STATUS_ORDER), desc(articles.updatedAt)]
      : sort === "publish"
        ? [desc(sql`coalesce(${articles.publishAt}, 0)`), desc(articles.updatedAt)]
        : [desc(articles.updatedAt)];

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        status: articles.status,
        publishAt: articles.publishAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        sectionId: articles.sectionId,
        sectionName: sections.name,
        authorId: articles.authorId,
        authorName: users.name,
      })
      .from(articles)
      .innerJoin(sections, eq(articles.sectionId, sections.id))
      .innerJoin(users, eq(articles.authorId, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .innerJoin(sections, eq(articles.sectionId, sections.id))
      .where(where),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  return {
    rows,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function listFilterOptions(user: User) {
  const [sectionRows, authorRows] = await Promise.all([
    listSections(user, true),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .orderBy(asc(users.name)),
  ]);
  return { sections: sectionRows, authors: authorRows };
}

export async function getArticleDetail(user: User, id: string) {
  const rows = await db
    .select({ article: articles, section: sections, author: users })
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .innerJoin(users, eq(articles.authorId, users.id))
    .where(eq(articles.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (user.role === "writer") {
    const assigned = await getAssignedSectionIds(user.id);
    if (!assigned.includes(row.article.sectionId)) return null;
  }

  const [revisionRows, eventRows] = await Promise.all([
    db
      .select({ revision: revisions, author: users })
      .from(revisions)
      .innerJoin(users, eq(revisions.authorId, users.id))
      .where(eq(revisions.articleId, id))
      .orderBy(desc(revisions.createdAt)),
    db
      .select({ event: articleEvents, actor: users })
      .from(articleEvents)
      .innerJoin(users, eq(articleEvents.actorId, users.id))
      .where(eq(articleEvents.articleId, id))
      .orderBy(asc(articleEvents.createdAt)),
  ]);

  return { ...row, revisions: revisionRows, events: eventRows };
}

export async function listSections(user: User, includeArchived = false) {
  const scope =
    user.role === "editor"
      ? undefined
      : inArray(
          sections.id,
          db
            .select({ id: sectionWriters.sectionId })
            .from(sectionWriters)
            .where(eq(sectionWriters.userId, user.id)),
        );

  const where = includeArchived
    ? scope
    : and(scope, isNull(sections.archivedAt));

  return db
    .select({
      id: sections.id,
      name: sections.name,
      description: sections.description,
      archivedAt: sections.archivedAt,
      ownerName: users.name,
      writerCount: sql<number>`(select count(*) from section_writers sw where sw.section_id = ${sections.id})`,
      articleCount: sql<number>`(select count(*) from articles a where a.section_id = ${sections.id})`,
    })
    .from(sections)
    .innerJoin(users, eq(sections.ownerEditorId, users.id))
    .where(where)
    .orderBy(asc(sections.name));
}

export async function getSectionDetail(user: User, id: string) {
  const rows = await db
    .select({ section: sections, owner: users })
    .from(sections)
    .innerJoin(users, eq(sections.ownerEditorId, users.id))
    .where(eq(sections.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (user.role === "writer") {
    const assigned = await getAssignedSectionIds(user.id);
    if (!assigned.includes(id)) return null;
  }

  const [writerRows, articleRows] = await Promise.all([
    db
      .select({ user: users })
      .from(sectionWriters)
      .innerJoin(users, eq(sectionWriters.userId, users.id))
      .where(eq(sectionWriters.sectionId, id))
      .orderBy(asc(users.name)),
    db
      .select({
        id: articles.id,
        title: articles.title,
        status: articles.status,
        publishAt: articles.publishAt,
        updatedAt: articles.updatedAt,
        authorName: users.name,
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .where(eq(articles.sectionId, id))
      .orderBy(desc(articles.updatedAt)),
  ]);

  return { ...row, writers: writerRows.map((w) => w.user), articles: articleRows };
}

export async function listWriters() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "writer"))
    .orderBy(asc(users.name));
}

export async function listEditors() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "editor"))
    .orderBy(asc(users.name));
}

async function countWhere(where: SQL | undefined): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(where);
  return Number(rows[0]?.count ?? 0);
}

export async function getDashboard(user: User) {
  const scope = await scopeCondition(user);
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);
  const eightWeeksAgo = addDays(weekStart, -7 * 7);

  const [inReview, scheduledThisWeek, publishedThisWeek, openDrafts] =
    await Promise.all([
      countWhere(and(scope, eq(articles.status, "in_review"))),
      countWhere(
        and(
          scope,
          eq(articles.status, "scheduled"),
          gte(articles.publishAt, weekStart),
          lte(articles.publishAt, weekEnd),
        ),
      ),
      countWhere(
        and(
          scope,
          eq(articles.status, "published"),
          gte(articles.publishAt, weekStart),
        ),
      ),
      countWhere(and(scope, eq(articles.status, "draft"))),
    ]);

  const [byStatusRows, bySectionRows, recentRows, publishedRows] =
    await Promise.all([
      db
        .select({ status: articles.status, count: sql<number>`count(*)` })
        .from(articles)
        .where(scope)
        .groupBy(articles.status),
      db
        .select({
          sectionId: sections.id,
          sectionName: sections.name,
          count: sql<number>`count(*)`,
        })
        .from(articles)
        .innerJoin(sections, eq(articles.sectionId, sections.id))
        .where(scope)
        .groupBy(sections.id, sections.name)
        .orderBy(asc(sections.name)),
      db
        .select({
          id: articles.id,
          title: articles.title,
          status: articles.status,
          updatedAt: articles.updatedAt,
          sectionName: sections.name,
          authorName: users.name,
        })
        .from(articles)
        .innerJoin(sections, eq(articles.sectionId, sections.id))
        .innerJoin(users, eq(articles.authorId, users.id))
        .where(scope)
        .orderBy(desc(articles.updatedAt))
        .limit(6),
      db
        .select({ publishAt: articles.publishAt })
        .from(articles)
        .where(
          and(
            scope,
            eq(articles.status, "published"),
            gte(articles.publishAt, eightWeeksAgo),
          ),
        ),
    ]);

  const byStatus = ARTICLE_STATUSES.map((status) => ({
    status,
    count: Number(
      byStatusRows.find((r) => r.status === status)?.count ?? 0,
    ),
  }));

  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = addDays(weekStart, -7 * (7 - index));
    const end = addDays(start, 7);
    const count = publishedRows.filter((row) => {
      if (!row.publishAt) return false;
      return row.publishAt >= start && row.publishAt < end;
    }).length;
    return { start, end, count };
  });

  return {
    inReview,
    scheduledThisWeek,
    publishedThisWeek,
    openDrafts,
    byStatus,
    bySection: bySectionRows.map((r) => ({
      ...r,
      count: Number(r.count),
    })),
    weeks,
    recent: recentRows,
  };
}

export async function listOverdue(user: User) {
  const scope = await scopeCondition(user);
  return db
    .select({
      id: articles.id,
      title: articles.title,
      publishAt: articles.publishAt,
      sectionName: sections.name,
      authorName: users.name,
    })
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .innerJoin(users, eq(articles.authorId, users.id))
    .where(
      and(
        scope,
        eq(articles.status, "scheduled"),
        lte(articles.publishAt, new Date()),
        isNull(articles.alertDismissedAt),
      ),
    )
    .orderBy(asc(articles.publishAt));
}

export async function countOverdue(user: User): Promise<number> {
  const scope = await scopeCondition(user);
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(
      and(
        scope,
        eq(articles.status, "scheduled"),
        lte(articles.publishAt, new Date()),
        isNull(articles.alertDismissedAt),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

export async function listCalendar(user: User) {
  const scope = await scopeCondition(user);
  return db
    .select({
      id: articles.id,
      title: articles.title,
      status: articles.status,
      publishAt: articles.publishAt,
      sectionName: sections.name,
      authorName: users.name,
    })
    .from(articles)
    .innerJoin(sections, eq(articles.sectionId, sections.id))
    .innerJoin(users, eq(articles.authorId, users.id))
    .where(
      and(
        scope,
        inArray(articles.status, ["scheduled", "published"]),
        gte(articles.publishAt, new Date(0)),
      ),
    )
    .orderBy(asc(articles.publishAt));
}
