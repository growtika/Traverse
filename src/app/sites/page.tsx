"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Empty, Field, PageHead, inputClass } from "@/components/ui";
import type { Site, SiteRole } from "@/lib/types";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<SiteRole>("client");
  const [error, setError] = useState("");

  const load = () => fetch("/api/sites").then((r) => r.json()).then((d) => setSites(d.sites));
  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain, name, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add site");
      return;
    }
    setDomain("");
    setName("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    load();
  }

  async function setRoleFor(id: string, next: SiteRole) {
    await fetch(`/api/sites/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    load();
  }

  return (
    <div>
      <PageHead
        kicker="Public hostnames only"
        title="Sites & rivals"
        lede="Client sites are the company under survey. Rivals are crawled the same way: public pages, no login."
      />
      <Card className="mb-8 p-5">
        <form onSubmit={onAdd} className="grid gap-4 md:grid-cols-4">
          <Field label="Domain">
            <input
              className={inputClass}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </Field>
          <Field label="Label">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional name"
            />
          </Field>
          <Field label="Role">
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as SiteRole)}>
              <option value="client">Client</option>
              <option value="rival">Rival</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add site</Button>
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-rust">{error}</p> : null}
      </Card>

      {sites.length === 0 ? (
        <Empty
          title="Workspace is empty"
          detail="Add a bare public domain to begin. Localhost and raw IPs are rejected."
        />
      ) : (
        <div className="grid gap-3">
          {sites.map((site) => (
            <Card key={site.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                {site.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.faviconUrl} alt="" width={18} height={18} />
                ) : (
                  <span className="h-[18px] w-[18px] border border-line" />
                )}
                <div>
                  <div>{site.name}</div>
                  <div className="font-mono text-[12px] text-mute">{site.domain}{site.startPath !== "/" ? site.startPath : ""}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  className={inputClass}
                  value={site.role}
                  onChange={(e) => setRoleFor(site.id, e.target.value as SiteRole)}
                >
                  <option value="client">Client</option>
                  <option value="rival">Rival</option>
                </select>
                <Button kind="ghost" onClick={() => remove(site.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
