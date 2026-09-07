"use client";

import { useEffect, useState } from "react";
import { Card, PageHead } from "@/components/ui";
import type { Route } from "@/lib/types";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const load = () => fetch("/api/routes").then((r) => r.json()).then((d) => setRoutes(d.routes));
  useEffect(() => {
    load();
  }, []);

  async function toggle(route: Route) {
    await fetch(`/api/routes/${route.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !route.enabled }),
    });
    load();
  }

  return (
    <div>
      <PageHead
        kicker="Buyer journeys"
        title="Routes"
        lede="Seven default journeys. Disabled routes are skipped on the next real survey. Crossings per route live in Settings."
      />
      <div className="grid gap-3">
        {routes.map((route) => (
          <Card key={route.id} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
                  {String(route.sortOrder).padStart(2, "0")} · {route.slug}
                </div>
                <h2 className="text-2xl">{route.name}</h2>
                <p className="mt-1 max-w-2xl text-mute">{route.intent}</p>
                <p className="mt-2 font-mono text-[12px] text-mute">
                  terms: {route.queryTerms.join(", ")}
                </p>
              </div>
              <button
                onClick={() => toggle(route)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] ${
                  route.enabled
                    ? "border-trail bg-mint text-ink"
                    : "border-line bg-paper text-mute"
                }`}
              >
                {route.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
