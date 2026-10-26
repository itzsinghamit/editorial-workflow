"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newId, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  articleEvents,
  articles,
  revisions,
  sections,
  type Article,
  type ArticleStatus,
  type EventType,
  type User,
} from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import {
  nextStatus,
  transitionError,
  type ArticleAction,
} from "@/lib/lifecycle";
import {
  canApproveArticle,
  canEditArticleContent,
  isEditor,
  type ActionResult,
  type ActionState,
} from "@/lib/permissions";
import { getAssignedSectionIds } from "@/lib/queries";

const ARTICLE_ACTIONS: ArticleAction[] = [
  "submit",
  "approve",
  "publish",
  "schedule",
  "unpublish",
];

function refresh() {
  // The nav badge and every list read article state, so refresh the whole tree.
  revalidatePath("/", "layout");
}

async function loadArticle(id: string): Promise<Article | null> {
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function canAccessArticle(user: User, article: Article): Promise<boolean> {
  if (isEditor(user)) return true;
  const assigned = await getAssignedSectionIds(user.id);
  return assigned.includes(article.sectionId);
}

async function logEvent(values: {
  articleId: string;
  actorId: string;
  type: EventType;
  fromStatus?: ArticleStatus | null;
  toStatus?: ArticleStatus | null;
  revisionId?: string | null;
  message?: string | null;
}) {
  await db.insert(articleEvents).values({
    id: newId(),
    articleId: values.articleId,
    actorId: values.actorId,
    type: values.type,
    fromStatus: values.fromStatus ?? null,
    toStatus: values.toStatus ?? null,
    revisionId: values.revisionId ?? null,
    message: values.message ?? null,
  });
}

/**
 * One place that applies a lifecycle move. Single and bulk actions both call
 * it, so the rules cannot drift between them.
 */
async function performTransition(
  user: User,
  article: Article,
  action: ArticleAction,
  publishAtInput?: string,
): Promise<{ ok: boolean; message: string }> {
  if (!ARTICLE_ACTIONS.includes(action)) {
    return { ok: false, message: "Unknown action." };
  }

  const ruleError = transitionError(article.status, action);
  if (ruleError) return { ok: false, message: ruleError };

  if (action === "submit" && article.authorId !== user.id && !isEditor(user)) {
    return { ok: false, message: "Only the author can submit this article." };
  }
  if (action === "approve" && !canApproveArticle(user, article)) {
    return {
      ok: false,
      message: isEditor(user)
        ? "You cannot approve your own article."
        : "Only an editor can approve an article.",
    };
  }
  if (
    (action === "publish" || action === "schedule" || action === "unpublish") &&
    !isEditor(user)
  ) {
    return { ok: false, message: "Only an editor can do that." };
  }

  let publishAt: Date | null = article.publishAt;
  let message: string | null = null;

  if (action === "schedule") {
    const date = publishAtInput ? new Date(publishAtInput) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return { ok: false, message: "A valid publish time is required." };
    }
    if (date.getTime() <= Date.now()) {
      return { ok: false, message: "The publish time must be in the future." };
    }
    publishAt = date;
    message = `Scheduled for ${formatDateTime(date)}`;
  } else if (action === "publish") {
    publishAt = new Date();
    message = `Published at ${formatDateTime(publishAt)}`;
  } else if (action === "unpublish") {
    publishAt = null;
    message = "Unpublished back to Approved";
  }

  const toStatus = nextStatus(action);
  const now = new Date();

  await db
    .update(articles)
    .set({
      status: toStatus,
      publishAt,
      // A fresh schedule must be able to raise the overdue alert again.
      alertDismissedAt: action === "schedule" ? null : article.alertDismissedAt,
      updatedAt: now,
    })
    .where(eq(articles.id, article.id));

  await logEvent({
    articleId: article.id,
    actorId: user.id,
    type: "status_changed",
    fromStatus: article.status,
    toStatus,
    message,
  });

  return { ok: true, message: message ?? `Moved to ${toStatus}` };
}

export async function createArticle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const sectionId = String(formData.get("sectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!sectionId || !title || !body) {
    return { ok: false, message: "Section, title and body are all required." };
  }

  const found = await db
    .select()
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  const section = found[0];
  if (!section || section.archivedAt) {
    return { ok: false, message: "That section is not available." };
  }

  if (!isEditor(user)) {
    const assigned = await getAssignedSectionIds(user.id);
    if (!assigned.includes(sectionId)) {
      return {
        ok: false,
        message: "You are not assigned to that section.",
      };
    }
  }

  const id = newId();
  await db.insert(articles).values({
    id,
    sectionId,
    authorId: user.id,
    title,
    body,
    status: "draft",
  });

  await logEvent({
    articleId: id,
    actorId: user.id,
    type: "created",
    toStatus: "draft",
  });

  refresh();
  redirect(`/articles/${id}`);
}

