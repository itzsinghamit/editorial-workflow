import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  addComment,
  articleTransition,
  openRevision,
  revisionTransition,
  updateRevision,
} from "@/lib/actions/articles";
import { formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/lifecycle";
import {
  canApproveArticle,
  canEditArticleContent,
  isEditor,
} from "@/lib/permissions";
import { getArticleDetail } from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getArticleDetail(user, id);
  if (!detail) notFound();

  const { article, section, author, revisions, events } = detail;
  const editor = isEditor(user);
  const isAuthor = article.authorId === user.id;
  const canEdit = canEditArticleContent(user, article);
  const canApprove = canApproveArticle(user, article);
  const pendingRevision = revisions.find(
    (row) => row.revision.status !== "published",
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/articles" className="text-sm text-slate-500 hover:underline">
          ← All articles
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {article.title}
          </h1>
          <StatusBadge status={article.status} />
        </div>
        <p className="text-sm text-slate-600">
          {section.name} · {author.name} · Created{" "}
          {formatDateTime(article.createdAt)} · Updated{" "}
          {formatDateTime(article.updatedAt)}
        </p>
        {article.publishAt && (
          <p className="text-sm text-slate-600">
            Publish time: {formatDateTime(article.publishAt)}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {canEdit && (
            <Link
              href={`/articles/${article.id}/edit`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit content
            </Link>
          )}
          <Link
            href={`/sections/${section.id}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open section
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <article className="prose prose-slate max-w-none whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-800 lg:col-span-2">
          {article.body}
        </article>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-700">Actions</h2>
            <div className="mt-3 space-y-3">
              {article.status === "draft" && (isAuthor || editor) && (
                <StateForm action={articleTransition}>
                  <input type="hidden" name="articleId" value={article.id} />
                  <input type="hidden" name="action" value="submit" />
                  <SubmitButton className="w-full bg-amber-500 text-white hover:bg-amber-600">
                    Submit for review
                  </SubmitButton>
                </StateForm>
              )}

              {article.status === "in_review" && canApprove && (
                <StateForm action={articleTransition}>
                  <input type="hidden" name="articleId" value={article.id} />
                  <input type="hidden" name="action" value="approve" />
                  <SubmitButton className="w-full bg-sky-600 text-white hover:bg-sky-700">
                    Approve
                  </SubmitButton>
                </StateForm>
              )}

              {article.status === "in_review" && editor && isAuthor && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  You wrote this article, so a different editor has to approve
                  it.
                </p>
              )}

              {(article.status === "approved" ||
                article.status === "scheduled") &&
                editor && (
                  <StateForm action={articleTransition}>
                    <input type="hidden" name="articleId" value={article.id} />
                    <input type="hidden" name="action" value="publish" />
                    <SubmitButton className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                      Publish now
                    </SubmitButton>
                  </StateForm>
                )}

              {article.status === "approved" && editor && (
                <StateForm
                  action={articleTransition}
                  className="space-y-2 rounded-md bg-slate-50 p-3"
                >
                  <input type="hidden" name="articleId" value={article.id} />
                  <input type="hidden" name="action" value="schedule" />
                  <label className="block text-xs font-medium text-slate-600">
                    Schedule for
                    <input
                      type="datetime-local"
                      name="publishAt"
                      required
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <SubmitButton className="w-full bg-violet-600 text-white hover:bg-violet-700">
                    Schedule
                  </SubmitButton>
                </StateForm>
              )}

              {(article.status === "scheduled" ||
                article.status === "published") &&
                editor && (
                  <StateForm action={articleTransition}>
                    <input type="hidden" name="articleId" value={article.id} />
                    <input type="hidden" name="action" value="unpublish" />
                    <SubmitButton className="w-full bg-slate-700 text-white hover:bg-slate-800">
                      Unpublish to Approved
                    </SubmitButton>
                  </StateForm>
                )}

              {article.status === "published" &&
                (isAuthor || editor) &&
                !pendingRevision && (
                  <details className="rounded-md bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      Open a revision
                    </summary>
                    <StateForm action={openRevision} className="mt-3 space-y-2">
                      <input
                        type="hidden"
                        name="articleId"
                        value={article.id}
                      />
                      <input
                        name="title"
                        defaultValue={article.title}
                        required
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <textarea
                        name="body"
                        defaultValue={article.body}
                        required
                        rows={8}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <SubmitButton className="w-full bg-slate-900 text-white hover:bg-slate-800">
                        Create revision draft
                      </SubmitButton>
                    </StateForm>
                  </details>
                )}

              {article.status === "published" && pendingRevision && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  A revision is already open. It must finish its own review
                  before another can start.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-700">
              Revisions ({revisions.length})
            </h2>
            <ul className="mt-3 space-y-3">
              {revisions.length === 0 && (
                <li className="text-sm text-slate-500">
                  No revisions opened.
                </li>
              )}
              {revisions.map(({ revision, author: revisionAuthor }) => (
                <li
                  key={revision.id}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={revision.status} />
                    <span className="text-xs text-slate-500">
                      {formatDateTime(revision.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Opened by {revisionAuthor.name}
                  </p>

                  <div className="mt-2 space-y-2">
                    {revision.status === "draft" &&
                      (revision.authorId === user.id || editor) && (
                        <StateForm action={revisionTransition}>
                          <input
                            type="hidden"
                            name="revisionId"
                            value={revision.id}
                          />
                          <input type="hidden" name="action" value="submit" />
                          <SubmitButton className="w-full bg-amber-500 text-xs text-white hover:bg-amber-600">
                            Submit revision
                          </SubmitButton>
                        </StateForm>
                      )}

                    {revision.status === "in_review" &&
                      canApproveArticle(user, article, revision.authorId) && (
                        <StateForm action={revisionTransition}>
                          <input
                            type="hidden"
                            name="revisionId"
                            value={revision.id}
                          />
                          <input type="hidden" name="action" value="approve" />
                          <SubmitButton className="w-full bg-sky-600 text-xs text-white hover:bg-sky-700">
                            Approve revision
                          </SubmitButton>
                        </StateForm>
                      )}

                    {revision.status === "approved" && editor && (
                      <StateForm action={revisionTransition}>
                        <input
                          type="hidden"
                          name="revisionId"
                          value={revision.id}
                        />
                        <input type="hidden" name="action" value="publish" />
                        <SubmitButton className="w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700">
                          Publish revision
                        </SubmitButton>
                      </StateForm>
                    )}

                    {(revision.status === "draft" ||
                      revision.status === "in_review") &&
                      (revision.authorId === user.id || editor) && (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-slate-600">
                            Edit revision text
                          </summary>
                          <StateForm
                            action={updateRevision}
                            className="mt-2 space-y-2"
                          >
                            <input
                              type="hidden"
                              name="revisionId"
                              value={revision.id}
                            />
                            <input
                              name="title"
                              defaultValue={revision.title}
                              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            />
                            <textarea
                              name="body"
                              defaultValue={revision.body}
                              rows={6}
                              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            />
                            <SubmitButton className="w-full bg-slate-700 text-xs text-white hover:bg-slate-800">
                              Save revision
                            </SubmitButton>
                          </StateForm>
                        </details>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Timeline (append-only)
          </h2>
          <ol className="mt-4 space-y-4">
            {events.map(({ event, actor }) => (
              <li key={event.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                <div>
                  <p className="text-sm text-slate-800">
                    {event.type === "comment" ? (
                      <span className="rounded-md bg-slate-50 px-2 py-1">
                        {event.message}
                      </span>
                    ) : event.type === "created" ? (
                      <>
                        <strong>{actor.name}</strong> created the article as a
                        draft
                      </>
                    ) : event.type === "revision_opened" ? (
                      <>
                        <strong>{actor.name}</strong> opened a revision
                      </>
                    ) : event.type === "revision_published" ? (
                      <>
                        <strong>{actor.name}</strong> published a revision,
                        replacing the live content
                      </>
                    ) : (
                      <>
                        <strong>{actor.name}</strong> moved the article from{" "}
                        {statusLabel(event.fromStatus ?? "")} to{" "}
                        {statusLabel(event.toStatus ?? "")}
                        {event.revisionId ? " (revision)" : ""}
                        {event.message ? ` — ${event.message}` : ""}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Leave a comment
          </h2>
          <StateForm action={addComment} className="mt-3 space-y-2">
            <input type="hidden" name="articleId" value={article.id} />
            <textarea
              name="body"
              rows={4}
              required
              placeholder="Feedback for the author or editor…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <SubmitButton className="bg-slate-900 text-white hover:bg-slate-800">
              Add comment
            </SubmitButton>
          </StateForm>
          <p className="mt-3 text-xs text-slate-400">
            Comments and status changes are permanent. The application never
            updates or deletes timeline entries.
          </p>
        </div>
      </section>
    </div>
  );
}
