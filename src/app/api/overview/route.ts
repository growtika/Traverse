import { json } from "@/lib/http";
import { buildOverview } from "@/lib/overview";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  return json(buildOverview());
});