export async function updateArticle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("articleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const article = await loadArticle(id);
  if (!article) return { ok: false, message: "Article not found." };
  if (!(await canAccessArticle(user, article))) {
    return { ok: false, message: "You cannot access this article." };
  }
  if (!canEditArticleContent(user, article)) {
    return {
      ok: false,
      message:
        article.status === "published"
          ? "Published content cannot be edited. Open a revision instead."
          : "You cannot edit this article.",
    };
  }
  if (!title || !body) {
    return { ok: false, message: "Title and body are required." };
  }

  const sentBack = article.status === "approved" || article.status === "scheduled";
  const now = new Date();

  await db
    .update(articles)
    .set({
      title,
      body,
      status: sentBack ? "in_review" : article.status,
      publishAt: sentBack ? null : article.publishAt,
      alertDismissedAt: sentBack ? null : article.alertDismissedAt,
      updatedAt: now,
    })
    .where(eq(articles.id, id));

  if (sentBack) {
    await logEvent({
      articleId: id,
      actorId: user.id,
      type: "status_changed",
      fromStatus: article.status,
      toStatus: "in_review",
      message: "Content edited after approval, so it returned to review.",
    });
  }

  refresh();
  redirect(`/articles/${id}`);
}

export async function articleTransition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("articleId") ?? "");
  const action = String(formData.get("action") ?? "") as ArticleAction;
  const publishAt = String(formData.get("publishAt") ?? "");

  const article = await loadArticle(id);
  if (!article) return { ok: false, message: "Article not found." };
  if (!(await canAccessArticle(user, article))) {
    return { ok: false, message: "You cannot access this article." };
  }

  const result = await performTransition(user, article, action, publishAt);
  if (result.ok) refresh();
  return result;
}

/**
 * Goal 7: a batch never fails as a whole. Each article is attempted and the
 * caller gets a per-article outcome.
 */
export async function bulkTransition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isEditor(user)) {
    return { ok: false, message: "Only an editor can run bulk actions." };
  }

  const action = String(formData.get("action") ?? "") as ArticleAction;
  if (action !== "schedule" && action !== "unpublish") {
    return { ok: false, message: "Unsupported bulk action." };
  }

  const ids = formData
    .getAll("ids")
    .map((value) => String(value))
    .filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one article." };
  }

  const publishAt = String(formData.get("publishAt") ?? "");
  const items: NonNullable<ActionResult["items"]> = [];

  for (const id of ids) {
    const article = await loadArticle(id);
    if (!article) {
      items.push({ id, label: id, ok: false, message: "Article not found." });
      continue;
    }
    const result = await performTransition(user, article, action, publishAt);
    items.push({ id, label: article.title, ...result });
  }

  refresh();
  const succeeded = items.filter((item) => item.ok).length;
  return {
    ok: succeeded > 0,
    message: `${succeeded} of ${items.length} article(s) updated.`,
    items,
  };
}

export async function addComment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const articleId = String(formData.get("articleId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Comment cannot be empty." };

  const article = await loadArticle(articleId);
  if (!article || !(await canAccessArticle(user, article))) {
    return { ok: false, message: "Article not found." };
  }

  await logEvent({
    articleId,
    actorId: user.id,
    type: "comment",
    message: body,
  });

  refresh();
  return { ok: true, message: "Comment added." };
}

export async function dismissAlert(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isEditor(user)) {
    return { ok: false, message: "Only an editor can dismiss alerts." };
  }
  const articleId = String(formData.get("articleId") ?? "");
  const article = await loadArticle(articleId);
  if (!article) return { ok: false, message: "Article not found." };

  await db
    .update(articles)
    .set({ alertDismissedAt: new Date() })
    .where(eq(articles.id, articleId));

  refresh();
  return { ok: true, message: "Alert dismissed." };
}

