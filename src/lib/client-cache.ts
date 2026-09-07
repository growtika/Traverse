import type { Site } from "./types";

const SITES_KEY = "traverse.workspace.sites";

export function cacheSites(sites: Site[]) {
  try {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  } catch {
    // private mode / quota
  }
}

export function readCachedSites(): Site[] {
  try {
    const raw = localStorage.getItem(SITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Site[]) : [];
  } catch {
    return [];
  }
}

export function rememberSites(server: Site[] | undefined, fallback: Site[]): Site[] {
  if (server?.length) {
    cacheSites(server);
    return server;
  }
  if (fallback.length) {
    cacheSites(fallback);
    return fallback;
  }
  const cached = readCachedSites();
  return cached;
}
