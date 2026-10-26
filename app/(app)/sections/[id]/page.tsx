import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  assignWriter,
  removeWriter,
  setSectionArchived,
  updateSection,
} from "@/lib/actions/sections";
import { formatDateTime } from "@/lib/format";
import { isEditor } from "@/lib/permissions";
import {
  getSectionDetail,
  listEditors,
  listWriters,
} from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";
import { StatusBadge } from "@/components/StatusBadge";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getSectionDetail(user, id);
  if (!detail) notFound();

  const { section, owner, writers, articles } = detail;
  const editor = isEditor(user);

  const [editors, allWriters] = editor
    ? await Promise.all([listEditors(), listWriters()])
    : [[], []];

  const assigned = new Set(writers.map((writer) => writer.id));
  const available = allWriters.filter((writer) => !assigned.has(writer.id));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/sections" className="text-sm text-slate-500 hover:underline">
          ← All sections
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            {section.name}
          </h1>
          {section.archivedAt && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Archived {formatDateTime(section.archivedAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          {section.description || "No description."}
        </p>
        <p className="text-sm text-slate-500">Owning editor: {owner.name}</p>
      </header>

      {editor && (
        <div className="grid gap-4 lg:grid-cols-2">
          <details className="rounded-xl border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">
              Edit section
            </summary>
            <StateForm action={updateSection} className="mt-3 space-y-3">
              <input type="hidden" name="sectionId" value={section.id} />
              <label className="block">
                <span className="block text-xs font-medium text-slate-500">
                  Name
                </span>
                <input
                  name="name"
                  defaultValue={section.name}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500">
                  Description
                </span>
                <input
                  name="description"
                  defaultValue={section.description}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-500">
                  Owning editor
                </span>
                <select
                  name="ownerEditorId"
                  defaultValue={section.ownerEditorId}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {editors.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton className="bg-slate-900 text-white hover:bg-slate-800">
                Save section
              </SubmitButton>
            </StateForm>

            <StateForm action={setSectionArchived} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="sectionId" value={section.id} />
              <input
                type="hidden"
                name="archived"
                value={section.archivedAt ? "false" : "true"}
              />
              <SubmitButton className="bg-slate-700 text-white hover:bg-slate-800">
                {section.archivedAt ? "Restore section" : "Archive section"}
              </SubmitButton>
            </StateForm>
          </details>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-700">
              Assigned writers ({writers.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {writers.map((writer) => (
                <li
                  key={writer.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {writer.name}
                    </p>
                    <p className="text-xs text-slate-500">{writer.email}</p>
                  </div>
                  <StateForm action={removeWriter}>
                    <input
                      type="hidden"
                      name="sectionId"
                      value={section.id}
                    />
                    <input type="hidden" name="userId" value={writer.id} />
                    <SubmitButton className="bg-white text-xs text-red-600 ring-1 ring-slate-200 hover:bg-red-50">
                      Remove
                    </SubmitButton>
                  </StateForm>
                </li>
              ))}
              {writers.length === 0 && (
                <li className="text-sm text-slate-500">No writers yet.</li>
              )}
            </ul>

            {available.length > 0 && (
              <StateForm
                action={assignWriter}
                className="mt-4 space-y-2 border-t border-slate-100 pt-4"
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <label className="block">
                  <span className="block text-xs font-medium text-slate-500">
                    Assign a writer
                  </span>
                  <select
                    name="userId"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {available.map((writer) => (
                      <option key={writer.id} value={writer.id}>
                        {writer.name} ({writer.email})
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton className="bg-slate-900 text-white hover:bg-slate-800">
                  Assign writer
                </SubmitButton>
              </StateForm>
            )}
          </div>
        </div>
      )}

      {!editor && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-700">Your team</h2>
          <p className="mt-2 text-sm text-slate-600">
            Owning editor: {owner.name}. Writers:{" "}
            {writers.map((writer) => writer.name).join(", ") || "none yet"}.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
          Articles in this section ({articles.length})
        </h2>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Publish time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/articles/${article.id}`}
                    className="font-medium text-slate-900 hover:text-sky-700"
                  >
                    {article.title}
                  </Link>
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {article.authorName}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={article.status} />
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {formatDateTime(article.publishAt)}
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  No articles in this section yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
