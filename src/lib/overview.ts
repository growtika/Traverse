import { listCrossings, listRuns, listSites } from "./db";
import { delta, summarizeRun } from "./alerts";

export function buildOverview() {
  const runs = listRuns();
  const completed = runs.filter((r) => r.status === "completed");
  const latest = completed[0] ?? null;
  const previous = completed[1] ?? null;
  const latestCrossings = latest ? listCrossings(latest.id) : [];
  const previousCrossings = previous ? listCrossings(previous.id) : [];
  const latestSummary = latest ? summarizeRun(latestCrossings) : null;
  const previousSummary = previous ? summarizeRun(previousCrossings) : null;
  const sites = listSites();

  const siteRows = sites.map((site) => {
    const latestForSite = latestCrossings.filter((c) => c.siteId === site.id);
    const previousForSite = previousCrossings.filter((c) => c.siteId === site.id);
    const now = latestForSite.length ? summarizeRun(latestForSite) : null;
    const then = previousForSite.length ? summarizeRun(previousForSite) : null;
    return {
      site,
      latest: now,
      delta: now && then ? delta(now.overall, then.overall) : null,
      crossings: latestForSite.length,
    };
  });

  return {
    runCount: runs.length,
    completedCount: completed.length,
    latestRun: latest,
    previousRun: previous,
    latestSummary,
    deltas: latestSummary && previousSummary
      ? {
          overall: delta(latestSummary.overall, previousSummary.overall),
          know: delta(latestSummary.know, previousSummary.know),
          find: delta(latestSummary.find, previousSummary.find),
          extract: delta(latestSummary.extract, previousSummary.extract),
          verify: delta(latestSummary.verify, previousSummary.verify),
          act: delta(latestSummary.act, previousSummary.act),
        }
      : null,
    siteRows,
    honesty:
      completed.length === 0
        ? "No completed surveys yet. Numbers stay empty until a real public crawl finishes."
        : previous
          ? "Deltas compare this completed run to the previous completed run only."
          : "Only one completed run exists, so there is no week-over-week invention.",
  };
}
