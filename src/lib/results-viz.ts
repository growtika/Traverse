import { average, stageLabel } from "./grade";
import type {
  Crossing,
  EvidencePage,
  Route,
  Site,
  SiteRole,
  StageName,
} from "./types";
import { STAGES } from "./types";

export type CrossingView = Crossing & {
  site: Site | null;
  route: Route | null;
  evidence: EvidencePage[];
};

export type ScoreTone = "pending" | "na" | "good" | "warn" | "bad";
export type FlowNodeKind = "agent" | "stage" | "page";
export type ResultsTab = "map" | "journal" | "evidence" | "fixes";

export type ResultsFocus = {
  crossingId: string | null;
  stage: StageName | "run" | null;
  evidenceId?: string;
};

export type FlowNode = {
  id: string;
  kind: FlowNodeKind;
  label: string;
  sublabel?: string;
  stage?: StageName | "run";
  score: number | null;
  tone: ScoreTone;
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  evidenceId?: string;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  tone: ScoreTone;
  dashed: boolean;
  animated: boolean;
};

export type ComparisonRow = {
  siteId: string;
  domain: string;
  name: string;
  role: SiteRole;
  you: boolean;
  label: string;
  overall: number | null;
  stages: Record<StageName, number | null>;
  crossings: number;
};

export type HeatRow = {
  crossingId: string;
  title: string;
  status: Crossing["status"];
  passed: boolean | null;
  overall: number | null;
  cells: Array<{
    crossingId: string;
    stage: StageName;
    score: number | null;
    tone: ScoreTone;
  }>;
};

export const FLOW_LAYOUT = {
  padding: 28,
  nodeW: 132,
  nodeH: 82,
  pageH: 56,
  gapX: 34,
  gapY: 36,
  pageGap: 12,
  maxPagesPerStage: 3,
} as const;

export const TONE_TEXT: Record<ScoreTone, string> = {
  good: "text-moss",
  warn: "text-warn",
  bad: "text-rust",
  na: "text-mute",
  pending: "text-mute-2",
};

export const TONE_STROKE: Record<ScoreTone, string> = {
  good: "var(--moss)",
  warn: "var(--warn)",
  bad: "var(--signal)",
  na: "rgba(214, 231, 216, 0.32)",
  pending: "rgba(214, 231, 216, 0.22)",
};

export const TONE_FILL: Record<ScoreTone, string> = {
  good: "var(--moss)",
  warn: "var(--warn)",
  bad: "var(--signal)",
  na: "var(--mute-2)",
  pending: "var(--trail)",
};

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score == null) return "pending";
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export function scoreForStage(crossing: Crossing, stage: StageName): number | null {
  switch (stage) {
    case "know":
      return crossing.knowScore;
    case "find":
      return crossing.findScore;
    case "extract":
      return crossing.extractScore;
    case "verify":
      return crossing.verifyScore;
    case "act":
      return crossing.actScore;
  }
}

export function verifyResolved(crossing: Crossing): boolean {
  if (crossing.status === "completed" || crossing.status === "failed") return true;
  return crossing.journal.some((event) => event.stage === "verify");
}

export function activeStage(crossing: Crossing): StageName | "run" | null {
  if (crossing.status === "queued") return "run";
  if (crossing.status !== "running") return null;
  if (crossing.knowScore == null) return "know";
  if (crossing.findScore == null) return "find";
  if (crossing.extractScore == null) return "extract";
  if (!verifyResolved(crossing)) return "verify";
  if (crossing.actScore == null) return "act";
  return null;
}

export function stageTone(crossing: Crossing, stage: StageName): ScoreTone {
  const score = scoreForStage(crossing, stage);
  if (score != null) return scoreTone(score);
  if (stage === "verify" && verifyResolved(crossing)) return "na";
  return "pending";
}

export function pickFocusCrossing(
  crossings: CrossingView[],
  currentId?: string | null,
): CrossingView | null {
  if (!crossings.length) return null;
  if (currentId) {
    const found = crossings.find((crossing) => crossing.id === currentId);
    if (found) return found;
  }
  return (
    crossings.find((crossing) => crossing.status === "running") ??
    crossings.find((crossing) => crossing.status === "queued") ??
    crossings[0]
  );
}

export function crossingTitle(crossing: CrossingView): string {
  const domain = crossing.site?.domain ?? "site";
  const route = crossing.route?.name ?? "route";
  return `${domain} · ${route} · x${crossing.crossingIndex + 1}`;
}

export function crossingPathLabel(crossing: CrossingView): string {
  return crossing.passed === null
    ? crossing.status === "failed"
      ? crossing.error || "Lost the path"
      : crossing.status === "running"
        ? "Walking the path"
        : "Waiting"
    : crossing.passed
      ? "Held the path"
      : "Lost the path";
}

export function pagePathLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? parsed.host : parsed.pathname;
    return path.length > 24 ? `${path.slice(0, 22)}…` : path;
  } catch {
    return url.length > 24 ? `${url.slice(0, 22)}…` : url;
  }
}

