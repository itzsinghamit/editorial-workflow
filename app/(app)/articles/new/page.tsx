import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createArticle } from "@/lib/actions/articles";
import { listSections } from "@/lib/queries";
import { StateForm, SubmitButton } from "@/components/StateForm";

export default async function NewArticlePage() {
  const user = await requireUser();
  const sections = await listSections(user);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/articles" className="text-sm text-slate-500 hover:underline">
          ← Back to articles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          New article
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          The article starts as a draft and only you (or an editor) can edit it.
        </p>
      </header>

      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          You are not assigned to any section yet. Ask an editor to assign you
          before writing.
        </p>
      ) : (
        <StateForm
          action={createArticle}
          className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <label className="block">
            <span className="block text-sm font-medium text-slate-700">
              Section
            </span>
            <select
              name="sectionId"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-slate-700">
              Title
            </span>
            <input
              name="title"
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
              required
              rows={14}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <SubmitButton className="bg-slate-900 text-white hover:bg-slate-800">
            Create draft
          </SubmitButton>
        </StateForm>
      )}
    </div>
  );
}
