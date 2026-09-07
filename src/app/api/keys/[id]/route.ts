import { deleteAnswerKey } from "@/lib/db";
import { json, notFound } from "@/lib/http";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const DELETE = workspaceRoute(async (_request, context) => {
  const { id } = await context.params;
  if (!deleteAnswerKey(id)) return notFound("Answer key not found");
  return json({ ok: true });
});
