import type { WorkspaceSnapshot } from "./types";

const WORKSPACE_PATH = "traverse/workspace.json";

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

export function hasBlobToken(): boolean {
  return Boolean(blobToken());
}

export async function readWorkspaceBlob(): Promise<WorkspaceSnapshot | null> {
  const token = blobToken();
  if (!token) return null;
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({
    prefix: WORKSPACE_PATH,
    token,
    limit: 20,
  });
  const blob =
    blobs.find((item) => item.pathname === WORKSPACE_PATH) ||
    blobs.find((item) => item.pathname.startsWith("traverse/workspace"));
  if (!blob) return null;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as WorkspaceSnapshot;
}

export async function writeWorkspaceBlob(data: WorkspaceSnapshot): Promise<void> {
  const token = blobToken();
  if (!token) return;
  const { put } = await import("@vercel/blob");
  await put(WORKSPACE_PATH, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
}
