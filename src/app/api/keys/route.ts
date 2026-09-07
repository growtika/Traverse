import { insertAnswerKey, listAnswerKeys } from "@/lib/db";
import { badRequest, json, readJson } from "@/lib/http";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  return json({ keys: listAnswerKeys() });
});

export const POST = workspaceRoute(async (request) => {
  const body = await readJson<{
    siteId?: string | null;
    routeId?: string | null;
    claim?: string;
    expected?: string;
  }>(request);
  if (!body.claim?.trim() || !body.expected?.trim()) {
    return badRequest("Claim and expected text are required.");
  }
  const key = insertAnswerKey({
    siteId: body.siteId || null,
    routeId: body.routeId || null,
    claim: body.claim.trim(),
    expected: body.expected.trim(),
  });
  return json({ key }, 201);
});
