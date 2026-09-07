import { SPEED_DELAY_MS } from "./defaults";
import {
  getRun,
  getSettings,
  insertCrossing,
  insertEvidence,
  insertRun,
  listAnswerKeys,
  listRoutes,
  listSites,
  nowIso,
  persistWorkspaceNow,
  updateCrossing,
  updateRun,
  upsertSite,
} from "./db";
import { normalizeDomainInput, siteOrigin } from "./domain";
import { fetchPublicPage, fetchRobots, userAgentFor } from "./fetch-page";
import {
  buildFixes,
  combineScores,
  gradeAct,
  gradeExtract,
  gradeFind,
  gradeKnow,
  gradeVerify,
} from "./grade";
import { newId } from "./id";
import { extractFacts, parseHtml, scoreTermMatch, type ParsedPage } from "./parse";
import { evaluateAlerts } from "./alerts";
import type {
  AnswerKey,
  Crossing,
  EvidencePage,
  JournalEvent,
  Route,
  Run,
  Settings,
  Site,
  SiteInput,
  StageName,
} from "./types";

const jobs = new Map<string, Promise<void>>();

export function createAndStartRun(input?: {
  siteIds?: string[];
  routeIds?: string[];
  sites?: SiteInput[];
}): Run {
  if (input?.sites?.length) {
    for (const site of input.sites) {
      upsertSite(site);
    }
  }
  const settings = getSettings();
  const sites = pickSites(settings, input?.siteIds, input?.sites);
  if (!sites.length) {
    if (input?.siteIds?.length) {
      throw new Error("Workspace storage reset on this server — re-add your client site");
    }
    throw new Error("Add at least one client site before starting a survey.");
  }
  if (!sites.some((site) => site.role === "client")) {
    throw new Error("Select at least one client site before starting a survey.");
  }
  const routes = listRoutes().filter((r) =>
    input?.routeIds?.length ? input.routeIds.includes(r.id) : r.enabled,
  );
  if (!routes.length) {
    throw new Error("Enable at least one route before starting a survey.");
  }

  const total = sites.length * routes.length * settings.crossingsPerRoute;
  const run = insertRun({
    id: newId("run"),
    status: "queued",
    siteIds: sites.map((s) => s.id),
    routeIds: routes.map((r) => r.id),
    settingsSnapshot: settings,
    progress: { current: 0, total, message: "Queued" },
    createdAt: nowIso(),
  });

  const job = executeRun(run.id).catch((error) => {
    updateRun(run.id, {
      status: "failed",
      finishedAt: nowIso(),
      error: error instanceof Error ? error.message : "Run failed",
    });
  });
  jobs.set(run.id, job);
  return run;
}

export function getRunJob(id: string): Promise<void> | undefined {
  return jobs.get(id);
}

async function executeRun(runId: string) {
  const existing = getRun(runId);
  const run = updateRun(runId, {
    status: "running",
    startedAt: nowIso(),
    progress: {
      current: 0,
      total: existing?.progress.total ?? 0,
      message: "Starting public crawl",
    },
  });
  if (!run) throw new Error("Run missing");

  const settings = run.settingsSnapshot;
  const sites = listSites().filter((s) => run.siteIds.includes(s.id));
  const routes = listRoutes().filter((r) => run.routeIds.includes(r.id));
  const keys = listAnswerKeys();
  const total = sites.length * routes.length * settings.crossingsPerRoute;
  let current = 0;

  for (const site of sites) {
    const origin = `https://${site.domain}`;
    const ua = userAgentFor(settings.agentLabel);
    const robots = settings.respectRobots ? await fetchRobots(origin, ua) : null;

    for (const route of routes) {
      for (let i = 0; i < settings.crossingsPerRoute; i += 1) {
        current += 1;
        updateRun(runId, {
          progress: {
            current,
            total,
            message: `${site.domain} · ${route.name} · crossing ${i + 1}/${settings.crossingsPerRoute}`,
          },
        });
        await runCrossing({
          runId,
          site,
          route,
          crossingIndex: i,
          settings,
          keys,
          robots,
        });
        void persistWorkspaceNow();
      }
    }
  }

  updateRun(runId, {
    status: "completed",
    finishedAt: nowIso(),
    progress: { current: total, total, message: "Completed" },
  });
  await evaluateAlerts(runId);
  await persistWorkspaceNow();
}

