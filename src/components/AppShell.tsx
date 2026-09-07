"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/", "Overview"],
  ["/sites", "Sites"],
  ["/routes", "Routes"],
  ["/keys", "Answer keys"],
  ["/survey", "Survey"],
  ["/runs", "Runs"],
  ["/alerts", "Alerts"],
  ["/settings", "Settings"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-6 px-5 py-4">
          <Link href="/" className="leading-none">
            <div className="font-mono text-[11px] tracking-[0.22em] text-mute uppercase">
              Public crawl · no login
            </div>
            <div className="mt-1 text-3xl tracking-tight">Traverse</div>
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-[12px] uppercase tracking-[0.14em] text-mute">
            {NAV.map(([href, label]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? "text-paper" : "hover:text-paper"}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
