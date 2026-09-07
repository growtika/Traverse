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

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="1.6"
        stroke="#14211C"
        fill="#FFFFFF"
        d="M12 30c-2-12 8-20 16-19c8 1 12 7 11 14c-1 6-6 9-12 9h-8Z"
      />
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="1.6"
        stroke="#14211C"
        fill="none"
        d="M18 12c-2-8 4-12 10-9M25 11c-1-7 6-10 10-5"
      />
      <path
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="1.6"
        stroke="#14211C"
        fill="#E3DCF6"
        d="M30 8c-4-4-9-2-7 3"
      />
      <rect
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth="1.6"
        stroke="#14211C"
        fill="#FF5A45"
        rx="2"
        height="6"
        width="7"
        y="14"
        x="31"
      />
      <circle fill="#14211C" r="1.8" cy="22" cx="29" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen">
      <div className="bg-mint font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-ink">
        <div className="mx-auto max-w-6xl px-5 py-1.5">
          Public crawl · no login · first crossing free
        </div>
      </div>
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 leading-none">
            <Mark />
            <div>
              <div className="text-[22px] font-extrabold uppercase tracking-[-0.04em] text-ink">
                Traverse
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 font-mono text-[12px] font-bold uppercase tracking-[0.06em]">
            {NAV.map(([href, label]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? "rounded-lg bg-mint px-2.5 py-1.5 text-ink shadow-[inset_0_0_0_1px_var(--ink)]"
                      : "rounded-lg px-2.5 py-1.5 text-mute hover:bg-paper hover:text-ink"
                  }
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
