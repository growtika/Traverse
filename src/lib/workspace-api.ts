import { hydrateWorkspace, persistWorkspaceNow } from "./db";

type RouteContext = { params: Promise<Record<string, string>> };

export function workspaceRoute<
  T extends (request: Request, context: RouteContext) => Promise<Response> | Response,
>(fn: T): T {
  const wrapped = async (request: Request, context: RouteContext) => {
    await hydrateWorkspace();
    const response = await fn(request, context);
    if (request.method !== "GET" && request.method !== "HEAD") {
      await persistWorkspaceNow();
    }
    return response;
  };
  return wrapped as T;
}
