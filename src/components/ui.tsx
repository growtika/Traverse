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
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{kicker}</div>
        <h1 className="mt-1 text-4xl tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-paper-dim text-[#cfc3a8]">{lede}</p>
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
    <section className={`border border-line bg-[#100e0b] ${className}`}>{children}</section>
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
      <div className={`font-mono text-2xl tabular-nums ${tone}`}>
        {value == null ? empty : value}
      </div>
      {label ? (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
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
      ? "bg-paper text-ink hover:bg-[#f3ead6] disabled:opacity-50"
      : "border border-line text-paper hover:border-paper disabled:opacity-50";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-mono text-[12px] uppercase tracking-[0.14em] ${cls}`}
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
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{label}</div>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full border border-line bg-ink px-3 py-2 text-[15px] text-paper outline-none focus:border-paper";

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="px-5 py-10 text-center">
      <div className="text-2xl">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-[#cfc3a8]">{detail}</p>
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
