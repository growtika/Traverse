import { describe, expect, it } from "vitest";
import {
  activeStage,
  buildComparisonRows,
  buildFlowGraph,
  buildHeatRows,
  crossingTitle,
  pickFocusCrossing,
  scoreDisplay,
  scoreTone,
  stageTone,
  tabFromHash,
  type CrossingView,
} from "../src/lib/results-viz";
import type { Crossing, EvidencePage, Route, Site } from "../src/lib/types";

function site(over: Partial<Site> = {}): Site {
  return {
    id: "sit_client",
    name: "Reco",
    domain: "reco.ai",
    role: "client",
    startPath: "/",
    faviconUrl: null,
    notes: "",
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function route(over: Partial<Route> = {}): Route {
  return {
    id: "rte_id",
    name: "Identity",
    slug: "identity",
    intent: "",
    queryTerms: [],
    pathHints: [],
    enabled: true,
    sortOrder: 1,
    ...over,
  };
}

function crossing(over: Partial<CrossingView> = {}): CrossingView {
  const base: Crossing = {
    id: "xng_1",
    runId: "run_1",
    siteId: "sit_client",
    routeId: "rte_id",
    crossingIndex: 0,
    status: "completed",
    knowScore: 100,
    findScore: 91,
    extractScore: 100,
    verifyScore: null,
    actScore: 25,
    overallScore: 79,
    passed: true,
    journal: [],
    fixes: [],
    error: null,
  };
  return {
    ...base,
    site: site(),
    route: route(),
    evidence: [],
    ...over,
  };
}

function evidence(over: Partial<EvidencePage> = {}): EvidencePage {
  return {
    id: "evd_1",
    crossingId: "xng_1",
    stage: "know",
    url: "https://reco.ai/",
    finalUrl: "https://reco.ai/",
    statusCode: 200,
    title: "Reco",
    excerpt: "Identity security",
    headings: [],
    links: [],
    forms: [],
    html: null,
    robotsAllowed: true,
    partial: false,
    label: "Captured public HTML",
    fetchedAt: "",
    error: null,
    ...over,
  };
}

describe("scoreTone", () => {
  it("does not invent a tone for missing scores", () => {
    expect(scoreTone(null)).toBe("pending");
    expect(scoreTone(undefined)).toBe("pending");
  });

  it("maps real scores onto the traffic palette", () => {
    expect(scoreTone(100)).toBe("good");
    expect(scoreTone(70)).toBe("good");
    expect(scoreTone(40)).toBe("warn");
    expect(scoreTone(25)).toBe("bad");
  });
});

describe("stageTone and activeStage", () => {
  it("treats unresolved verify as pending while a crossing is still running", () => {
    const running = crossing({
      status: "running",
      knowScore: 80,
      findScore: 70,
      extractScore: 60,
      verifyScore: null,
      actScore: null,
      overallScore: null,
      passed: null,
    });
    expect(stageTone(running, "verify")).toBe("pending");
    expect(activeStage(running)).toBe("verify");
  });

  it("marks verify N/A only after the stage resolves with no score", () => {
    const done = crossing({
      status: "completed",
      verifyScore: null,
      journal: [{ t: "", stage: "verify", message: "No answer keys configured — Verify is N/A, not a pass." }],
    });
    expect(stageTone(done, "verify")).toBe("na");
    expect(scoreDisplay(null, "na")).toBe("N/A");
    expect(activeStage(done)).toBeNull();
  });

  it("uses persisted scores instead of placeholders", () => {
    const row = crossing();
    expect(stageTone(row, "act")).toBe("bad");
    expect(scoreDisplay(row.actScore, "bad")).toBe("25");
  });
});

describe("buildComparisonRows", () => {
  it("labels the client as you and ranks from real overall scores", () => {
    const rows = buildComparisonRows([
      crossing({
        id: "xng_rival",
        siteId: "sit_rival",
        overallScore: 61,
        site: site({ id: "sit_rival", domain: "obsidiansecurity.com", role: "rival", name: "Obsidian" }),
      }),
      crossing({ overallScore: 79 }),
    ]);
    expect(rows[0]).toMatchObject({ you: true, label: "you · reco.ai", overall: 79 });
    expect(rows[1]).toMatchObject({ you: false, label: "obsidiansecurity.com", overall: 61 });
  });

  it("keeps null overall instead of filling a demo number", () => {
    const rows = buildComparisonRows([
      crossing({
        status: "running",
        overallScore: null,
        knowScore: null,
        findScore: null,
        extractScore: null,
        actScore: null,
        passed: null,
      }),
    ]);
    expect(rows).toEqual([
      expect.objectContaining({
        you: true,
        overall: null,
        stages: expect.objectContaining({ know: null, act: null }),
      }),
    ]);
  });
});

describe("buildFlowGraph", () => {
  it("builds the agent-to-act chain without fabricating scores", () => {
    const graph = buildFlowGraph({ crossing: null, agentLabel: "traverse-public-1" });
    expect(graph.nodes.map((node) => node.id)).toEqual([
      "agent",
      "stage-know",
      "stage-find",
      "stage-extract",
      "stage-verify",
      "stage-act",
    ]);
    expect(graph.nodes.every((node) => node.score == null)).toBe(true);
    expect(graph.nodes.filter((node) => node.kind === "stage").every((node) => node.tone === "pending")).toBe(
      true,
    );
  });

  it("adds page nodes from real evidence URLs and lights edges from scores", () => {
    const graph = buildFlowGraph({
      agentLabel: "traverse-public-1",
      crossing: crossing({
        evidence: [
          evidence(),
          evidence({
            id: "evd_2",
            stage: "find",
            url: "https://reco.ai/about-us",
            finalUrl: "https://reco.ai/about-us",
            title: "About",
          }),
        ],
      }),
    });
    const act = graph.nodes.find((node) => node.id === "stage-act");
    const verify = graph.nodes.find((node) => node.id === "stage-verify");
    const page = graph.nodes.find((node) => node.id === "page-evd_2");
    expect(act?.score).toBe(25);
    expect(act?.tone).toBe("bad");
    expect(verify?.tone).toBe("na");
    expect(page?.label).toBe("/about-us");
    expect(graph.edges.find((edge) => edge.to === "stage-act")?.tone).toBe("bad");
  });
});

describe("buildHeatRows and focus helpers", () => {
  it("keeps heat cells aligned to real crossings", () => {
    const rows = buildHeatRows([crossing()]);
    expect(rows[0]?.title).toBe("reco.ai · Identity · x1");
    expect(rows[0]?.cells.map((cell) => cell.score)).toEqual([100, 91, 100, null, 25]);
  });

  it("prefers a running crossing when no focus is set", () => {
    const running = crossing({ id: "xng_run", status: "running", overallScore: null, passed: null });
    const done = crossing({ id: "xng_done" });
    expect(pickFocusCrossing([done, running], null)?.id).toBe("xng_run");
    expect(pickFocusCrossing([done, running], "xng_done")?.id).toBe("xng_done");
    expect(crossingTitle(done)).toBe("reco.ai · Identity · x1");
  });

  it("reads result tabs from the hash only", () => {
    expect(tabFromHash("#evidence")).toBe("evidence");
    expect(tabFromHash("#nope")).toBeNull();
  });
});