async function runCrossing(input: {
  runId: string;
  site: Site;
  route: Route;
  crossingIndex: number;
  settings: Settings;
  keys: AnswerKey[];
  robots: Awaited<ReturnType<typeof fetchRobots>> | null;
}) {
  const crossing: Crossing = {
    id: newId("xng"),
    runId: input.runId,
    siteId: input.site.id,
    routeId: input.route.id,
    crossingIndex: input.crossingIndex,
    status: "running",
    knowScore: null,
    findScore: null,
    extractScore: null,
    verifyScore: null,
    actScore: null,
    overallScore: null,
    passed: null,
    journal: [],
    fixes: [],
    error: null,
  };
  insertCrossing(crossing);

  const journal: JournalEvent[] = [];
  const note = (stage: JournalEvent["stage"], message: string, extra?: Partial<JournalEvent>) => {
    journal.push({ t: nowIso(), stage, message, ...extra });
  };

  const ua = userAgentFor(input.settings.agentLabel);
  const startUrl = siteOrigin(input.site.domain, input.site.startPath);
  note("run", `Public crawl start for ${input.site.domain} · ${input.route.name}. No login, no form submit.`);

  const visited = new Set<string>();
  const captured: { url: string; page: ParsedPage; evidenceId: string }[] = [];

  const first = await capturePage({
    crossingId: crossing.id,
    stage: "know",
    url: startUrl,
    ua,
    robots: input.robots,
    respectRobots: input.settings.respectRobots,
  });
  await delay(input.settings);
  visited.add(normalizeVisit(first.finalUrl || first.url));

  if (first.ok && first.page) {
    captured.push({ url: first.finalUrl || first.url, page: first.page, evidenceId: first.id });
    note("know", `Fetched ${first.finalUrl || first.url}`, {
      url: first.finalUrl || first.url,
      evidenceId: first.id,
    });
  } else {
    note("know", `Homepage fetch failed: ${first.error || "unknown error"}`, { url: startUrl });
  }

  const know = gradeKnow(first.page, first.ok);
  updateCrossing(crossing.id, { knowScore: know, journal: [...journal] });

  const candidates = rankCandidates(
    input.route,
    captured.flatMap((c) => c.page.links),
    input.crossingIndex,
  );

  const maxPages = input.settings.maxPagesPerCrossing;
  for (const href of candidates) {
    if (captured.length >= maxPages) break;
    const key = normalizeVisit(href);
    if (visited.has(key)) continue;
    visited.add(key);
    const next = await capturePage({
      crossingId: crossing.id,
      stage: "find",
      url: href,
      ua,
      robots: input.robots,
      respectRobots: input.settings.respectRobots,
    });
    await delay(input.settings);
    if (next.ok && next.page) {
      captured.push({ url: next.finalUrl || next.url, page: next.page, evidenceId: next.id });
      note("find", `Followed ${next.finalUrl || next.url}`, {
        url: next.finalUrl || next.url,
        evidenceId: next.id,
      });
    } else {
      note("find", `Could not use ${href}: ${next.error || "failed"}`, { url: href });
    }
  }

  if (captured.length <= 1 && input.route.slug !== "identity") {
    note("find", "No additional public pages matched this route from homepage links.");
  }

  const find = gradeFind(
    input.route,
    captured.map((c) => ({ url: c.url, page: c.page })),
  );
  updateCrossing(crossing.id, { findScore: find, journal: [...journal] });
  const facts = extractFacts(captured.map((c) => c.page));
  const extract = gradeExtract(
    facts,
    captured.map((c) => c.page),
  );
  note("extract", `Extracted ${facts.facts.length} facts, ${facts.prices.length} prices, ${facts.contacts.length} contacts.`);
  updateCrossing(crossing.id, { extractScore: extract, journal: [...journal] });

  const applicableKeys = input.keys.filter((key) => {
    if (key.siteId && key.siteId !== input.site.id) return false;
    if (key.routeId && key.routeId !== input.route.id) return false;
    return true;
  });
  const corpus = captured.map((c) => `${c.page.title} ${c.page.headings.join(" ")} ${c.page.text}`).join("\n");
  const verify = gradeVerify(applicableKeys, corpus, input.settings.verifyStrictness);
  note("verify", verify.note);
  updateCrossing(crossing.id, { verifyScore: verify.score, journal: [...journal] });

  const act = gradeAct(captured.map((c) => c.page));
  const forms = captured.flatMap((c) => c.page.forms);
  note(
    "act",
    forms.length
      ? `Found ${forms.length} form(s), listed fields, did not submit.`
      : "No public form captured. Logged CTAs only.",
  );

  const scores = combineScores({
    know,
    find,
    extract,
    verify: verify.score,
    act,
  });
  const fixes = buildFixes({
    route: input.route,
    scores,
    missedKeys: verify.missed,
    pages: captured.map((c) => c.page),
  });

  updateCrossing(crossing.id, {
    status: first.ok ? "completed" : "failed",
    knowScore: scores.know,
    findScore: scores.find,
    extractScore: scores.extract,
    verifyScore: scores.verify,
    actScore: scores.act,
    overallScore: scores.overall,
    passed: first.ok ? scores.passed : false,
    journal,
    fixes,
    error: first.ok ? null : first.error,
  });
}

