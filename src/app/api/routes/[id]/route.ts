import { updateRoute } from "@/lib/db";
import { json, notFound, readJson } from "@/lib/http";
import type { Route } from "@/lib/types";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const PATCH = workspaceRoute(async (request, context) => {
  const { id } = await context.params;
  const body = await readJson<Partial<Route>>(request);
  const route = updateRoute(id, body);
  if (!route) return notFound("Route not found");
  return json({ route });
});
