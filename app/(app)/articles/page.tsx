import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listArticles, listFilterOptions } from "@/lib/queries";
import { ArticleTable } from "@/components/ArticleTable";
import { statusLabel } from "@/lib/lifecycle";
import { ARTICLE_STATUSES } from "@/lib/db/schema";

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const filters = {
    q: one(params.q),
    sectionId: one(params.sectionId),
    status: one(params.status),
    authorId: one(params.authorId),
    sort: one(params.sort) || "updated",
    page: Math.max(1, Number(one(params.page)) || 1),
  };

  const [{ rows, total, page, pageCount }, options] = await Promise.all([
    listArticles(user, filters),
    listFilterOptions(user),
  ]);

  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.sectionId) query.set("sectionId", filters.sectionId);
  if (filters.status) query.set("status", filters.status);
  if (filters.authorId) query.set("authorId", filters.authorId);
  if (filters.sort) query.set("sort", filters.sort);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/articles?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Articles</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} article{total === 1 ? "" : "s"} match your filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/api/export?${query.toString()}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export calendar CSV
          </Link>
          <Link
            href="/articles/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New article
          </Link>
        </div>
      </header>

      <form
        method="get"
        action="/articles"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="lg:col-span-2">
          <span className="block text-xs font-medium text-slate-500">
            Search title or body
          </span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="e.g. budget"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>

        <label>
          <span className="block text-xs font-medium text-slate-500">
            Section
          </span>
          <select
            name="sectionId"
            defaultValue={filters.sectionId}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All sections</option>
            {options.sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-xs font-medium text-slate-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={filters.status}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Any status</option>
            {ARTICLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-xs font-medium text-slate-500">
            Author
          </span>
          <select
            name="authorId"
            defaultValue={filters.authorId}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Any author</option>
            {options.authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="block text-xs font-medium text-slate-500">
            Sort by
          </span>
          <select
            name="sort"
            defaultValue={filters.sort}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="updated">Last updated</option>
            <option value="status">Status</option>
            <option value="publish">Publish time</option>
          </select>
        </label>

        <div className="flex items-end gap-2 lg:col-span-6">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
          <Link
            href="/articles"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Reset
          </Link>
        </div>
      </form>

      <ArticleTable
        rows={rows}
        canBulk={user.role === "editor"}
      />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              Previous
            </Link>
          )}
          {page < pageCount && (
            <Link
              href={pageHref(page + 1)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