export function buildComparisonRows(crossings: CrossingView[]): ComparisonRow[] {
  const grouped = new Map<string, CrossingView[]>();
  for (const crossing of crossings) {
    const list = grouped.get(crossing.siteId) ?? [];
    list.push(crossing);
    grouped.set(crossing.siteId, list);
  }

  const rows: ComparisonRow[] = [];
  for (const [siteId, list] of grouped) {
    const site = list[0]?.site;
    const role: SiteRole = site?.role === "rival" ? "rival" : "client";
    const domain = site?.domain ?? siteId;
    rows.push({
      siteId,
      domain,
      name: site?.name ?? domain,
      role,
      you: role === "client",
      label: role === "client" ? `you · ${domain}` : domain,
      overall: average(list.map((crossing) => crossing.overallScore)),
      stages: {
        know: average(list.map((crossing) => crossing.knowScore)),
        find: average(list.map((crossing) => crossing.findScore)),
        extract: average(list.map((crossing) => crossing.extractScore)),
        verify: average(list.map((crossing) => crossing.verifyScore)),
        act: average(list.map((crossing) => crossing.actScore)),
      },
      crossings: list.length,
    });
  }

  return rows.sort((a, b) => {
    if (a.overall == null && b.overall == null) return Number(b.you) - Number(a.you);
    if (a.overall == null) return 1;
    if (b.overall == null) return -1;
    if (b.overall !== a.overall) return b.overall - a.overall;
    return Number(b.you) - Number(a.you);
  });
}

export function buildHeatRows(crossings: CrossingView[]): HeatRow[] {
  return crossings.map((crossing) => ({
    crossingId: crossing.id,
    title: crossingTitle(crossing),
    status: crossing.status,
    passed: crossing.passed,
    overall: crossing.overallScore,
    cells: STAGES.map((stage) => ({
      crossingId: crossing.id,
      stage,
      score: scoreForStage(crossing, stage),
      tone: stageTone(crossing, stage),
    })),
  }));
}

export function buildFlowGraph(input: {
  crossing: CrossingView | null;
  agentLabel: string;
}): { nodes: FlowNode[]; edges: FlowEdge[]; width: number; height: number } {
  const { padding, nodeW, nodeH, pageH, gapX, gapY, pageGap, maxPagesPerStage } = FLOW_LAYOUT;
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const crossing = input.crossing;
  const live = crossing?.status === "running" || crossing?.status === "queued";

  nodes.push({
    id: "agent",
    kind: "agent",
    stage: "run",
    label: input.agentLabel,
    sublabel: "public agent",
    score: null,
    tone: crossing?.status === "failed" ? "bad" : crossing ? "good" : "pending",
    active: live,
    x: padding,
    y: padding,
    w: nodeW,
    h: nodeH,
  });

  STAGES.forEach((stage, index) => {
    nodes.push({
      id: `stage-${stage}`,
      kind: "stage",
      stage,
      label: stageLabel(stage),
      sublabel: stage[0].toUpperCase(),
      score: crossing ? scoreForStage(crossing, stage) : null,
      tone: crossing ? stageTone(crossing, stage) : "pending",
      active: crossing ? activeStage(crossing) === stage : false,
      x: padding + (index + 1) * (nodeW + gapX),
      y: padding,
      w: nodeW,
      h: nodeH,
    });
  });

  const chain = ["agent", ...STAGES.map((stage) => `stage-${stage}`)];
  for (let i = 0; i < chain.length - 1; i += 1) {
    const from = nodes.find((node) => node.id === chain[i]);
    const to = nodes.find((node) => node.id === chain[i + 1]);
    if (!from || !to) continue;
    edges.push({
      id: `${from.id}-${to.id}`,
      from: from.id,
      to: to.id,
      tone: to.tone,
      dashed: to.tone === "pending" || to.tone === "bad",
      animated: to.active || to.tone === "good" || to.tone === "warn" || to.tone === "bad",
    });
  }

  const evidence = crossing?.evidence ?? [];
  for (const stage of STAGES) {
    const pages = evidence.filter((page) => page.stage === stage);
    const shown = pages.slice(0, maxPagesPerStage);
    const parent = nodes.find((node) => node.id === `stage-${stage}`);
    if (!parent) continue;
    shown.forEach((page, index) => {
      const failed = Boolean(page.error) || (page.statusCode != null && page.statusCode >= 400);
      const tone: ScoreTone = failed ? "bad" : page.partial ? "warn" : "good";
      const node: FlowNode = {
        id: `page-${page.id}`,
        kind: "page",
        stage,
        label: pagePathLabel(page.finalUrl || page.url),
        sublabel: page.title || page.label,
        score: null,
        tone,
        active: false,
        evidenceId: page.id,
        x: parent.x,
        y: parent.y + nodeH + gapY + index * (pageH + pageGap),
        w: nodeW,
        h: pageH,
      };
      nodes.push(node);
      edges.push({
        id: `${parent.id}-${node.id}`,
        from: parent.id,
        to: node.id,
        tone,
        dashed: true,
        animated: false,
      });
    });
    if (pages.length > maxPagesPerStage) {
      const extra = pages.length - maxPagesPerStage;
      nodes.push({
        id: `page-more-${stage}`,
        kind: "page",
        stage,
        label: `+${extra} more page${extra === 1 ? "" : "s"}`,
        sublabel: "open Evidence",
        score: null,
        tone: "na",
        active: false,
        x: parent.x,
        y: parent.y + nodeH + gapY + shown.length * (pageH + pageGap),
        w: nodeW,
        h: pageH,
      });
    }
  }

  const width = padding * 2 + 6 * nodeW + 5 * gapX;
  const bottom = nodes.reduce((max, node) => Math.max(max, node.y + node.h), padding + nodeH);
  return { nodes, edges, width, height: bottom + padding };
}

export function edgePath(from: FlowNode, to: FlowNode): string {
  if (to.kind === "page") {
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h;
    const x2 = to.x + to.w / 2;
    const y2 = to.y;
    const mid = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
  }
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function scoreDisplay(score: number | null | undefined, tone: ScoreTone): string {
  if (score != null) return String(score);
  if (tone === "na") return "N/A";
  return "—";
}

export function tabFromHash(hash: string): ResultsTab | null {
  const value = hash.replace(/^#/, "");
  if (value === "map" || value === "journal" || value === "evidence" || value === "fixes") {
    return value;
  }
  return null;
}
