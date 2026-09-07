import { deleteSite, getSite, updateSite } from "@/lib/db";
import { normalizeDomainInput } from "@/lib/domain";
import { badRequest, json, notFound, readJson } from "@/lib/http";
import type { SiteRole } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const site = getSite(id);
  if (!site) return notFound("Site not found");
  return json({ site });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readJson<{
    name?: string;
    domain?: string;
    role?: SiteRole;
    notes?: string;
  }>(request);
  try {
    const patch: Record<string, unknown> = {};
    if (body.name) patch.name = body.name.trim();
    if (body.role) patch.role = body.role;
    if (typeof body.notes === "string") patch.notes = body.notes;
    if (body.domain) {
      const parsed = normalizeDomainInput(body.domain);
      patch.domain = parsed.domain;
      patch.startPath = parsed.startPath;
    }
    const site = updateSite(id, patch);
    if (!site) return notFound("Site not found");
    return json({ site });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Update failed");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!deleteSite(id)) return notFound("Site not found");
  return json({ ok: true });
}
