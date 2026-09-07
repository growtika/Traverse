import { getEvidence } from "@/lib/db";
import { json, notFound } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const evidence = getEvidence(id);
  if (!evidence) return notFound("Evidence not found");
  return json({ evidence });
}
