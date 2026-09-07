"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Field, PageHead, inputClass } from "@/components/ui";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSettings(data.settings);
    setSaved("Saved. The next survey uses these values — this is not cosmetic.");
  }

  if (!settings) return <p className="text-mute">Loading settings…</p>;

  return (
    <div>
      <PageHead
        kicker="Runtime, not cosplay"
        title="Settings"
        lede="Agent label becomes the crawler User-Agent. Speed is the delay between fetches. Crossings repeat each route. Verify strictness grades answer keys."
      />
      <Card className="p-5">
        <form onSubmit={onSave} className="grid max-w-xl gap-4">
          <Field label="Agent label">
            <input
              className={inputClass}
              value={settings.agentLabel}
              onChange={(e) => setSettings({ ...settings, agentLabel: e.target.value })}
            />
          </Field>
          <Field label="Speed">
            <select
              className={inputClass}
              value={settings.speed}
              onChange={(e) => setSettings({ ...settings, speed: e.target.value as Settings["speed"] })}
            >
              <option value="careful">Careful (800ms between fetches)</option>
              <option value="measured">Measured (250ms)</option>
              <option value="fast">Fast (50ms)</option>
            </select>
          </Field>
          <Field label="Crossings per route">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={5}
              value={settings.crossingsPerRoute}
              onChange={(e) =>
                setSettings({ ...settings, crossingsPerRoute: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Verify strictness">
            <select
              className={inputClass}
              value={settings.verifyStrictness}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  verifyStrictness: e.target.value as Settings["verifyStrictness"],
                })
              }
            >
              <option value="loose">Loose — token overlap</option>
              <option value="normal">Normal — phrase must appear</option>
              <option value="strict">Strict — phrase must appear (normalized)</option>
            </select>
          </Field>
          <Field label="Max pages per crossing">
            <input
              className={inputClass}
              type="number"
              min={2}
              max={12}
              value={settings.maxPagesPerCrossing}
              onChange={(e) =>
                setSettings({ ...settings, maxPagesPerCrossing: Number(e.target.value) })
              }
            />
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.respectRobots}
              onChange={(e) => setSettings({ ...settings, respectRobots: e.target.checked })}
            />
            Respect robots.txt
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.includeRivals}
              onChange={(e) => setSettings({ ...settings, includeRivals: e.target.checked })}
            />
            Include rivals when a survey does not pick sites by hand
          </label>
          <Field label="Slack webhook (optional, stored locally)">
            <input
              className={inputClass}
              value={settings.slackWebhookUrl}
              onChange={(e) => setSettings({ ...settings, slackWebhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/..."
            />
          </Field>
          <p className="text-sm text-mute">
            Slack delivery also reads SLACK_WEBHOOK_URL if set in the environment. In-app alerts work without it.
          </p>
          <Button type="submit">Save settings</Button>
          {saved ? <p className="text-moss">{saved}</p> : null}
        </form>
      </Card>
    </div>
  );
}
