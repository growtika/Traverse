import { listRoutes } from "@/lib/db";
import { json } from "@/lib/http";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  return json({ routes: listRoutes() });
});
