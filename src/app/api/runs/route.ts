import { listCrossings, listRuns } from "@/lib/db";
import { json, badRequest, readJson } from "@/lib/http";
import { summarizeRun } from "@/lib/alerts";
import { createAndStartRun } from "@/lib/survey";

export const runtime = "nodejs";

export async function GET() {
  const runs = listRuns().map((run) => ({
    ...run,
    summary: run.status === "completed" ? summarizeRun(listCrossings(run.id)) : null,
  }));
  return json({ runs });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ siteIds?: string[]; routeIds?: string[] }>(request);
    const run = createAndStartRun(body);
    return json({ run }, 201);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Could not start run");
  }
}
