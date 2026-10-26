import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { statusLabel } from "@/lib/lifecycle";
import { getDashboard } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { WeeklyChart } from "@/components/WeeklyChart";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user);
  const maxStatus = Math.max(1, ...data.byStatus.map((row) => row.count));

  const cards = [
    { label: "In review", value: data.inReview, hint: "Waiting on an editor" },
    {
      label: "Scheduled this week",
      value: data.scheduledThisWeek,
      hint: "Due in the current week",
    },
    {
      label: "Published this week",
      value: data.publishedThisWeek,
      hint: "Went live since Monday",
    },
    { label: "Open drafts", value: data.openDrafts, hint: "Not submitted yet" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.role === "editor"
              ? "Everything across the newsroom."
              : "Only the sections you are assigned to."}
          </p>
        </div>
        <Link
          href="/articles/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New article
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Published per week — last 8 weeks
          </h2>
          <WeeklyChart weeks={data.weeks} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">
            Articles by status
          </h2>
          <ul className="mt-4 space-y-3">
            {data.byStatus.map((row) => (
              <li key={row.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {statusLabel(row.status)}
                  </span>
                  <span className="font-medium text-slate-900">{row.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-sky-500"
                    style={{ width: `${(row.count / maxStatus) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            Articles by section
          </h2>
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.bySection.map((row) => (
                <tr key={row.sectionId}>
                  <td className="px-5 py-2.5 text-slate-700">
                    {row.sectionName}
                  </td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-900">
                    {row.count}
                  </td>
                </tr>
              ))}
              {data.bySection.length === 0 && (
                <tr>
                  <td className="px-5 py-4 text-slate-500">
                    No articles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            Recently updated
          </h2>
          <ul className="divide-y divide-slate-100">
            {data.recent.map((article) => (
              <li key={article.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/articles/${article.id}`}
                    className="truncate font-medium text-slate-900 hover:text-sky-700"
                  >
                    {article.title}
                  </Link>
                  <StatusBadge status={article.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {article.sectionName} · {article.authorName} ·{" "}
                  {formatDateTime(article.updatedAt)}
                </p>
              </li>
            ))}
            {data.recent.length === 0 && (
              <li className="px-5 py-4 text-sm text-slate-500">
                Nothing here yet.
              </li>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
