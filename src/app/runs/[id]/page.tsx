"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ResultsWorkspace } from "@/components/results/ResultsWorkspace";
import type { CrossingView } from "@/lib/results-viz";
import type { Run } from "@/lib/types";

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
  return <ResultsWorkspace run={data.run} summary={data.summary} crossings={data.crossings} />;
}
