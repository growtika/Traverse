"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Empty, PageHead } from "@/components/ui";
import { readCachedSites, rememberSites } from "@/lib/client-cache";
import type { Route, Settings, Site } from "@/lib/types";

export default function SurveyPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([s, r, st]) => {
      const latest = rememberSites(s.sites, readCachedSites());
      setSites(latest);
      setRoutes(r.routes);
      setSettings(st.settings);
      setSiteIds(latest.map((x) => x.id));
      setRouteIds(r.routes.filter((x: Route) => x.enabled).map((x: Route) => x.id));
    });
  }, []);

  function toggle(list: string[], id: string, setter: (v: string[]) => void) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function start() {
    setBusy(true);
    setError("");
    let latest = sites.length ? sites : readCachedSites();
    let ids = siteIds;
    try {
      const fresh = await fetch("/api/sites").then((r) => r.json());
      const serverSites: Site[] = fresh.sites ?? [];
      latest = rememberSites(serverSites, latest);
      setSites(latest);
      if (serverSites.length) {
        const kept = ids.filter((id) => latest.some((site) => site.id === id));
        ids = kept.length ? kept : latest.map((site) => site.id);
        setSiteIds(ids);
      } else if (!ids.length) {
        ids = latest.map((site) => site.id);
        setSiteIds(ids);
      }
    } catch {
      latest = latest.length ? latest : readCachedSites();
    }

    const selectedClients = latest.filter((site) => ids.includes(site.id) && site.role === "client");
    if (!latest.length || !selectedClients.length) {
      setError(
        latest.length
          ? "Select at least one client site before starting a survey."
          : "Sites did not persist — re-add a client site",
      );
      setBusy(false);
      return;
    }

    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteIds: ids, routeIds, sites: latest }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not start");
      return;
    }
    router.push(`/runs/${data.run.id}`);
  }

  return (
    <div>
      <PageHead
        kicker="Real public fetches"
        title="Configure survey"
        lede="This starts a live crawl of the selected public domains. It never logs in and never submits forms."
      />
      {sites.length === 0 ? (
        <Empty title="Need a site first" detail="Add a public domain on Sites, then come back here." />
      ) : (
        <>
          {settings ? (
            <p className="mb-6 font-mono text-[12px] text-mute">
              Agent {settings.agentLabel} · {settings.speed} · {settings.crossingsPerRoute} crossing
              {settings.crossingsPerRoute === 1 ? "" : "s"}/route · verify {settings.verifyStrictness} ·
              max {settings.maxPagesPerCrossing} pages · robots{" "}
              {settings.respectRobots ? "on" : "off"} · rivals {settings.includeRivals ? "included" : "skipped"}
            </p>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-3 text-2xl font-bold tracking-tight">Sites</h2>
              {sites.map((site) => (
                <label key={site.id} className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={siteIds.includes(site.id)}
                    onChange={() => toggle(siteIds, site.id, setSiteIds)}
                  />
                  <span>
                    {site.domain} <span className="text-mute">({site.role})</span>
                  </span>
                </label>
              ))}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-2xl font-bold tracking-tight">Routes</h2>
              {routes.map((route) => (
                <label key={route.id} className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeIds.includes(route.id)}
                    onChange={() => toggle(routeIds, route.id, setRouteIds)}
                  />
                  <span>{route.name}</span>
                </label>
              ))}
            </Card>
          </div>
          <div className="mt-6">
            <Button onClick={start} disabled={busy}>
              {busy ? "Starting…" : "Start real survey"}
            </Button>
            {error ? <p className="mt-3 text-rust">{error}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
