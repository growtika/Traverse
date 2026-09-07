import { faviconCandidates, normalizeDomainInput } from "@/lib/domain";
import { insertSite, listSites } from "@/lib/db";
import { badRequest, json, readJson } from "@/lib/http";
import type { SiteRole } from "@/lib/types";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  return json({ sites: listSites() });
});

export const POST = workspaceRoute(async (request) => {
  const body = await readJson<{
    domain?: string;
    name?: string;
    role?: SiteRole;
    notes?: string;
  }>(request);
  try {
    const parsed = normalizeDomainInput(body.domain || "");
    const role: SiteRole = body.role === "rival" ? "rival" : "client";
    const name = (body.name || parsed.domain).trim();
    if (listSites().some((s) => s.domain === parsed.domain)) {
      return badRequest("That domain is already in the workspace.");
    }
    const site = insertSite({
      name,
      domain: parsed.domain,
      role,
      startPath: parsed.startPath,
      faviconUrl: faviconCandidates(parsed.domain)[1],
      notes: body.notes?.trim() || "",
    });
    return json({ site }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add site";
    if (/UNIQUE/i.test(message)) {
      return badRequest("That domain is already in the workspace.");
    }
    return badRequest(message);
  }
});
