import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "traverse-rt-"));
process.env.TRAVERSE_DATA_DIR = dir;

const { insertAnswerKey, insertSite, listCrossings, updateSettings } = await import("../src/lib/db");
const { createAndStartRun, getRunJob } = await import("../src/lib/survey");
const { faviconCandidates, normalizeDomainInput } = await import("../src/lib/domain");

describe("settings change real survey runtime", () => {
  beforeEach(() => {
    const parsed = normalizeDomainInput("example.com");
    insertSite({
      name: "Example",
      domain: parsed.domain,
      role: "client",
      startPath: "/",
      faviconUrl: faviconCandidates(parsed.domain)[1],
      notes: "",
    });
    insertAnswerKey({
      siteId: null,
      routeId: null,
      claim: "It is the example domain",
      expected: "example domain",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses crossingsPerRoute and answer keys on a live public crawl", async () => {
    updateSettings({ crossingsPerRoute: 2, speed: "fast", verifyStrictness: "normal" });
    const run = createAndStartRun();
    await getRunJob(run.id);
    const crossings = listCrossings(run.id);
    expect(crossings.length).toBe(14);
    expect(crossings.every((c) => c.crossingIndex === 0 || c.crossingIndex === 1)).toBe(true);
    expect(crossings.some((c) => c.verifyScore === 100)).toBe(true);
    expect(crossings.every((c) => c.verifyScore !== null)).toBe(true);
  });
});
