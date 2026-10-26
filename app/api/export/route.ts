import { requireUser } from "@/lib/auth";
import { csvEscape, formatDateTime } from "@/lib/format";
import { listCalendar } from "@/lib/queries";

export async function GET() {
  const user = await requireUser();
  const rows = await listCalendar(user);

  const header = [
    "Article",
    "Section",
    "Author",
    "Status",
    "Publish time",
  ].join(",");

  const body = rows
    .map((row) =>
      [
        csvEscape(row.title),
        csvEscape(row.sectionName),
        csvEscape(row.authorName),
        row.status,
        csvEscape(formatDateTime(row.publishAt)),
      ].join(","),
    )
    .join("\r\n");

  return new Response(`${header}\r\n${body}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="editorial-calendar.csv"',
      "Cache-Control": "no-store",
    },
  });
}
