import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createSection } from "@/lib/actions/sections";
import { isEditor } from "@/lib/permissions";
import { listEditors, listSections } from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";

export default async function SectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const editor = isEditor(user);
  const includeArchived = editor && params.archived === "1";

  const [sections, editors] = await Promise.all([
    listSections(user, includeArchived),
    editor ? listEditors() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sections</h1>
          <p className="mt-1 text-sm text-slate-600">
            {editor
              ? "Create, edit, archive and staff sections."
              : "Sections you are assigned to."}
          </p>
        </div>
        {editor && (
          <Link
            href={includeArchived ? "/sections" : "/sections?archived=1"}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {includeArchived ? "Hide archived" : "Show archived"}
          </Link>
        )}
      </header>

      {editor && (
        <StateForm
          action={createSection}
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="block">
            <span className="block text-xs font-medium text-slate-500">
              Name
            </span>
            <input
              name="name"
              required
              maxLength={80}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500">
              Description
            </span>
            <input
              name="description"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500">
              Owning editor
            </span>
            <select
              name="ownerEditorId"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {editors.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <SubmitButton className="w-full bg-slate-900 text-white hover:bg-slate-800">
              Create section
            </SubmitButton>
          </div>
        </StateForm>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Section</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Writers</th>
              <th className="px-5 py-3">Articles</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.map((section) => (
              <tr key={section.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/sections/${section.id}`}
                    className="font-medium text-slate-900 hover:text-sky-700"
                  >
                    {section.name}
                  </Link>
                  {section.description && (
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">{section.ownerName}</td>
                <td className="px-5 py-3 text-slate-600">
                  {section.writerCount}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {section.articleCount}
                </td>
                <td className="px-5 py-3">
                  {section.archivedAt ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Archived
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  {editor
                    ? "No sections yet. Create the first one above."
                    : "You are not assigned to any section yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