async function capturePage(input: {
  crossingId: string;
  stage: StageName;
  url: string;
  ua: string;
  robots: Awaited<ReturnType<typeof fetchRobots>> | null;
  respectRobots: boolean;
}): Promise<{
  id: string;
  ok: boolean;
  url: string;
  finalUrl: string | null;
  page: ParsedPage | null;
  error: string | null;
}> {
  const fetched = await fetchPublicPage({
    url: input.url,
    userAgent: input.ua,
    robots: input.robots,
    respectRobots: input.respectRobots,
  });
  const page = fetched.html ? parseHtml(fetched.html, fetched.finalUrl || fetched.url) : null;
  const evidence: EvidencePage = {
    id: newId("evd"),
    crossingId: input.crossingId,
    stage: input.stage,
    url: fetched.url,
    finalUrl: fetched.finalUrl,
    statusCode: fetched.status,
    title: page?.title ?? null,
    excerpt: page?.excerpt ?? null,
    headings: page?.headings ?? [],
    links: page?.links ?? [],
    forms: page?.forms ?? [],
    html: fetched.html,
    robotsAllowed: fetched.robotsAllowed,
    partial: fetched.partial,
    label: fetched.label,
    fetchedAt: nowIso(),
    error: fetched.error,
  };
  insertEvidence(evidence);
  return {
    id: evidence.id,
    ok: fetched.ok,
    url: fetched.url,
    finalUrl: fetched.finalUrl,
    page,
    error: fetched.error,
  };
}

function rankCandidates(
  route: Route,
  links: { href: string; text: string }[],
  crossingIndex: number,
): string[] {
  const scored = links
    .map((link) => {
      const hay = `${link.href} ${link.text}`;
      const term = scoreTermMatch(hay, [...route.queryTerms, ...route.pathHints]);
      const hint = route.pathHints.some((p) => link.href.toLowerCase().includes(p.toLowerCase()))
        ? 20
        : 0;
      return { href: link.href, score: term + hint };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const rotated = [
    ...scored.slice(crossingIndex),
    ...scored.slice(0, crossingIndex),
  ];
  return rotated.map((item) => item.href);
}

function payloadDomain(raw: string): string {
  try {
    return normalizeDomainInput(raw).domain;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function pickSites(settings: Settings, siteIds?: string[], payload?: SiteInput[]): Site[] {
  const all = listSites();
  const selected = siteIds?.length
    ? all.filter((site) => {
        if (siteIds.includes(site.id)) return true;
        return Boolean(
          payload?.some(
            (item) =>
              Boolean(item.id && siteIds.includes(item.id)) &&
              payloadDomain(item.domain) === site.domain,
          ),
        );
      })
    : all;
  if (!settings.includeRivals) {
    const clients = selected.filter((s) => s.role === "client");
    return clients.length ? clients : selected;
  }
  return selected;
}

function normalizeVisit(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.endsWith("/") && u.pathname !== "/") {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function delay(settings: Settings): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SPEED_DELAY_MS[settings.speed]));
}
