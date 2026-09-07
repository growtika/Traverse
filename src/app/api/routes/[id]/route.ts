import { updateRoute } from "@/lib/db";
import { json, notFound, readJson } from "@/lib/http";
import type { Route } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readJson<Partial<Route>>(request);
  const route = updateRoute(id, body);
  if (!route) return notFound("Route not found");
  return json({ route });
}
