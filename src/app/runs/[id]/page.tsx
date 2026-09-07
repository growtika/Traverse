"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EvidenceFrame } from "@/components/EvidenceFrame";
import { Card, PageHead, Score } from "@/components/ui";
import type { Crossing, EvidencePage, Route, Run, Site } from "@/lib/types";

type CrossingView = Crossing & {
  site: Site | null;
  route: Route | null;
  evidence: EvidencePage[];
};

type Payload = {
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
};

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<"map" | "journal" | "evidence" | "fixes">("map");

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/runs/${params.id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (alive) setData(json);
      if (json.run.status === "queued" || json.run.status === "running") {
        window.setTimeout(tick, 800);
      }
    };
    tick();
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (!data) return <p className="text-mute">Loading run…</p>;
  const { run, summary, crossings } = data;

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

      <div className="mb-6 h-2 border border-line">
        <div
          className="h-full bg-paper"
          style={{
            width: `${run.progress.total ? (run.progress.current / run.progress.total) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-6">
        <Card className="p-4"><Score value={summary.overall} label="Overall" /></Card>
        <Card className="p-4"><Score value={summary.know} label="Know" /></Card>
        <Card className="p-4"><Score value={summary.find} label="Find" /></Card>
        <Card className="p-4"><Score value={summary.extract} label="Extract" /></Card>
        <Card className="p-4"><Score value={summary.verify} label="Verify" empty="N/A" /></Card>
        <Card className="p-4"><Score value={summary.act} label="Act" /></Card>
      </div>

      <div className="mb-4 flex gap-4 font-mono text-[12px] uppercase tracking-[0.14em] text-mute">
        {(["map", "journal", "evidence", "fixes"] as const).map((id) => (
          <button key={id} onClick={() => setTab(id)} className={tab === id ? "text-paper" : ""}>
            {id}
          </button>
        ))}
      </div>

      {tab === "map" ? <Map crossings={crossings} /> : null}
      {tab === "journal" ? <Journal crossings={crossings} /> : null}
      {tab === "evidence" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {crossings.flatMap((c) => c.evidence).length === 0 ? (
            <p className="text-mute">No evidence frames yet.</p>
          ) : (
            crossings.flatMap((c) =>
              c.evidence.map((page) => <EvidenceFrame key={page.id} page={page} />),
            )
          )}
        </div>
      ) : null}
      {tab === "fixes" ? <Fixes crossings={crossings} /> : null}
    </div>
  );
}

function Map({ crossings }: { crossings: CrossingView[] }) {
  if (!crossings.length) return <p className="text-mute">Waiting for the first crossing…</p>;
  return (
    <div className="grid gap-3">
      {crossings.map((c) => (
        <Card key={c.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
                {c.site?.domain} · {c.route?.name} · x{c.crossingIndex + 1}
              </div>
              <div className="text-[#cfc3a8]">
                {c.status === "failed" ? c.error : c.passed ? "Held the path" : "Lost the path"}
              </div>
            </div>
            <div className="flex gap-4 font-mono text-sm">
              <span>K {c.knowScore ?? "—"}</span>
              <span>F {c.findScore ?? "—"}</span>
              <span>E {c.extractScore ?? "—"}</span>
              <span>V {c.verifyScore ?? "N/A"}</span>
              <span>A {c.actScore ?? "—"}</span>
              <span className="text-paper">{c.overallScore ?? "—"}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Journal({ crossings }: { crossings: CrossingView[] }) {
  const events = crossings.flatMap((c) =>
    c.journal.map((j) => ({
      ...j,
      where: `${c.site?.domain} / ${c.route?.name} / x${c.crossingIndex + 1}`,
    })),
  );
  if (!events.length) return <p className="text-mute">Journal is empty until fetches land.</p>;
  return (
    <Card>
      {events.map((event, i) => (
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

function Fixes({ crossings }: { crossings: CrossingView[] }) {
  const fixes = crossings.flatMap((c) =>
    c.fixes.map((f) => ({ ...f, where: `${c.site?.domain} · ${c.route?.name}` })),
  );
  if (!fixes.length) return <p className="text-mute">No bridge list yet — either the path held, or the crawl has not finished.</p>;
  return (
    <div className="grid gap-3">
      {fixes.map((fix, i) => (
        <Card key={`${fix.title}-${i}`} className="px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
            {fix.severity} · {fix.stage} · {fix.where}
          </div>
          <div className="text-xl">{fix.title}</div>
          <p className="text-[#cfc3a8]">{fix.detail}</p>
        </Card>
      ))}
    </div>
  );
}
