"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Feedback", match: (p: string) => p === "/admin" || p.startsWith("/admin/feedback") },
  { href: "/admin/learners", label: "Learners", match: (p: string) => p.startsWith("/admin/learners") },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin sections">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it.match(pathname) ? "page" : undefined}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
