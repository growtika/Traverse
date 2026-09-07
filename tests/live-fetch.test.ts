import { describe, expect, it } from "vitest";
import { fetchPublicPage, userAgentFor } from "../src/lib/fetch-page";
import { parseHtml } from "../src/lib/parse";

describe("live public fetch", () => {
  it("fetches example.com over the network", async () => {
    const result = await fetchPublicPage({
      url: "https://example.com/",
      userAgent: userAgentFor("vitest"),
      robots: null,
      respectRobots: false,
    });
    expect(result.ok).toBe(true);
    expect(result.html).toBeTruthy();
    expect(result.label).toMatch(/HTML evidence frame/);
    const page = parseHtml(result.html || "", result.finalUrl || result.url);
    expect(page.title.toLowerCase()).toContain("example");
  });
});
