import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dismissAlert } from "@/lib/actions/articles";
import { formatDateTime } from "@/lib/format";
import { isEditor } from "@/lib/permissions";
import { listOverdue } from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";

export default async function AlertsPage() {
  const user = await requireUser();
  const overdue = await listOverdue(user);
  const editor = isEditor(user);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Overdue alerts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Scheduled articles whose publish time has passed and that are still
          not published. Dismissing hides an alert until the article is
          scheduled again.
        </p>
      </header>

      {overdue.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Nothing overdue. Every scheduled article is still on time.
        </p>
      ) : (
        <ul className="space-y-3">
          {overdue.map((article) => (
            <li
              key={article.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/articles/${article.id}`}
                  className="font-medium text-slate-900 hover:text-sky-700"
                >
                  {article.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {article.sectionName} · {article.authorName} · was due{" "}
                  {formatDateTime(article.publishAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  Overdue
                </span>
                {editor ? (
                  <StateForm action={dismissAlert}>
                    <input type="hidden" name="articleId" value={article.id} />
                    <SubmitButton className="bg-white text-xs text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                      Dismiss
                    </SubmitButton>
                  </StateForm>
                ) : (
                  <span className="text-xs text-slate-400">
                    An editor can dismiss this
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
