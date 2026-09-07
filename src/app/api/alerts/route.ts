import { insertAlert, listAlertEvents, listAlerts } from "@/lib/db";
import { badRequest, json, readJson } from "@/lib/http";
import type { AlertMetric } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return json({ alerts: listAlerts(), events: listAlertEvents() });
}

export async function POST(request: Request) {
  const body = await readJson<{
    name?: string;
    siteId?: string | null;
    metric?: AlertMetric;
    dropPoints?: number;
  }>(request);
  if (!body.name?.trim()) return badRequest("Name is required.");
  const alert = insertAlert({
    name: body.name.trim(),
    enabled: true,
    siteId: body.siteId || null,
    metric: body.metric || "overall",
    dropPoints: Number(body.dropPoints) || 10,
  });
  return json({ alert }, 201);
}
