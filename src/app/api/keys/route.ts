import { insertAnswerKey, listAnswerKeys } from "@/lib/db";
import { badRequest, json, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return json({ keys: listAnswerKeys() });
}

export async function POST(request: Request) {
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
}
