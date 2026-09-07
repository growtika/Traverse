import type { EvidencePage } from "@/lib/types";

export function EvidenceFrame({
  page,
  highlight = false,
}: {
  page: EvidencePage;
  highlight?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-paper shadow-[0_10px_28px_rgba(20,33,28,0.06)] ${
        highlight ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-3 bg-peach px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
        <span>{page.stage}</span>
        <span>{page.partial ? "Partial" : "Captured"}</span>
      </div>
      <div className="frame-grid min-h-40 p-4">
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="truncate font-mono text-[11px] text-mute">{page.finalUrl || page.url}</div>
          <h3 className="mt-2 text-xl font-semibold leading-snug text-ink">
            {page.title || "Untitled public page"}
          </h3>
          {page.headings[0] ? <div className="mt-2 text-mute">{page.headings[0]}</div> : null}
          <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-mute">
            {page.excerpt || page.error || "No extractable text."}
          </p>
          {page.forms.length ? (
            <div className="mt-3 font-mono text-[11px] text-warn">
              Form fields listed, not submitted:{" "}
              {page.forms[0].fields.map((f) => f.label || f.name || f.type).join(", ") || "unnamed"}
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line px-3 py-2 text-[12px] text-mute">{page.label}</div>
    </article>
  );
}
