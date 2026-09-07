"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Empty, Field, PageHead, inputClass } from "@/components/ui";
import type { AlertEvent, AlertMetric, AlertWatcher, Site } from "@/lib/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertWatcher[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState("Score drop");
  const [metric, setMetric] = useState<AlertMetric>("overall");
  const [dropPoints, setDropPoints] = useState(10);
  const [siteId, setSiteId] = useState("");

  const load = async () => {
    const [a, s] = await Promise.all([
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/sites").then((r) => r.json()),
    ]);
    setAlerts(a.alerts);
    setEvents(a.events);
    setSites(s.sites);
  };
  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, metric, dropPoints, siteId: siteId || null }),
    });
    load();
  }

  return (
    <div>
      <PageHead
        kicker="Run diffs only"
        title="Alerts"
        lede="Watchers fire from stored run-to-run drops. Slack is used only when a webhook env var is present; in-app events always persist."
      />
      <Card className="mb-8 p-5">
        <form onSubmit={onAdd} className="grid gap-4 md:grid-cols-4">
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Metric">
            <select className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value as AlertMetric)}>
              <option value="overall">Overall</option>
              <option value="know">Know</option>
              <option value="find">Find</option>
              <option value="extract">Extract</option>
              <option value="verify">Verify</option>
              <option value="act">Act</option>
              <option value="route_pass_rate">Route pass rate</option>
            </select>
          </Field>
          <Field label="Drop points">
            <input
              className={inputClass}
              type="number"
              value={dropPoints}
              onChange={(e) => setDropPoints(Number(e.target.value))}
            />
          </Field>
          <Field label="Site">
            <select className={inputClass} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.domain}</option>
              ))}
            </select>
          </Field>
          <Button type="submit">Add watcher</Button>
        </form>
      </Card>

      <h2 className="mb-3 text-2xl font-bold tracking-tight">Watchers</h2>
      <div className="mb-8 grid gap-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="flex items-center justify-between px-4 py-3">
            <div>
              {alert.name} · {alert.metric} drops {alert.dropPoints}+
            </div>
            <Button
              kind="ghost"
              onClick={async () => {
                await fetch(`/api/alerts/${alert.id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ enabled: !alert.enabled }),
                });
                load();
              }}
            >
              {alert.enabled ? "On" : "Off"}
            </Button>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-2xl font-bold tracking-tight">Events</h2>
      {events.length === 0 ? (
        <Empty
          title="No alert events"
          detail="Events appear after a completed run drops versus the previous completed run."
        />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="px-4 py-3">
              <div className="font-mono text-[11px] text-mute">
                Slack: {event.slackStatus} · {new Date(event.createdAt).toLocaleString()}
              </div>
              <div>{event.title}</div>
              <p className="text-mute">{event.detail}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
