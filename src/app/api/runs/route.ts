import { listCrossings, listRuns } from "@/lib/db";
import { json, badRequest, readJson } from "@/lib/http";
import { summarizeRun } from "@/lib/alerts";
import { createAndStartRun } from "@/lib/survey";
import type { SiteInput } from "@/lib/types";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  const runs = listRuns().map((run) => ({
    ...run,
    summary: run.status === "completed" ? summarizeRun(listCrossings(run.id)) : null,
  }));
  return json({ runs });
});

export const POST = workspaceRoute(async (request) => {
  try {
    const body = await readJson<{
      siteIds?: string[];
      routeIds?: string[];
      sites?: SiteInput[];
    }>(request);
    const run = createAndStartRun(body);
    return json({ run }, 201);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Could not start run");
  }
});
