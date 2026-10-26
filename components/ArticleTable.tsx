"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { bulkTransition } from "@/lib/actions/articles";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/StateForm";
import { formatDateTime } from "@/lib/format";
import type { ActionState } from "@/lib/permissions";

export type ArticleRow = {
  id: string;
  title: string;
  status: string;
  publishAt: Date | null;
  updatedAt: Date;
  sectionName: string;
  authorName: string;
};

export function ArticleTable({
  rows,
  canBulk,
}: {
  rows: ArticleRow[];
  canBulk: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    bulkTransition,
    null,
  );

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No articles match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canBulk && (
        <form
          action={formAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-500">
              Publish time for scheduling
            </label>
            <input
              type="datetime-local"
              name="publishAt"
              className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <SubmitButton
            name="action"
            value="schedule"
            className="bg-violet-600 text-white hover:bg-violet-700"
          >
            Schedule selected ({selected.length})
          </SubmitButton>
          <SubmitButton
            name="action"
            value="unpublish"
            className="bg-slate-700 text-white hover:bg-slate-800"
          >
            Unpublish selected
          </SubmitButton>
          {selected.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          {state && (
            <p
              className={`w-full rounded-md px-3 py-2 text-sm ${
                state.ok
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {state.message}
            </p>
          )}
          {state?.items && (
            <ul className="w-full space-y-1 text-sm">
              {state.items.map((item) => (
                <li key={item.id} className="flex gap-2">
                  <span
                    className={item.ok ? "text-emerald-600" : "text-red-600"}
                  >
                    {item.ok ? "✓" : "✕"}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-500">— {item.message}</span>
                </li>
              ))}
            </ul>
          )}
          {pending && <p className="text-xs text-slate-500">Working…</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {canBulk && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? [] : rows.map((row) => row.id))
                    }
                  />
                </th>
              )}
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Publish time</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {canBulk && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.title}`}
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/articles/${row.id}`}
                    className="font-medium text-slate-900 hover:text-sky-700"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.sectionName}</td>
                <td className="px-4 py-3 text-slate-600">{row.authorName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(row.publishAt)}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDateTime(row.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
