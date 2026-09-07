import type { ReactNode } from "react";

export function PageHead({
  kicker,
  title,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  lede: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <div className="font-mono text-[12px] font-bold uppercase tracking-[0.28em] text-ink">
          {kicker}
        </div>
        <h1 className="mt-2 font-display text-[40px] font-normal leading-[1.1] tracking-[-0.03em] text-ink">
          {title}
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-mute">{lede}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-paper shadow-[0_10px_28px_rgba(20,33,28,0.05)] ${className}`}
    >
      {children}
    </section>
  );
}

export function Score({
  value,
  label,
  empty = "—",
}: {
  value: number | null | undefined;
  label?: string;
  empty?: string;
}) {
  const tone =
    value == null ? "text-mute" : value >= 70 ? "text-moss" : value >= 40 ? "text-warn" : "text-rust";
  return (
    <div>
      <div className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>
        {value == null ? empty : value}
      </div>
      {label ? (
        <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
          {label}
        </div>
      ) : null}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  kind = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  kind?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const cls =
    kind === "primary"
      ? "bg-peach border-peach-2 hover:bg-[#ffd9b0] disabled:opacity-50"
      : "bg-paper border-line hover:border-ink disabled:opacity-50";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-lg border px-6 py-2 font-mono text-[13px] font-bold uppercase tracking-[0.04em] text-ink transition-transform hover:-translate-y-px ${cls}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
        {label}
      </div>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-[15px] text-ink outline-none focus:border-peach-2 focus:shadow-[0_0_0_3px_var(--peach)]";

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="frame-grid px-5 py-12 text-center">
        <div className="mx-auto mb-3 h-2 w-16 rounded-full bg-peach" />
        <div className="font-display text-[32px] tracking-[-0.02em] text-ink">{title}</div>
        <p className="mx-auto mt-2 max-w-lg text-mute">{detail}</p>
      </div>
    </Card>
  );
}

export function Delta({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-mute">no prior run</span>;
  const sign = value > 0 ? "+" : "";
  const tone = value > 0 ? "text-moss" : value < 0 ? "text-rust" : "text-mute";
  return (
    <span className={`font-mono ${tone}`}>
      {sign}
      {value} vs last run
    </span>
  );
}

export const pillLinkClass =
  "inline-flex items-center rounded-lg border border-peach-2 bg-peach px-6 py-2 font-mono text-[13px] font-bold uppercase tracking-[0.04em] text-ink transition-transform hover:-translate-y-px";

export const sectionLinkClass =
  "rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-ink hover:border-ink";
