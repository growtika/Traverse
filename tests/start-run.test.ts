import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "traverse-start-"));
process.env.TRAVERSE_DATA_DIR = dir;

const {
  applyWorkspaceSnapshot,
  deleteSite,
  exportWorkspaceSnapshot,
  listRoutes,
  listSites,
  upsertSite,
} = await import("../src/lib/db");
const { createAndStartRun } = await import("../src/lib/survey");

function clearSites() {
  for (const site of listSites()) {
    deleteSite(site.id);
  }
}

describe("start run with embedded sites payload", () => {
  it("starts a run from siteIds + sites when the store is empty", () => {
    clearSites();
    expect(listSites()).toHaveLength(0);
    const route = listRoutes()[0];
    expect(route).toBeTruthy();

    const run = createAndStartRun({
      siteIds: ["sit_embedded"],
      routeIds: [route.id],
      sites: [
        {
          id: "sit_embedded",
          name: "Reco",
          domain: "example.com",
          role: "client",
        },
      ],
    });

    expect(listSites()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sit_embedded",
          domain: "example.com",
          role: "client",
        }),
      ]),
    );
    expect(run.siteIds).toEqual(["sit_embedded"]);
    expect(run.routeIds).toEqual([route.id]);
    expect(run.status).toBe("queued");
  });

  it("reports a storage reset when siteIds are missing from an empty store", () => {
    clearSites();
    expect(() => createAndStartRun({ siteIds: ["sit_ghost"] })).toThrow(
      /Workspace storage reset on this server — re-add your client site/,
    );
  });

  it("requires a selected client site after upsert", () => {
    clearSites();
    expect(() =>
      createAndStartRun({
        siteIds: ["sit_rival_only"],
        sites: [
          {
            id: "sit_rival_only",
            name: "Obsidian",
            domain: "obsidiansecurity.com",
            role: "rival",
          },
        ],
      }),
    ).toThrow(/Select at least one client site before starting a survey/);
    expect(listSites().find((site) => site.id === "sit_rival_only")?.role).toBe("rival");
  });

  it("saves role client on upsert and round-trips a workspace snapshot", () => {
    clearSites();
    upsertSite({
      id: "sit_reco",
      name: "Reco",
      domain: "https://reco.ai",
      role: "client",
    });
    expect(listSites()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "sit_reco", domain: "reco.ai", role: "client" }),
      ]),
    );

    const snap = exportWorkspaceSnapshot();
    deleteSite("sit_reco");
    expect(listSites().some((site) => site.id === "sit_reco")).toBe(false);
    applyWorkspaceSnapshot(snap);
    expect(listSites().find((site) => site.id === "sit_reco")).toMatchObject({
      domain: "reco.ai",
      role: "client",
    });
  });
});
