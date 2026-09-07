"use client";

import { STAGES } from "@/lib/types";
import {
  TONE_FILL,
  TONE_TEXT,
  buildHeatRows,
  crossingPathLabel,
  scoreDisplay,
  scoreForStage,
  stageTone,
  type CrossingView,
  type ResultsFocus,
  type ScoreTone,
} from "@/lib/results-viz";

export function StageTracks({
  crossings,
  focus,
  onSelect,
}: {
  crossings: CrossingView[];
  focus: ResultsFocus;
  onSelect: (focus: ResultsFocus) => void;
}) {
  if (!crossings.length) return null;
  return (
    <div className="grid gap-3">
      {crossings.map((crossing) => (
        <article
          key={crossing.id}
          className={`rounded-xl border bg-paper px-4 py-3 shadow-[0_10px_28px_rgba(20,33,28,0.04)] ${
            focus.crossingId === crossing.id ? "border-ink" : "border-line"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
                {crossing.site?.domain} · {crossing.route?.name} · x{crossing.crossingIndex + 1}
              </div>
              <div className="text-sm text-mute">{crossingPathLabel(crossing)}</div>
            </div>
            <div className={`font-mono text-xl font-bold ${TONE_TEXT[stageToneFromOverall(crossing.overallScore)]}`}>
              {crossing.overallScore ?? "—"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-0">
            {STAGES.map((stage, index) => {
              const tone = stageTone(crossing, stage);
              const score = scoreForStage(crossing, stage);
              const selected = focus.crossingId === crossing.id && focus.stage === stage;
              return (
                <div key={stage} className="flex items-center">
                  {index > 0 ? (
                    <div
                      className="mx-1 h-0.5 w-6 rounded-full sm:w-8"
                      style={{ background: connectorColor(tone) }}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect({ crossingId: crossing.id, stage })}
                    className={`trk-cell ${selected ? "is-selected" : ""}`}
                    style={{
                      borderColor: selected ? "var(--ink)" : "var(--line)",
                      boxShadow: selected ? "inset 0 0 0 1px var(--ink)" : undefined,
                    }}
                    aria-label={`${stage} ${scoreDisplay(score, tone)}`}
                  >
                    <span
                      className="trk-dot"
                      style={{ background: tone === "pending" ? "var(--paper-2)" : TONE_FILL[tone] }}
                    />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                      {stage[0]}
                    </span>
                    <span className={`font-mono text-[12px] font-bold ${TONE_TEXT[tone]}`}>
                      {scoreDisplay(score, tone)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

export function HeatTiles({
  crossings,
  focus,
  onSelect,
}: {
  crossings: CrossingView[];
  focus: ResultsFocus;
  onSelect: (focus: ResultsFocus) => void;
}) {
  const rows = buildHeatRows(crossings);
  if (!rows.length) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-paper">
      <div className="border-b border-line px-4 py-3">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mute">Heat</div>
        <div className="text-sm text-mute">One tile per stored stage score. Empty tiles are pending or N/A.</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mute">
              <th className="px-4 py-2 font-medium">Crossing</th>
              {STAGES.map((stage) => (
                <th key={stage} className="px-2 py-2 font-medium">
                  {stage}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.crossingId} className="border-t border-line">
                <td className="px-4 py-2 text-sm">{row.title}</td>
                {row.cells.map((cell) => {
                  const selected =
                    focus.crossingId === cell.crossingId && focus.stage === cell.stage;
                  return (
                    <td key={cell.stage} className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onSelect({ crossingId: cell.crossingId, stage: cell.stage })}
                        className={`heat-tile ${selected ? "is-selected" : ""}`}
                        style={{
                          background: tileBackground(cell.tone),
                          color: tileColor(cell.tone),
                        }}
                      >
                        {scoreDisplay(cell.score, cell.tone)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function stageToneFromOverall(score: number | null): ScoreTone {
  if (score == null) return "pending";
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

function connectorColor(tone: ScoreTone): string {
  if (tone === "pending" || tone === "na") return "var(--line)";
  return TONE_FILL[tone];
}

function tileBackground(tone: ScoreTone): string {
  if (tone === "pending") return "var(--paper-2)";
  if (tone === "na") return "var(--mint)";
  if (tone === "good") return "rgba(79, 154, 106, 0.22)";
  if (tone === "warn") return "rgba(201, 137, 58, 0.22)";
  return "rgba(255, 90, 69, 0.18)";
}

function tileColor(tone: ScoreTone): string {
  if (tone === "pending" || tone === "na") return "var(--mute)";
  if (tone === "good") return "var(--moss)";
  if (tone === "warn") return "var(--warn)";
  return "var(--rust)";
}