export async function openRevision(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const articleId = String(formData.get("articleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const article = await loadArticle(articleId);
  if (!article) return { ok: false, message: "Article not found." };
  if (!(await canAccessArticle(user, article))) {
    return { ok: false, message: "You cannot access this article." };
  }
  if (article.authorId !== user.id && !isEditor(user)) {
    return { ok: false, message: "Only the author can open a revision." };
  }
  if (article.status !== "published") {
    return {
      ok: false,
      message: "A revision is only needed for a published article.",
    };
  }
  if (!title || !body) {
    return { ok: false, message: "Title and body are required." };
  }

  const open = await db
    .select({ id: revisions.id })
    .from(revisions)
    .where(
      and(
        eq(revisions.articleId, articleId),
        inArray(revisions.status, ["draft", "in_review", "approved"]),
      ),
    )
    .limit(1);
  if (open[0]) {
    return {
      ok: false,
      message: "This article already has an open revision.",
    };
  }

  const revisionId = newId();
  await db.insert(revisions).values({
    id: revisionId,
    articleId,
    authorId: user.id,
    title,
    body,
    status: "draft",
  });

  await logEvent({
    articleId,
    actorId: user.id,
    type: "revision_opened",
    revisionId,
    toStatus: "draft",
    message: "Revision opened",
  });

  refresh();
  return { ok: true, message: "Revision opened." };
}

export async function updateRevision(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const revisionId = String(formData.get("revisionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  const rows = await db
    .select()
    .from(revisions)
    .where(eq(revisions.id, revisionId))
    .limit(1);
  const revision = rows[0];
  if (!revision) return { ok: false, message: "Revision not found." };
  if (revision.authorId !== user.id && !isEditor(user)) {
    return { ok: false, message: "You cannot edit this revision." };
  }
  if (revision.status !== "draft" && revision.status !== "in_review") {
    return { ok: false, message: "This revision can no longer be edited." };
  }
  if (!title || !body) {
    return { ok: false, message: "Title and body are required." };
  }

  await db
    .update(revisions)
    .set({ title, body, updatedAt: new Date() })
    .where(eq(revisions.id, revisionId));

  refresh();
  return { ok: true, message: "Revision saved." };
}

export async function revisionTransition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const revisionId = String(formData.get("revisionId") ?? "");
  const action = String(formData.get("action") ?? "") as ArticleAction;

  const rows = await db
    .select()
    .from(revisions)
    .where(eq(revisions.id, revisionId))
    .limit(1);
  const revision = rows[0];
  if (!revision) return { ok: false, message: "Revision not found." };

  const article = await loadArticle(revision.articleId);
  if (!article) return { ok: false, message: "Article not found." };
  if (!(await canAccessArticle(user, article))) {
    return { ok: false, message: "You cannot access this article." };
  }

  if (action === "submit") {
    if (revision.authorId !== user.id && !isEditor(user)) {
      return { ok: false, message: "Only the revision author can submit it." };
    }
  } else if (action === "approve") {
    if (!canApproveArticle(user, article, revision.authorId)) {
      return {
        ok: false,
        message: isEditor(user)
          ? "You cannot approve your own revision."
          : "Only an editor can approve a revision.",
      };
    }
  } else if (action === "publish") {
    if (!isEditor(user)) {
      return { ok: false, message: "Only an editor can publish a revision." };
    }
  } else {
    return { ok: false, message: "Unsupported revision action." };
  }

  const ruleError = transitionError(revision.status, action);
  if (ruleError) {
    return {
      ok: false,
      message: ruleError.replace("this article", "this revision"),
    };
  }

  const toStatus = nextStatus(action);
  const now = new Date();

  if (action === "publish") {
    await db
      .update(revisions)
      .set({ status: "published", updatedAt: now })
      .where(eq(revisions.id, revisionId));

    await db
      .update(articles)
      .set({
        title: revision.title,
        body: revision.body,
        status: "published",
        publishAt: now,
        alertDismissedAt: null,
        updatedAt: now,
      })
      .where(eq(articles.id, article.id));

    await logEvent({
      articleId: article.id,
      actorId: user.id,
      type: "revision_published",
      revisionId,
      fromStatus: article.status,
      toStatus: "published",
      message: "Revision published and replaced the live content",
    });
  } else {
    await db
      .update(revisions)
      .set({ status: toStatus, updatedAt: now })
      .where(eq(revisions.id, revisionId));

    await logEvent({
      articleId: article.id,
      actorId: user.id,
      type: "status_changed",
      revisionId,
      fromStatus: revision.status,
      toStatus,
      message: `Revision ${toStatus.replace("_", " ")}`,
    });
  }

  refresh();
  return { ok: true, message: `Revision moved to ${toStatus}.` };
}
