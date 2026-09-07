"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Empty, Field, PageHead, inputClass } from "@/components/ui";
import type { AnswerKey, Route, Site } from "@/lib/types";

export default function KeysPage() {
  const [keys, setKeys] = useState<AnswerKey[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [claim, setClaim] = useState("");
  const [expected, setExpected] = useState("");
  const [siteId, setSiteId] = useState("");
  const [routeId, setRouteId] = useState("");

  const load = async () => {
    const [k, s, r] = await Promise.all([
      fetch("/api/keys").then((x) => x.json()),
      fetch("/api/sites").then((x) => x.json()),
      fetch("/api/routes").then((x) => x.json()),
    ]);
    setKeys(k.keys);
    setSites(s.sites);
    setRoutes(r.routes);
  };
  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claim,
        expected,
        siteId: siteId || null,
        routeId: routeId || null,
      }),
    });
    setClaim("");
    setExpected("");
    load();
  }

  return (
    <div>
      <PageHead
        kicker="Verify strictness"
        title="Answer keys"
        lede="Keys are checked against captured public text. Strictness (loose / normal / strict) is a real runtime setting."
      />
      <Card className="mb-8 p-5">
        <form onSubmit={onAdd} className="grid gap-4 md:grid-cols-2">
          <Field label="Claim">
            <input className={inputClass} value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="Public pricing exists" />
          </Field>
          <Field label="Expected phrase">
            <input className={inputClass} value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="example" />
          </Field>
          <Field label="Site scope">
            <select className={inputClass} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.domain}</option>
              ))}
            </select>
          </Field>
          <Field label="Route scope">
            <select className={inputClass} value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">All routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </Field>
          <div>
            <Button type="submit">Add key</Button>
          </div>
        </form>
      </Card>
      {keys.length === 0 ? (
        <Empty
          title="No keys yet"
          detail="Verify scores stay N/A until you add at least one expected phrase. That is intentional, not a fake 100."
        />
      ) : (
        <div className="grid gap-3">
          {keys.map((key) => (
            <Card key={key.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <div>{key.claim}</div>
                <div className="font-mono text-[12px] text-mute">expect “{key.expected}”</div>
              </div>
              <Button
                kind="ghost"
                onClick={async () => {
                  await fetch(`/api/keys/${key.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
