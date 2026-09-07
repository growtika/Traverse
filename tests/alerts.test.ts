import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "traverse-alrt-"));
process.env.TRAVERSE_DATA_DIR = dir;

const { DEFAULT_SETTINGS } = await import("../src/lib/defaults");
const { insertCrossing, insertRun, listAlertEvents, updateRun } = await import("../src/lib/db");
const { evaluateAlerts } = await import("../src/lib/alerts");

function seedRun(id: string, createdAt: string, overall: number) {
  insertRun({
    id,
    status: "queued",
    siteIds: ["sit_demo"],
    routeIds: ["rte_demo"],
    settingsSnapshot: DEFAULT_SETTINGS,
    progress: { current: 1, total: 1, message: "Completed" },
    createdAt,
  });
  updateRun(id, {
    status: "completed",
    startedAt: createdAt,
    finishedAt: createdAt,
  });
  insertCrossing({
    id: `xng_${id}`,
    runId: id,
    siteId: "sit_demo",
    routeId: "rte_demo",
    crossingIndex: 0,
    status: "completed",
    knowScore: overall,
    findScore: overall,
    extractScore: overall,
    verifyScore: overall,
    actScore: overall,
    overallScore: overall,
    passed: overall >= 60,
    journal: [],
    fixes: [],
    error: null,
  });
}

describe("alert loop uses stored run diffs", () => {
  it("does not invent an event on the first completed run", async () => {
    seedRun("run_first", "2026-01-01T00:00:00.000Z", 80);
    await evaluateAlerts("run_first");
    expect(listAlertEvents()).toHaveLength(0);
  });

  it("fires an in-app event when overall drops past the watcher threshold", async () => {
    seedRun("run_high", "2026-01-02T00:00:00.000Z", 80);
    seedRun("run_low", "2026-01-03T00:00:00.000Z", 50);
    await evaluateAlerts("run_low");
    const events = listAlertEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].title).toMatch(/dropped 30 pts/i);
    expect(events[0].slackStatus).toBe("skipped");
    expect(events[0].detail).toMatch(/Previous 80 → current 50/);
  });

  it("does not fire when the drop is below the watcher threshold", async () => {
    seedRun("run_a", "2026-01-04T00:00:00.000Z", 80);
    seedRun("run_b", "2026-01-05T00:00:00.000Z", 75);
    const before = listAlertEvents().length;
    await evaluateAlerts("run_b");
    expect(listAlertEvents()).toHaveLength(before);
  });
});
