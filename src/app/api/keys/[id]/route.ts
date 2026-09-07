import { deleteAnswerKey } from "@/lib/db";
import { json, notFound } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!deleteAnswerKey(id)) return notFound("Answer key not found");
  return json({ ok: true });
}
