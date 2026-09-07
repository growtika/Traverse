import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DEFAULT_ROUTES, DEFAULT_SETTINGS } from "./defaults";
import { newId } from "./id";
import type {
  AlertEvent,
  AlertWatcher,
  AnswerKey,
  Crossing,
  EvidencePage,
  Route,
  Run,
  Settings,
  Site,
} from "./types";

const DATA_DIR = process.env.TRAVERSE_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "traverse.sqlite");

let cached: Database.Database | null = null;

export function getDb(): Database.Database {
  if (cached) return cached;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seed(db);
  cached = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      agent_label TEXT NOT NULL,
      speed TEXT NOT NULL,
      crossings_per_route INTEGER NOT NULL,
      verify_strictness TEXT NOT NULL,
      max_pages_per_crossing INTEGER NOT NULL,
      respect_robots INTEGER NOT NULL,
      include_rivals INTEGER NOT NULL,
      slack_webhook_url TEXT
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      start_path TEXT NOT NULL DEFAULT '/',
      favicon_url TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      intent TEXT NOT NULL,
      query_terms TEXT NOT NULL,
      path_hints TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_keys (
      id TEXT PRIMARY KEY,
      site_id TEXT,
      route_id TEXT,
      claim TEXT NOT NULL,
      expected TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(site_id) REFERENCES sites(id) ON DELETE CASCADE,
      FOREIGN KEY(route_id) REFERENCES routes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      site_ids TEXT NOT NULL,
      route_ids TEXT NOT NULL,
      settings_snapshot TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      error TEXT,
      progress TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crossings (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      crossing_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      know_score REAL,
      find_score REAL,
      extract_score REAL,
      verify_score REAL,
      act_score REAL,
      overall_score REAL,
      passed INTEGER,
      journal TEXT NOT NULL,
      fixes TEXT NOT NULL,
      error TEXT,
      FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_pages (
      id TEXT PRIMARY KEY,
      crossing_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      url TEXT NOT NULL,
      final_url TEXT,
      status_code INTEGER,
      title TEXT,
      excerpt TEXT,
      headings TEXT NOT NULL,
      links TEXT NOT NULL,
      forms TEXT NOT NULL,
      html TEXT,
      robots_allowed INTEGER NOT NULL,
      partial INTEGER NOT NULL,
      label TEXT NOT NULL,
      fetched_at TEXT,
      error TEXT,
      FOREIGN KEY(crossing_id) REFERENCES crossings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      site_id TEXT,
      metric TEXT NOT NULL,
      drop_points REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_events (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      slack_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
      FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
    );
  `);
}

function seed(db: Database.Database) {
  const settingsCount = db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number };
  if (settingsCount.n === 0) {
    db.prepare(
      `INSERT INTO settings (
        id, agent_label, speed, crossings_per_route, verify_strictness,
        max_pages_per_crossing, respect_robots, include_rivals, slack_webhook_url
      ) VALUES (1, @agent_label, @speed, @crossings_per_route, @verify_strictness,
        @max_pages_per_crossing, @respect_robots, @include_rivals, @slack_webhook_url)`,
    ).run({
      agent_label: DEFAULT_SETTINGS.agentLabel,
      speed: DEFAULT_SETTINGS.speed,
      crossings_per_route: DEFAULT_SETTINGS.crossingsPerRoute,
      verify_strictness: DEFAULT_SETTINGS.verifyStrictness,
      max_pages_per_crossing: DEFAULT_SETTINGS.maxPagesPerCrossing,
      respect_robots: 1,
      include_rivals: 1,
      slack_webhook_url: "",
    });
  }

  const routeCount = db.prepare("SELECT COUNT(*) AS n FROM routes").get() as { n: number };
  if (routeCount.n === 0) {
    const insert = db.prepare(
      `INSERT INTO routes (id, name, slug, intent, query_terms, path_hints, enabled, sort_order)
       VALUES (@id, @name, @slug, @intent, @query_terms, @path_hints, @enabled, @sort_order)`,
    );
    for (const route of DEFAULT_ROUTES) {
      insert.run({
        id: newId("rte"),
        name: route.name,
        slug: route.slug,
        intent: route.intent,
        query_terms: JSON.stringify(route.queryTerms),
        path_hints: JSON.stringify(route.pathHints),
        enabled: route.enabled ? 1 : 0,
        sort_order: route.sortOrder,
      });
    }
  }

  const alertCount = db.prepare("SELECT COUNT(*) AS n FROM alerts").get() as { n: number };
  if (alertCount.n === 0) {
    db.prepare(
      `INSERT INTO alerts (id, name, enabled, site_id, metric, drop_points, created_at)
       VALUES (@id, @name, 1, NULL, 'overall', 10, @created_at)`,
    ).run({
      id: newId("alr"),
      name: "Overall score drop",
      created_at: nowIso(),
    });
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getSettings(): Settings {
  const row = getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  return mapSettings(row);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const current = getSettings();
  const next: Settings = {
    agentLabel: patch.agentLabel ?? current.agentLabel,
    speed: patch.speed ?? current.speed,
    crossingsPerRoute: clampInt(patch.crossingsPerRoute ?? current.crossingsPerRoute, 1, 5),
    verifyStrictness: patch.verifyStrictness ?? current.verifyStrictness,
    maxPagesPerCrossing: clampInt(patch.maxPagesPerCrossing ?? current.maxPagesPerCrossing, 2, 12),
    respectRobots: patch.respectRobots ?? current.respectRobots,
    includeRivals: patch.includeRivals ?? current.includeRivals,
    slackWebhookUrl: patch.slackWebhookUrl ?? current.slackWebhookUrl,
  };
  getDb()
    .prepare(
      `UPDATE settings SET
        agent_label = @agent_label,
        speed = @speed,
        crossings_per_route = @crossings_per_route,
        verify_strictness = @verify_strictness,
        max_pages_per_crossing = @max_pages_per_crossing,
        respect_robots = @respect_robots,
        include_rivals = @include_rivals,
        slack_webhook_url = @slack_webhook_url
      WHERE id = 1`,
    )
    .run({
      agent_label: next.agentLabel.trim() || "traverse-public-1",
      speed: next.speed,
      crossings_per_route: next.crossingsPerRoute,
      verify_strictness: next.verifyStrictness,
      max_pages_per_crossing: next.maxPagesPerCrossing,
      respect_robots: next.respectRobots ? 1 : 0,
      include_rivals: next.includeRivals ? 1 : 0,
      slack_webhook_url: next.slackWebhookUrl.trim(),
    });
  return getSettings();
}

export function listSites(): Site[] {
  return (
    getDb().prepare("SELECT * FROM sites ORDER BY role ASC, created_at ASC").all() as SiteRow[]
  ).map(mapSite);
}

export function getSite(id: string): Site | null {
  const row = getDb().prepare("SELECT * FROM sites WHERE id = ?").get(id) as SiteRow | undefined;
  return row ? mapSite(row) : null;
}

export function insertSite(input: Omit<Site, "id" | "createdAt" | "updatedAt">): Site {
  const id = newId("sit");
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO sites (id, name, domain, role, start_path, favicon_url, notes, created_at, updated_at)
       VALUES (@id, @name, @domain, @role, @start_path, @favicon_url, @notes, @created_at, @updated_at)`,
    )
    .run({
      id,
      name: input.name,
      domain: input.domain,
      role: input.role,
      start_path: input.startPath,
      favicon_url: input.faviconUrl,
      notes: input.notes,
      created_at: ts,
      updated_at: ts,
    });
  return getSite(id)!;
}

export function updateSite(id: string, patch: Partial<Site>): Site | null {
  const current = getSite(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: nowIso() };
  getDb()
    .prepare(
      `UPDATE sites SET name=@name, domain=@domain, role=@role, start_path=@start_path,
        favicon_url=@favicon_url, notes=@notes, updated_at=@updated_at WHERE id=@id`,
    )
    .run({
      id,
      name: next.name,
      domain: next.domain,
      role: next.role,
      start_path: next.startPath,
      favicon_url: next.faviconUrl,
      notes: next.notes,
      updated_at: next.updatedAt,
    });
  return getSite(id);
}

export function deleteSite(id: string): boolean {
  const result = getDb().prepare("DELETE FROM sites WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listRoutes(): Route[] {
  return (
    getDb().prepare("SELECT * FROM routes ORDER BY sort_order ASC").all() as RouteRow[]
  ).map(mapRoute);
}

export function updateRoute(id: string, patch: Partial<Route>): Route | null {
  const current = listRoutes().find((r) => r.id === id);
  if (!current) return null;
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE routes SET name=@name, intent=@intent, query_terms=@query_terms,
        path_hints=@path_hints, enabled=@enabled, sort_order=@sort_order WHERE id=@id`,
    )
    .run({
      id,
      name: next.name,
      intent: next.intent,
      query_terms: JSON.stringify(next.queryTerms),
      path_hints: JSON.stringify(next.pathHints),
      enabled: next.enabled ? 1 : 0,
      sort_order: next.sortOrder,
    });
  return listRoutes().find((r) => r.id === id) ?? null;
}

export function listAnswerKeys(): AnswerKey[] {
  return (
    getDb().prepare("SELECT * FROM answer_keys ORDER BY created_at DESC").all() as KeyRow[]
  ).map(mapKey);
}

export function insertAnswerKey(input: Omit<AnswerKey, "id" | "createdAt">): AnswerKey {
  const id = newId("key");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO answer_keys (id, site_id, route_id, claim, expected, created_at)
       VALUES (@id, @site_id, @route_id, @claim, @expected, @created_at)`,
    )
    .run({
      id,
      site_id: input.siteId,
      route_id: input.routeId,
      claim: input.claim,
      expected: input.expected,
      created_at: createdAt,
    });
  return listAnswerKeys().find((k) => k.id === id)!;
}

export function deleteAnswerKey(id: string): boolean {
  return getDb().prepare("DELETE FROM answer_keys WHERE id = ?").run(id).changes > 0;
}

export function insertRun(input: Omit<Run, "startedAt" | "finishedAt" | "error">): Run {
  getDb()
    .prepare(
      `INSERT INTO runs (id, status, site_ids, route_ids, settings_snapshot, started_at, finished_at, error, progress, created_at)
       VALUES (@id, @status, @site_ids, @route_ids, @settings_snapshot, NULL, NULL, NULL, @progress, @created_at)`,
    )
    .run({
      id: input.id,
      status: input.status,
      site_ids: JSON.stringify(input.siteIds),
      route_ids: JSON.stringify(input.routeIds),
      settings_snapshot: JSON.stringify(input.settingsSnapshot),
      progress: JSON.stringify(input.progress),
      created_at: input.createdAt,
    });
  return getRun(input.id)!;
}

export function updateRun(id: string, patch: Partial<Run>): Run | null {
  const current = getRun(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE runs SET status=@status, started_at=@started_at, finished_at=@finished_at,
        error=@error, progress=@progress WHERE id=@id`,
    )
    .run({
      id,
      status: next.status,
      started_at: next.startedAt,
      finished_at: next.finishedAt,
      error: next.error,
      progress: JSON.stringify(next.progress),
    });
  return getRun(id);
}

export function getRun(id: string): Run | null {
  const row = getDb().prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined;
  return row ? mapRun(row) : null;
}

export function listRuns(): Run[] {
  return (getDb().prepare("SELECT * FROM runs ORDER BY created_at DESC").all() as RunRow[]).map(
    mapRun,
  );
}

export function insertCrossing(input: Crossing): Crossing {
  getDb()
    .prepare(
      `INSERT INTO crossings (
        id, run_id, site_id, route_id, crossing_index, status, know_score, find_score,
        extract_score, verify_score, act_score, overall_score, passed, journal, fixes, error
      ) VALUES (
        @id, @run_id, @site_id, @route_id, @crossing_index, @status, @know_score, @find_score,
        @extract_score, @verify_score, @act_score, @overall_score, @passed, @journal, @fixes, @error
      )`,
    )
    .run({
      id: input.id,
      run_id: input.runId,
      site_id: input.siteId,
      route_id: input.routeId,
      crossing_index: input.crossingIndex,
      status: input.status,
      know_score: input.knowScore,
      find_score: input.findScore,
      extract_score: input.extractScore,
      verify_score: input.verifyScore,
      act_score: input.actScore,
      overall_score: input.overallScore,
      passed: input.passed === null ? null : input.passed ? 1 : 0,
      journal: JSON.stringify(input.journal),
      fixes: JSON.stringify(input.fixes),
      error: input.error,
    });
  return input;
}

export function updateCrossing(id: string, patch: Partial<Crossing>): void {
  const row = getDb().prepare("SELECT * FROM crossings WHERE id = ?").get(id) as CrossingRow;
  const current = mapCrossing(row);
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE crossings SET status=@status, know_score=@know_score, find_score=@find_score,
        extract_score=@extract_score, verify_score=@verify_score, act_score=@act_score,
        overall_score=@overall_score, passed=@passed, journal=@journal, fixes=@fixes, error=@error
        WHERE id=@id`,
    )
    .run({
      id,
      status: next.status,
      know_score: next.knowScore,
      find_score: next.findScore,
      extract_score: next.extractScore,
      verify_score: next.verifyScore,
      act_score: next.actScore,
      overall_score: next.overallScore,
      passed: next.passed === null ? null : next.passed ? 1 : 0,
      journal: JSON.stringify(next.journal),
      fixes: JSON.stringify(next.fixes),
      error: next.error,
    });
}

export function listCrossings(runId: string): Crossing[] {
  return (
    getDb()
      .prepare("SELECT * FROM crossings WHERE run_id = ? ORDER BY site_id, route_id, crossing_index")
      .all(runId) as CrossingRow[]
  ).map(mapCrossing);
}

export function insertEvidence(page: EvidencePage): EvidencePage {
  getDb()
    .prepare(
      `INSERT INTO evidence_pages (
        id, crossing_id, stage, url, final_url, status_code, title, excerpt, headings, links, forms,
        html, robots_allowed, partial, label, fetched_at, error
      ) VALUES (
        @id, @crossing_id, @stage, @url, @final_url, @status_code, @title, @excerpt, @headings, @links, @forms,
        @html, @robots_allowed, @partial, @label, @fetched_at, @error
      )`,
    )
    .run({
      id: page.id,
      crossing_id: page.crossingId,
      stage: page.stage,
      url: page.url,
      final_url: page.finalUrl,
      status_code: page.statusCode,
      title: page.title,
      excerpt: page.excerpt,
      headings: JSON.stringify(page.headings),
      links: JSON.stringify(page.links),
      forms: JSON.stringify(page.forms),
      html: page.html,
      robots_allowed: page.robotsAllowed ? 1 : 0,
      partial: page.partial ? 1 : 0,
      label: page.label,
      fetched_at: page.fetchedAt,
      error: page.error,
    });
  return page;
}

export function listEvidence(crossingId: string): EvidencePage[] {
  return (
    getDb()
      .prepare("SELECT * FROM evidence_pages WHERE crossing_id = ?")
      .all(crossingId) as EvidenceRow[]
  ).map(mapEvidence);
}

export function getEvidence(id: string): EvidencePage | null {
  const row = getDb().prepare("SELECT * FROM evidence_pages WHERE id = ?").get(id) as
    | EvidenceRow
    | undefined;
  return row ? mapEvidence(row) : null;
}

export function listAlerts(): AlertWatcher[] {
  return (getDb().prepare("SELECT * FROM alerts ORDER BY created_at ASC").all() as AlertRow[]).map(
    mapAlert,
  );
}

export function insertAlert(input: Omit<AlertWatcher, "id" | "createdAt">): AlertWatcher {
  const id = newId("alr");
  const createdAt = nowIso();
  getDb()
    .prepare(
      `INSERT INTO alerts (id, name, enabled, site_id, metric, drop_points, created_at)
       VALUES (@id, @name, @enabled, @site_id, @metric, @drop_points, @created_at)`,
    )
    .run({
      id,
      name: input.name,
      enabled: input.enabled ? 1 : 0,
      site_id: input.siteId,
      metric: input.metric,
      drop_points: input.dropPoints,
      created_at: createdAt,
    });
  return listAlerts().find((a) => a.id === id)!;
}

export function updateAlert(id: string, patch: Partial<AlertWatcher>): AlertWatcher | null {
  const current = listAlerts().find((a) => a.id === id);
  if (!current) return null;
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE alerts SET name=@name, enabled=@enabled, site_id=@site_id, metric=@metric, drop_points=@drop_points WHERE id=@id`,
    )
    .run({
      id,
      name: next.name,
      enabled: next.enabled ? 1 : 0,
      site_id: next.siteId,
      metric: next.metric,
      drop_points: next.dropPoints,
    });
  return listAlerts().find((a) => a.id === id) ?? null;
}

export function deleteAlert(id: string): boolean {
  return getDb().prepare("DELETE FROM alerts WHERE id = ?").run(id).changes > 0;
}

export function insertAlertEvent(event: AlertEvent): AlertEvent {
  getDb()
    .prepare(
      `INSERT INTO alert_events (id, alert_id, run_id, title, detail, slack_status, created_at, read)
       VALUES (@id, @alert_id, @run_id, @title, @detail, @slack_status, @created_at, @read)`,
    )
    .run({
      id: event.id,
      alert_id: event.alertId,
      run_id: event.runId,
      title: event.title,
      detail: event.detail,
      slack_status: event.slackStatus,
      created_at: event.createdAt,
      read: event.read ? 1 : 0,
    });
  return event;
}

export function listAlertEvents(): AlertEvent[] {
  return (
    getDb()
      .prepare("SELECT * FROM alert_events ORDER BY created_at DESC")
      .all() as AlertEventRow[]
  ).map(mapAlertEvent);
}

export function markAlertRead(id: string): void {
  getDb().prepare("UPDATE alert_events SET read = 1 WHERE id = ?").run(id);
}

export function previousCompletedRun(beforeId: string): Run | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM runs WHERE status = 'completed' AND id != ? AND created_at <
        (SELECT created_at FROM runs WHERE id = ?) ORDER BY created_at DESC LIMIT 1`,
    )
    .get(beforeId, beforeId) as RunRow | undefined;
  return row ? mapRun(row) : null;
}

type SettingsRow = {
  agent_label: string;
  speed: Settings["speed"];
  crossings_per_route: number;
  verify_strictness: Settings["verifyStrictness"];
  max_pages_per_crossing: number;
  respect_robots: number;
  include_rivals: number;
  slack_webhook_url: string | null;
};
type SiteRow = {
  id: string;
  name: string;
  domain: string;
  role: Site["role"];
  start_path: string;
  favicon_url: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};
type RouteRow = {
  id: string;
  name: string;
  slug: string;
  intent: string;
  query_terms: string;
  path_hints: string;
  enabled: number;
  sort_order: number;
};
type KeyRow = {
  id: string;
  site_id: string | null;
  route_id: string | null;
  claim: string;
  expected: string;
  created_at: string;
};
type RunRow = {
  id: string;
  status: Run["status"];
  site_ids: string;
  route_ids: string;
  settings_snapshot: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  progress: string;
  created_at: string;
};
type CrossingRow = {
  id: string;
  run_id: string;
  site_id: string;
  route_id: string;
  crossing_index: number;
  status: Crossing["status"];
  know_score: number | null;
  find_score: number | null;
  extract_score: number | null;
  verify_score: number | null;
  act_score: number | null;
  overall_score: number | null;
  passed: number | null;
  journal: string;
  fixes: string;
  error: string | null;
};
type EvidenceRow = {
  id: string;
  crossing_id: string;
  stage: EvidencePage["stage"];
  url: string;
  final_url: string | null;
  status_code: number | null;
  title: string | null;
  excerpt: string | null;
  headings: string;
  links: string;
  forms: string;
  html: string | null;
  robots_allowed: number;
  partial: number;
  label: string;
  fetched_at: string | null;
  error: string | null;
};
type AlertRow = {
  id: string;
  name: string;
  enabled: number;
  site_id: string | null;
  metric: AlertWatcher["metric"];
  drop_points: number;
  created_at: string;
};
type AlertEventRow = {
  id: string;
  alert_id: string;
  run_id: string;
  title: string;
  detail: string;
  slack_status: AlertEvent["slackStatus"];
  created_at: string;
  read: number;
};

function mapSettings(row: SettingsRow): Settings {
  return {
    agentLabel: row.agent_label,
    speed: row.speed,
    crossingsPerRoute: row.crossings_per_route,
    verifyStrictness: row.verify_strictness,
    maxPagesPerCrossing: row.max_pages_per_crossing,
    respectRobots: Boolean(row.respect_robots),
    includeRivals: Boolean(row.include_rivals),
    slackWebhookUrl: row.slack_webhook_url || "",
  };
}
function mapSite(row: SiteRow): Site {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    role: row.role,
    startPath: row.start_path,
    faviconUrl: row.favicon_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapRoute(row: RouteRow): Route {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    intent: row.intent,
    queryTerms: JSON.parse(row.query_terms),
    pathHints: JSON.parse(row.path_hints),
    enabled: Boolean(row.enabled),
    sortOrder: row.sort_order,
  };
}
function mapKey(row: KeyRow): AnswerKey {
  return {
    id: row.id,
    siteId: row.site_id,
    routeId: row.route_id,
    claim: row.claim,
    expected: row.expected,
    createdAt: row.created_at,
  };
}
function mapRun(row: RunRow): Run {
  return {
    id: row.id,
    status: row.status,
    siteIds: JSON.parse(row.site_ids),
    routeIds: JSON.parse(row.route_ids),
    settingsSnapshot: JSON.parse(row.settings_snapshot),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
    progress: JSON.parse(row.progress),
    createdAt: row.created_at,
  };
}
function mapCrossing(row: CrossingRow): Crossing {
  return {
    id: row.id,
    runId: row.run_id,
    siteId: row.site_id,
    routeId: row.route_id,
    crossingIndex: row.crossing_index,
    status: row.status,
    knowScore: row.know_score,
    findScore: row.find_score,
    extractScore: row.extract_score,
    verifyScore: row.verify_score,
    actScore: row.act_score,
    overallScore: row.overall_score,
    passed: row.passed === null ? null : Boolean(row.passed),
    journal: JSON.parse(row.journal),
    fixes: JSON.parse(row.fixes),
    error: row.error,
  };
}
function mapEvidence(row: EvidenceRow): EvidencePage {
  return {
    id: row.id,
    crossingId: row.crossing_id,
    stage: row.stage,
    url: row.url,
    finalUrl: row.final_url,
    statusCode: row.status_code,
    title: row.title,
    excerpt: row.excerpt,
    headings: JSON.parse(row.headings),
    links: JSON.parse(row.links),
    forms: JSON.parse(row.forms),
    html: row.html,
    robotsAllowed: Boolean(row.robots_allowed),
    partial: Boolean(row.partial),
    label: row.label,
    fetchedAt: row.fetched_at,
    error: row.error,
  };
}
function mapAlert(row: AlertRow): AlertWatcher {
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    siteId: row.site_id,
    metric: row.metric,
    dropPoints: row.drop_points,
    createdAt: row.created_at,
  };
}
function mapAlertEvent(row: AlertEventRow): AlertEvent {
  return {
    id: row.id,
    alertId: row.alert_id,
    runId: row.run_id,
    title: row.title,
    detail: row.detail,
    slackStatus: row.slack_status,
    createdAt: row.created_at,
    read: Boolean(row.read),
  };
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(Number(n) || min)));
}
