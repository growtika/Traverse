"use client";

import {
  TONE_STROKE,
  TONE_TEXT,
  activeStage,
  buildFlowGraph,
  crossingPathLabel,
  crossingTitle,
  edgePath,
  scoreDisplay,
  type CrossingView,
  type FlowNode,
  type ResultsFocus,
} from "@/lib/results-viz";

export function FlowCanvas({
  crossing,
  agentLabel,
  focus,
  onSelect,
}: {
  crossing: CrossingView | null;
  agentLabel: string;
  focus: ResultsFocus;
  onSelect: (focus: ResultsFocus, tab?: "journal" | "evidence") => void;
}) {
  const graph = buildFlowGraph({ crossing, agentLabel });
  const current = crossing ? activeStage(crossing) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2c4037] bg-[#203029] shadow-[0_16px_40px_rgba(20,33,28,0.18)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6e7d8]">
            Process canvas
          </div>
          <div className="text-sm text-[#f2f3ec]">
            {crossing ? crossingTitle(crossing) : "Waiting for the first crossing"}
            {crossing ? (
              <span className="text-[#a9cdb1]"> · {crossingPathLabel(crossing)}</span>
            ) : null}
          </div>
        </div>
        {current ? (
          <div className="rounded-full border border-[#ffcf9c]/50 bg-[#ffcf9c]/15 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#ffcf9c]">
            Live · {current}
          </div>
        ) : null}
      </div>

      <div className="flow-canvas min-h-[280px] overflow-x-auto">
        <div className="relative min-w-max p-1" style={{ width: graph.width, height: Math.max(graph.height, 280) }}>
          <svg
            className="pointer-events-none absolute inset-0"
            width={graph.width}
            height={graph.height}
            aria-hidden="true"
          >
            {graph.edges.map((edge) => {
              const from = graph.nodes.find((node) => node.id === edge.from);
              const to = graph.nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              return (
                <path
                  key={edge.id}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={TONE_STROKE[edge.tone]}
                  strokeWidth={edge.tone === "pending" ? 1.6 : 2.2}
                  strokeLinecap="round"
                  strokeDasharray={edge.dashed ? "6 7" : "0"}
                  className={edge.animated ? "flow-edge-draw" : undefined}
                />
              );
            })}
          </svg>

          {graph.nodes.map((node) => (
            <FlowNodeCard
              key={node.id}
              node={node}
              selected={isSelected(node, focus, crossing?.id ?? null)}
              onClick={() => {
                if (!crossing) return;
                if (node.kind === "page") {
                  onSelect(
                    { crossingId: crossing.id, stage: node.stage ?? null, evidenceId: node.evidenceId },
                    "evidence",
                  );
                  return;
                }
                onSelect(
                  { crossingId: crossing.id, stage: node.stage ?? null },
                  "journal",
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function isSelected(node: FlowNode, focus: ResultsFocus, crossingId: string | null) {
  if (!crossingId || focus.crossingId !== crossingId) return false;
  if (node.kind === "page") return Boolean(node.evidenceId && node.evidenceId === focus.evidenceId);
  return Boolean(node.stage && focus.stage === node.stage && !focus.evidenceId);
}

function FlowNodeCard({
  node,
  selected,
  onClick,
}: {
  node: FlowNode;
  selected: boolean;
  onClick: () => void;
}) {
  const score = scoreDisplay(node.score, node.tone);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flow-node absolute flex rounded-[14px] border text-left transition-transform hover:-translate-y-px ${
        node.kind === "agent"
          ? "border-[#ffab5e] bg-peach text-ink"
          : "border-[#d7e3d6] bg-[#f7f8f2] text-ink"
      } ${node.active ? "is-active" : ""} ${selected ? "is-selected" : ""}`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
      aria-label={
        node.kind === "stage"
          ? `${node.label} ${score}`
          : node.kind === "page"
            ? `Evidence ${node.label}`
            : `Agent ${node.label}`
      }
    >
      <span
        className="flow-port flow-port-in"
        style={{ background: node.kind === "agent" ? "var(--peach-2)" : TONE_STROKE[node.tone] }}
      />
      <span
        className="flow-port flow-port-out"
        style={{ background: node.kind === "agent" ? "var(--peach-2)" : TONE_STROKE[node.tone] }}
      />
      <span
        className="w-1.5 self-stretch rounded-l-[12px]"
        style={{ background: node.kind === "agent" ? "var(--ink)" : TONE_STROKE[node.tone] }}
      />
      <span className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold ${
            node.kind === "agent"
              ? "bg-ink text-peach"
              : node.kind === "page"
                ? "bg-mint text-ink"
                : "bg-[#e7eee6] text-ink"
          }`}
        >
          {node.kind === "agent" ? "AG" : node.kind === "page" ? "URL" : node.sublabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
            {node.kind === "stage" ? node.label : node.kind === "agent" ? "Agent" : "Page"}
          </span>
          <span className="block truncate text-[15px] font-semibold leading-tight">
            {node.kind === "stage" ? (
              <span className={TONE_TEXT[node.tone]}>{score}</span>
            ) : (
              node.label
            )}
          </span>
          {node.kind !== "stage" && node.sublabel ? (
            <span className="block truncate text-[11px] text-mute">{node.sublabel}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function CrossingRail({
  crossings,
  selectedId,
  onSelect,
}: {
  crossings: CrossingView[];
  selectedId: string | null;
  onSelect: (crossingId: string) => void;
}) {
  if (!crossings.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {crossings.map((crossing) => {
        const active = crossing.id === selectedId;
        return (
          <button
            key={crossing.id}
            type="button"
            onClick={() => onSelect(crossing.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
              active
                ? "border-ink bg-mint shadow-[inset_0_0_0_1px_var(--ink)]"
                : "border-line bg-paper hover:border-ink"
            }`}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-mute">
              {crossing.site?.role === "client" ? "you" : "rival"}
            </span>
            <span className="text-sm">
              {crossing.site?.domain} · {crossing.route?.name}
            </span>
            <span className="font-mono text-[12px] font-bold">
              {crossing.overallScore ?? "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
