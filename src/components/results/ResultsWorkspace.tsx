"use client";

import { useEffect, useMemo, useState } from "react";
import { EvidenceFrame } from "@/components/EvidenceFrame";
import { Card, PageHead, Score, sectionLinkClass } from "@/components/ui";
import { ComparisonBars } from "@/components/results/ComparisonBars";
import { CrossingRail, FlowCanvas } from "@/components/results/FlowCanvas";
import { HeatTiles, StageTracks } from "@/components/results/StageTrack";
import {
  pickFocusCrossing,
  tabFromHash,
  type CrossingView,
  type ResultsFocus,
  type ResultsTab,
} from "@/lib/results-viz";
import type { Run } from "@/lib/types";

const TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: "map", label: "Map" },
  { id: "journal", label: "Journal" },
  { id: "evidence", label: "Evidence" },
  { id: "fixes", label: "Fixes" },
];

export function ResultsWorkspace({
  run,
  summary,
  crossings,
}: {
  run: Run;
  summary: {
    overall: number | null;
    know: number | null;
    find: number | null;
    extract: number | null;
    verify: number | null;
    act: number | null;
  };
  crossings: CrossingView[];
}) {
  const [tab, setTab] = useState<ResultsTab>("map");
  const [focus, setFocus] = useState<ResultsFocus>({ crossingId: null, stage: null });

  useEffect(() => {
    const fromHash = tabFromHash(window.location.hash);
    if (fromHash) setTab(fromHash);
  }, []);

  useEffect(() => {
    setFocus((current) => {
      const next = pickFocusCrossing(crossings, current.crossingId);
      if (!next) return { crossingId: null, stage: current.stage };
      if (current.crossingId === next.id) return current;
      return { crossingId: next.id, stage: current.stage };
    });
  }, [crossings]);

  const focusedCrossing = useMemo(
    () => pickFocusCrossing(crossings, focus.crossingId),
    [crossings, focus.crossingId],
  );

  function openTab(next: ResultsTab) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  }

  function select(next: ResultsFocus, nextTab?: ResultsTab) {
    setFocus(next);
    if (nextTab) openTab(nextTab);
  }

  return (
    <div>
      <PageHead
        kicker={run.status}
        title="Survey results"
        lede={`${run.progress.message}. Agent ${run.settingsSnapshot.agentLabel}, ${run.settingsSnapshot.speed}, ${run.settingsSnapshot.crossingsPerRoute} crossing(s)/route.`}
      />

      {run.status === "failed" ? (
        <Card className="mb-6 p-4 text-rust">{run.error || "Run failed."}</Card>
      ) : null}

      <div className="mb-6 h-2 overflow-hidden rounded-full border border-line bg-paper">
        <div
          className="h-full bg-peach transition-[width] duration-500"
          style={{
            width: `${run.progress.total ? (run.progress.current / run.progress.total) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-6">
        <Card className="p-4">
          <Score value={summary.overall} label="Overall" />
        </Card>
        <Card className="p-4">
          <Score value={summary.know} label="Know" />
        </Card>
        <Card className="p-4">
          <Score value={summary.find} label="Find" />
        </Card>
        <Card className="p-4">
          <Score value={summary.extract} label="Extract" />
        </Card>
        <Card className="p-4">
          <Score value={summary.verify} label="Verify" empty="N/A" />
        </Card>
        <Card className="p-4">
          <Score value={summary.act} label="Act" />
        </Card>
      </div>

      <div className="mb-6">
        <ComparisonBars crossings={crossings} />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openTab(item.id)}
            className={
              tab === item.id
                ? "rounded-lg bg-mint px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-ink shadow-[inset_0_0_0_1px_var(--ink)]"
                : sectionLinkClass
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      {focus.stage || focus.evidenceId ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-mute">
            Focus
          </span>
          <span>
            {focusedCrossing?.site?.domain} / {focusedCrossing?.route?.name}
            {focus.stage ? ` · ${focus.stage}` : ""}
          </span>
          <button
            type="button"
            className="ml-auto font-mono text-[11px] uppercase tracking-[0.08em] text-mute underline"
            onClick={() => setFocus({ crossingId: focusedCrossing?.id ?? null, stage: null })}
          >
            Clear
          </button>
        </div>
      ) : null}

      {tab === "map" ? (
        <section id="map" className="grid gap-5">
          <FlowCanvas
            crossing={focusedCrossing}
            agentLabel={run.settingsSnapshot.agentLabel}
            focus={focus}
            onSelect={select}
          />
          <CrossingRail
            crossings={crossings}
            selectedId={focusedCrossing?.id ?? null}
            onSelect={(crossingId) => select({ crossingId, stage: focus.stage })}
          />
          <StageTracks crossings={crossings} focus={focus} onSelect={select} />
          <HeatTiles crossings={crossings} focus={focus} onSelect={select} />
        </section>
      ) : null}

      {tab === "journal" ? (
        <section id="journal">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">Journal</h2>
          <Journal crossings={crossings} focus={focus} />
        </section>
      ) : null}

      {tab === "evidence" ? (
        <section id="evidence">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">Evidence</h2>
          <EvidenceGrid crossings={crossings} focus={focus} />
        </section>
      ) : null}

      {tab === "fixes" ? (
        <section id="fixes">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">Fixes</h2>
          <Fixes crossings={crossings} />
        </section>
      ) : null}
    </div>
  );
}

function Journal({
  crossings,
  focus,
}: {
  crossings: CrossingView[];
  focus: ResultsFocus;
}) {
  const events = crossings.flatMap((crossing) =>
    crossing.journal.map((event) => ({
      ...event,
      crossingId: crossing.id,
      where: `${crossing.site?.domain} / ${crossing.route?.name} / x${crossing.crossingIndex + 1}`,
    })),
  );
  const visible = events.filter((event) => {
    if (focus.crossingId && event.crossingId !== focus.crossingId) return false;
    if (focus.stage && event.stage !== focus.stage && event.stage !== "run") return false;
    return true;
  });
  if (!visible.length) return <p className="text-mute">Journal is empty until fetches land.</p>;
  return (
    <Card>
      {visible.map((event, i) => (
        <div key={`${event.t}-${i}`} className="border-t border-line px-4 py-3 first:border-t-0">
          <div className="font-mono text-[11px] text-mute">
            {event.stage} · {event.where}
          </div>
          <div>{event.message}</div>
        </div>
      ))}
    </Card>
  );
}

function EvidenceGrid({
  crossings,
  focus,
}: {
  crossings: CrossingView[];
  focus: ResultsFocus;
}) {
  const pages = crossings.flatMap((crossing) =>
    crossing.evidence.map((page) => ({ page, crossingId: crossing.id })),
  );
  const visible = pages.filter((item) => {
    if (focus.evidenceId) return item.page.id === focus.evidenceId;
    if (focus.crossingId && item.crossingId !== focus.crossingId) return false;
    if (focus.stage && focus.stage !== "run" && item.page.stage !== focus.stage) return false;
    return true;
  });
  if (!visible.length) return <p className="text-mute">No evidence frames yet.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visible.map(({ page }) => (
        <div key={page.id} id={`evidence-${page.id}`}>
          <EvidenceFrame page={page} highlight={page.id === focus.evidenceId} />
        </div>
      ))}
    </div>
  );
}

function Fixes({ crossings }: { crossings: CrossingView[] }) {
  const fixes = crossings.flatMap((crossing) =>
    crossing.fixes.map((fix) => ({
      ...fix,
      where: `${crossing.site?.domain} · ${crossing.route?.name}`,
    })),
  );
  if (!fixes.length) {
    return (
      <p className="text-mute">
        No bridge list yet — either the path held, or the crawl has not finished.
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      {fixes.map((fix, i) => (
        <Card key={`${fix.title}-${i}`} className="px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
            {fix.severity} · {fix.stage} · {fix.where}
          </div>
          <div className="text-xl">{fix.title}</div>
          <p className="text-mute">{fix.detail}</p>
        </Card>
      ))}
    </div>
  );
}
