import type { Article, User } from "@/lib/db/schema";

export type ActionResult = {
  ok: boolean;
  message: string;
  items?: Array<{ id: string; label: string; ok: boolean; message: string }>;
};

export type ActionState = ActionResult | null;

export function isEditor(user: User): boolean {
  return user.role === "editor";
}

export function canManageSections(user: User): boolean {
  return isEditor(user);
}

/** Writers may only write in sections they are assigned to; editors anywhere. */
export function canWriteInSection(
  user: User,
  sectionId: string,
  assignedSectionIds: string[],
): boolean {
  return isEditor(user) || assignedSectionIds.includes(sectionId);
}

/**
 * Published content is immutable through the editor: a revision is required.
 * Editing an approved or scheduled article is allowed but sends it back to
 * review, which the caller handles.
 */
export function canEditArticleContent(
  user: User,
  article: Pick<Article, "authorId" | "status">,
): boolean {
  const ownsIt = article.authorId === user.id;
  return (isEditor(user) || ownsIt) && article.status !== "published";
}

export function canApproveArticle(
  user: User,
  article: Pick<Article, "authorId">,
  revisionAuthorId?: string | null,
): boolean {
  if (!isEditor(user)) return false;
  const author = revisionAuthorId ?? article.authorId;
  return author !== user.id;
}

export function canTransitionArticle(user: User, action: string): boolean {
  if (action === "submit") return true; // author/editor check happens first
  return isEditor(user);
}

export function canOpenRevision(
  user: User,
  article: Pick<Article, "authorId">,
): boolean {
  return isEditor(user) || article.authorId === user.id;
}

export function canComment(user: User): boolean {
  return user.role === "editor" || user.role === "writer";
}
