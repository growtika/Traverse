"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Delta, Empty, PageHead, Score, pillLinkClass } from "@/components/ui";
import type { Site } from "@/lib/types";

type Overview = {
  runCount: number;
  completedCount: number;
  honesty: string;
  latestSummary: null | {
    overall: number | null;
    know: number | null;
    find: number | null;
    extract: number | null;
    verify: number | null;
    act: number | null;
    passRate: number | null;
  };
  deltas: null | Record<string, number | null>;
  latestRun: null | { id: string; createdAt: string; status: string };
  siteRows: Array<{
    site: Site;
    latest: { overall: number | null } | null;
    delta: number | null;
    crossings: number;
  }>;
};

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-mute">Loading stored runs…</p>;

  return (
    <div>
      <PageHead
        kicker="Single-tenant demo workspace"
        title="Overview"
        lede="Every number here is derived from stored public crawls. Nothing is invented for the empty week."
        action={
          <Link href="/survey" className={pillLinkClass}>
            Send the agent
          </Link>
        }
      />

      {data.completedCount === 0 ? (
        <Empty
          title="No surveys yet"
          detail="Add a public site, then start a survey. Overview stays blank until a real fetch finishes."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <Score value={data.latestSummary?.overall} label="Latest overall" />
            </Card>
            <Card className="p-4">
              <Score value={data.latestSummary?.know} label="Know" />
            </Card>
            <Card className="p-4">
              <Score value={data.latestSummary?.find} label="Find" />
            </Card>
            <Card className="p-4">
              <Score value={data.latestSummary?.extract} label="Extract" />
            </Card>
            <Card className="p-4">
              <Score value={data.latestSummary?.verify} label="Verify" empty="N/A" />
            </Card>
            <Card className="p-4">
              <Score value={data.latestSummary?.act} label="Act" />
            </Card>
          </div>
          <p className="mt-4 font-mono text-[12px] text-mute">
            {data.latestRun ? (
              <Link href={`/runs/${data.latestRun.id}`} className="underline">
                Latest run {data.latestRun.id}
              </Link>
            ) : null}{" "}
            · {data.completedCount} completed / {data.runCount} total ·{" "}
            <Delta value={data.deltas?.overall} />
          </p>
        </>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-2xl font-bold tracking-tight">Sites</h2>
        {data.siteRows.length === 0 ? (
          <Empty title="No sites" detail="Add a client domain on the Sites page." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th>Role</th>
                  <th>Latest score</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {data.siteRows.map((row) => (
                  <tr key={row.site.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.site.faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.site.faviconUrl} alt="" width={14} height={14} />
                        ) : null}
                        {row.site.domain}
                      </div>
                    </td>
                    <td className="capitalize text-mute">{row.site.role}</td>
                    <td className="font-mono">{row.latest?.overall ?? "—"}</td>
                    <td>
                      <Delta value={row.delta} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      <p className="mt-6 max-w-2xl text-sm text-mute">{data.honesty}</p>
    </div>
  );
}
