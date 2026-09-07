import { getEvidence } from "@/lib/db";
import { json, notFound } from "@/lib/http";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async (_request, context) => {
  const { id } = await context.params;
  const evidence = getEvidence(id);
  if (!evidence) return notFound("Evidence not found");
  return json({ evidence });
});
