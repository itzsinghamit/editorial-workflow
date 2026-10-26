import type { ArticleStatus } from "@/lib/db/schema";

export type ArticleAction =
  | "submit"
  | "approve"
  | "publish"
  | "schedule"
  | "unpublish";

/**
 * The single source of truth for the article state machine. Both single and
 * bulk actions call this, so a move that is illegal in the UI is also illegal
 * when the server action is called directly.
 */
const ALLOWED_FROM: Record<ArticleAction, ArticleStatus[]> = {
  submit: ["draft"],
  approve: ["in_review"],
  publish: ["approved", "scheduled"],
  schedule: ["approved"],
  unpublish: ["scheduled", "published"],
};

const ACTION_VERB: Record<ArticleAction, string> = {
  submit: "submit",
  approve: "approve",
  publish: "publish",
  schedule: "schedule",
  unpublish: "unpublish",
};

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ArticleStatus] ?? status;
}

export function transitionError(
  status: ArticleStatus,
  action: ArticleAction,
): string | null {
  if (ALLOWED_FROM[action].includes(status)) return null;
  return `Cannot ${ACTION_VERB[action]} this article because it is ${statusLabel(
    status,
  ).toLowerCase()}.`;
}

export function nextStatus(action: ArticleAction): ArticleStatus {
  switch (action) {
    case "submit":
      return "in_review";
    case "approve":
      return "approved";
    case "schedule":
      return "scheduled";
    case "publish":
      return "published";
    case "unpublish":
      return "approved";
  }
}
