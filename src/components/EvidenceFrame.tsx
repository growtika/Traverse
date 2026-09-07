import type { EvidencePage } from "@/lib/types";

export function EvidenceFrame({ page }: { page: EvidencePage }) {
  return (
    <article className="border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
        <span>{page.stage}</span>
        <span>{page.partial ? "Partial" : "Captured"}</span>
      </div>
      <div className="frame-grid min-h-40 bg-[#0a0907] p-4">
        <div className="border border-line bg-[#14110d] p-4">
          <div className="truncate font-mono text-[11px] text-mute">{page.finalUrl || page.url}</div>
          <h3 className="mt-2 text-xl leading-snug">{page.title || "Untitled public page"}</h3>
          {page.headings[0] ? (
            <div className="mt-2 text-[#cfc3a8]">{page.headings[0]}</div>
          ) : null}
          <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-[#b9ae96]">
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
