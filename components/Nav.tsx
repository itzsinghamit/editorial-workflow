"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/articles", label: "Articles" },
  { href: "/sections", label: "Sections" },
  { href: "/alerts", label: "Alerts" },
];

export function Nav({
  overdue,
  userId,
  role,
}: {
  overdue: number;
  userId: string;
  role: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const myHref = `/articles?authorId=${userId}`;
  const mineActive =
    role === "writer" &&
    pathname.startsWith("/articles") &&
    searchParams.get("authorId") === userId;

  const links =
    role === "writer"
      ? [
          LINKS[0],
          LINKS[1],
          { href: myHref, label: "My articles" },
          ...LINKS.slice(2),
        ]
      : LINKS;

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.label === "My articles"
          ? mineActive
          : link.href === "/"
            ? pathname === "/"
            : link.href === "/articles"
              ? pathname.startsWith("/articles") && !mineActive
              : pathname.startsWith(link.href);
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <span>{link.label}</span>
            {link.href === "/alerts" && overdue > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {overdue}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
