import { getSettings, updateSettings } from "@/lib/db";
import { json, readJson } from "@/lib/http";
import type { Settings } from "@/lib/types";
import { workspaceRoute } from "@/lib/workspace-api";

export const runtime = "nodejs";

export const GET = workspaceRoute(async () => {
  return json({ settings: getSettings() });
});

export const PUT = workspaceRoute(async (request) => {
  const patch = await readJson<Partial<Settings>>(request);
  return json({ settings: updateSettings(patch) });
});
