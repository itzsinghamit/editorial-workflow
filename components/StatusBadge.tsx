import { statusLabel } from "@/lib/lifecycle";

const STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  in_review: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-sky-50 text-sky-800 ring-sky-200",
  scheduled: "bg-violet-50 text-violet-800 ring-violet-200",
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STYLES[status] ?? STYLES.draft
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}
