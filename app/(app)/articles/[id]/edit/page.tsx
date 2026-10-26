import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updateArticle } from "@/lib/actions/articles";
import { canEditArticleContent } from "@/lib/permissions";
import { getArticleDetail } from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getArticleDetail(user, id);
  if (!detail) notFound();

  const { article, section } = detail;
  const allowed = canEditArticleContent(user, article);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/articles/${article.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Back to article
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Edit article
          </h1>
          <StatusBadge status={article.status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {section.name} · {detail.author.name}
        </p>
      </header>

      {!allowed ? (
        <div className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {article.status === "published"
            ? "Published content cannot be edited directly. Open a revision from the article page instead."
            : "You do not have permission to edit this article."}
        </div>
      ) : (
        <StateForm
          action={updateArticle}
          className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <input type="hidden" name="articleId" value={article.id} />

          {(article.status === "approved" ||
            article.status === "scheduled") && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Saving this edit sends the article back to review and clears its
              scheduled time.
            </p>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-slate-700">
              Title
            </span>
            <input
              name="title"
              defaultValue={article.title}
              required
              maxLength={200}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700">
              Body
            </span>
            <textarea
              name="body"
              defaultValue={article.body}
              required
              rows={16}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <SubmitButton className="bg-slate-900 text-white hover:bg-slate-800">
            Save changes
          </SubmitButton>
        </StateForm>
      )}
    </div>
  );
}
