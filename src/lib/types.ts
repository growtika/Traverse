export type SiteRole = "client" | "rival";
export type SurveySpeed = "careful" | "measured" | "fast";
export type VerifyStrictness = "loose" | "normal" | "strict";
export type RunStatus = "queued" | "running" | "completed" | "failed";
export type StageName = "know" | "find" | "extract" | "verify" | "act";
export type AlertMetric =
  | "overall"
  | "know"
  | "find"
  | "extract"
  | "verify"
  | "act"
  | "route_pass_rate";

export type Settings = {
  agentLabel: string;
  speed: SurveySpeed;
  crossingsPerRoute: number;
  verifyStrictness: VerifyStrictness;
  maxPagesPerCrossing: number;
  respectRobots: boolean;
  includeRivals: boolean;
  slackWebhookUrl: string;
};

export type Site = {
  id: string;
  name: string;
  domain: string;
  role: SiteRole;
  startPath: string;
  faviconUrl: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/** Client- or API-supplied site used to upsert into an empty serverless store. */
export type SiteInput = {
  id?: string;
  name?: string;
  domain: string;
  role?: SiteRole;
  startPath?: string;
  faviconUrl?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Route = {
  id: string;
  name: string;
  slug: string;
  intent: string;
  queryTerms: string[];
  pathHints: string[];
  enabled: boolean;
  sortOrder: number;
};

export type AnswerKey = {
  id: string;
  siteId: string | null;
  routeId: string | null;
  claim: string;
  expected: string;
  createdAt: string;
};

export type FormField = {
  name: string;
  type: string;
  label: string;
};

export type CapturedForm = {
  action: string;
  method: string;
  fields: FormField[];
};

export type EvidencePage = {
  id: string;
  crossingId: string;
  stage: StageName;
  url: string;
  finalUrl: string | null;
  statusCode: number | null;
  title: string | null;
  excerpt: string | null;
  headings: string[];
  links: { href: string; text: string }[];
  forms: CapturedForm[];
  html: string | null;
  robotsAllowed: boolean;
  partial: boolean;
  label: string;
  fetchedAt: string | null;
  error: string | null;
};

export type JournalEvent = {
  t: string;
  stage: StageName | "run";
  message: string;
  url?: string;
  evidenceId?: string;
};

export type FixSuggestion = {
  stage: StageName;
  severity: "hazard" | "gap" | "note";
  title: string;
  detail: string;
};

export type Crossing = {
  id: string;
  runId: string;
  siteId: string;
  routeId: string;
  crossingIndex: number;
  status: RunStatus;
  knowScore: number | null;
  findScore: number | null;
  extractScore: number | null;
  verifyScore: number | null;
  actScore: number | null;
  overallScore: number | null;
  passed: boolean | null;
  journal: JournalEvent[];
  fixes: FixSuggestion[];
  error: string | null;
};

export type RunProgress = {
  current: number;
  total: number;
  message: string;
};

export type Run = {
  id: string;
  status: RunStatus;
  siteIds: string[];
  routeIds: string[];
  settingsSnapshot: Settings;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  progress: RunProgress;
  createdAt: string;
};

export type AlertWatcher = {
  id: string;
  name: string;
  enabled: boolean;
  siteId: string | null;
  metric: AlertMetric;
  dropPoints: number;
  createdAt: string;
};

export type AlertEvent = {
  id: string;
  alertId: string;
  runId: string;
  title: string;
  detail: string;
  slackStatus: "skipped" | "sent" | "failed";
  createdAt: string;
  read: boolean;
};

export type ExtractedFacts = {
  identityLine: string;
  facts: string[];
  prices: string[];
  contacts: string[];
  claims: string[];
};

export const STAGES: StageName[] = ["know", "find", "extract", "verify", "act"];

export type WorkspaceSnapshot = {
  version: 1;
  settings: Settings;
  sites: Site[];
  routes: Route[];
  answerKeys: AnswerKey[];
  runs: Run[];
  crossings: Crossing[];
  evidence: EvidencePage[];
  alerts: AlertWatcher[];
  alertEvents: AlertEvent[];
};
