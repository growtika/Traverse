import { getRun, listCrossings, listEvidence, listRoutes, listSites } from "@/lib/db";
import { json, notFound } from "@/lib/http";
import { summarizeRun } from "@/lib/alerts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = getRun(id);
  if (!run) return notFound("Run not found");
  const crossings = listCrossings(id);
  const sites = listSites();
  const routes = listRoutes();
  return json({
    run,
    summary: summarizeRun(crossings),
    crossings: crossings.map((crossing) => ({
      ...crossing,
      site: sites.find((s) => s.id === crossing.siteId) || null,
      route: routes.find((r) => r.id === crossing.routeId) || null,
      evidence: listEvidence(crossing.id),
    })),
  });
}
