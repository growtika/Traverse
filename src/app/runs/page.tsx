"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Empty, PageHead } from "@/components/ui";
import type { Run } from "@/lib/types";

type Row = Run & { summary: { overall: number | null } | null };

export default function RunsPage() {
  const [runs, setRuns] = useState<Row[]>([]);
  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => setRuns(d.runs));
  }, []);

  return (
    <div>
      <PageHead
        kicker="Stored history"
        title="Runs"
        lede="Every survey is persisted. Open one for the map, journal, evidence frames, and fixes."
      />
      {runs.length === 0 ? (
        <Empty title="No runs stored" detail="Start a survey to create the first durable record." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
              <tr>
                <th className="px-4 py-3">Run</th>
                <th>Status</th>
                <th>Score</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="underline">
                      {run.id}
                    </Link>
                  </td>
                  <td>{run.status}</td>
                  <td className="font-mono">{run.summary?.overall ?? "—"}</td>
                  <td className="text-mute">{new Date(run.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
