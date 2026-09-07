import {
  getSettings,
  insertAlertEvent,
  listAlerts,
  listCrossings,
  listSites,
  nowIso,
  previousCompletedRun,
} from "./db";
import { average } from "./grade";
import { newId } from "./id";
import type { AlertEvent, AlertMetric, Crossing } from "./types";

export async function evaluateAlerts(runId: string) {
  const previous = previousCompletedRun(runId);
  if (!previous) return;

  const currentCrossings = listCrossings(runId);
  const previousCrossings = listCrossings(previous.id);
  const watchers = listAlerts().filter((w) => w.enabled);
  const sites = listSites();

  for (const watcher of watchers) {
    const siteFilter = watcher.siteId;
    const currentValue = metricValue(watcher.metric, currentCrossings, siteFilter);
    const previousValue = metricValue(watcher.metric, previousCrossings, siteFilter);
    if (currentValue === null || previousValue === null) continue;
    const drop = previousValue - currentValue;
    if (drop < watcher.dropPoints) continue;

    const siteName = siteFilter
      ? sites.find((s) => s.id === siteFilter)?.domain || "site"
      : "workspace";
    const event: AlertEvent = {
      id: newId("evt"),
      alertId: watcher.id,
      runId,
      title: `${watcher.name}: ${siteName} ${watcher.metric} dropped ${drop} pts`,
      detail: `Previous ${previousValue} → current ${currentValue}. Threshold is a drop of ${watcher.dropPoints}+ vs the last completed run.`,
      slackStatus: "skipped",
      createdAt: nowIso(),
      read: false,
    };

    const webhook =
      getSettings().slackWebhookUrl ||
      process.env.SLACK_WEBHOOK_URL ||
      process.env.TRAVERSE_SLACK_WEBHOOK ||
      "";
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: `${event.title}\n${event.detail}`,
          }),
        });
        event.slackStatus = res.ok ? "sent" : "failed";
      } catch {
        event.slackStatus = "failed";
      }
    }
    insertAlertEvent(event);
  }
}

function metricValue(
  metric: AlertMetric,
  crossings: Crossing[],
  siteId: string | null,
): number | null {
  const rows = siteId ? crossings.filter((c) => c.siteId === siteId) : crossings;
  if (!rows.length) return null;
  if (metric === "route_pass_rate") {
    const done = rows.filter((r) => r.passed !== null);
    if (!done.length) return null;
    return Math.round((done.filter((r) => r.passed).length / done.length) * 100);
  }
  const key =
    metric === "overall"
      ? "overallScore"
      : metric === "know"
        ? "knowScore"
        : metric === "find"
          ? "findScore"
          : metric === "extract"
            ? "extractScore"
            : metric === "verify"
              ? "verifyScore"
              : "actScore";
  return average(rows.map((r) => r[key]));
}

export function summarizeRun(crossings: Crossing[]) {
  return {
    overall: average(crossings.map((c) => c.overallScore)),
    know: average(crossings.map((c) => c.knowScore)),
    find: average(crossings.map((c) => c.findScore)),
    extract: average(crossings.map((c) => c.extractScore)),
    verify: average(crossings.map((c) => c.verifyScore)),
    act: average(crossings.map((c) => c.actScore)),
    passRate: crossings.length
      ? Math.round((crossings.filter((c) => c.passed).length / crossings.length) * 100)
      : null,
  };
}

export function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}
