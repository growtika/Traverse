"use client";

import { STAGES } from "@/lib/types";
import { stageLabel } from "@/lib/grade";
import {
  TONE_FILL,
  TONE_TEXT,
  buildComparisonRows,
  scoreDisplay,
  scoreTone,
  type CrossingView,
} from "@/lib/results-viz";

export function ComparisonBars({ crossings }: { crossings: CrossingView[] }) {
  const rows = buildComparisonRows(crossings);
  if (!rows.length) return null;

  return (
    <section className="rounded-xl border border-line bg-paper p-4 shadow-[0_10px_28px_rgba(20,33,28,0.05)]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mute">
            Rank
          </div>
          <h2 className="font-display text-[28px] leading-none tracking-[-0.03em]">
            Client vs rivals
          </h2>
        </div>
        <p className="max-w-md text-sm text-mute">
          Bars use this run’s stored crossings only. Client sites are labeled “you”.
        </p>
      </div>

      <div className="grid gap-4">
        {rows.map((row, index) => {
          const overallTone = scoreTone(row.overall);
          return (
            <div key={row.siteId} className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-mute">{index + 1}</span>
                  {row.you ? (
                    <span className="rounded-full bg-peach px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                      you
                    </span>
                  ) : (
                    <span className="rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                      rival
                    </span>
                  )}
                  <span className="font-semibold">{row.domain}</span>
                  <span className="font-mono text-[11px] text-mute">
                    {row.crossings} crossing{row.crossings === 1 ? "" : "s"}
                  </span>
                </div>
                <span className={`font-mono text-lg font-bold tabular-nums ${TONE_TEXT[overallTone]}`}>
                  {scoreDisplay(row.overall, overallTone)}
                </span>
              </div>
              <div className="rank-track h-3 overflow-hidden rounded-full bg-mint">
                <div
                  className="rank-fill h-full rounded-full"
                  style={{
                    width: `${row.overall ?? 0}%`,
                    background: row.overall == null ? "transparent" : TONE_FILL[overallTone],
                  }}
                />
              </div>
              <div className="grid grid-cols-5 gap-2">
                {STAGES.map((stage) => {
                  const value = row.stages[stage];
                  const tone = stage === "verify" && value == null ? "na" : scoreTone(value);
                  return (
                    <div key={stage}>
                      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-mute">
                        <span>{stageLabel(stage)}</span>
                        <span className={TONE_TEXT[tone]}>{scoreDisplay(value, tone)}</span>
                      </div>
                      <div className="rank-track h-1.5 overflow-hidden rounded-full bg-paper-2">
                        <div
                          className="rank-fill h-full rounded-full"
                          style={{
                            width: `${value ?? 0}%`,
                            background: value == null ? "transparent" : TONE_FILL[tone],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
