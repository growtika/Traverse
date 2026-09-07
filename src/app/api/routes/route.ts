import { listRoutes } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  return json({ routes: listRoutes() });
}
