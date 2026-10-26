"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/articles", label: "Articles" },
  { href: "/sections", label: "Sections" },
  { href: "/alerts", label: "Alerts" },
];

export function Nav({ overdue }: { overdue: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
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
