import { deleteAlert, markAlertRead, updateAlert } from "@/lib/db";
import { json, notFound, readJson } from "@/lib/http";
import type { AlertWatcher } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readJson<Partial<AlertWatcher> & { read?: boolean }>(request);
  if (body.read) {
    markAlertRead(id);
    return json({ ok: true });
  }
  const alert = updateAlert(id, body);
  if (!alert) return notFound("Alert not found");
  return json({ alert });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!deleteAlert(id)) return notFound("Alert not found");
  return json({ ok: true });
}
