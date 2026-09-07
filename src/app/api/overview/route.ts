import { json } from "@/lib/http";
import { buildOverview } from "@/lib/overview";

export const runtime = "nodejs";

export async function GET() {
  return json(buildOverview());
}
