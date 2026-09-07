import { getSettings, updateSettings } from "@/lib/db";
import { json, readJson } from "@/lib/http";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return json({ settings: getSettings() });
}

export async function PUT(request: Request) {
  const patch = await readJson<Partial<Settings>>(request);
  return json({ settings: updateSettings(patch) });
}
