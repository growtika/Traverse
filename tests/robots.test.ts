import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobotsTxt } from "../src/lib/robots";

const sample = `
User-agent: *
Disallow: /admin
Disallow: /private

User-agent: Traverse
Disallow: /secret
`;

describe("robots", () => {
  it("uses the Traverse group when present", () => {
    const rules = parseRobotsTxt(sample, "Traverse/traverse-public-1");
    expect(isPathAllowed("/secret", rules)).toBe(false);
    expect(isPathAllowed("/admin", rules)).toBe(true);
  });

  it("blocks site-wide disallow", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /", "Traverse/x");
    expect(isPathAllowed("/", rules)).toBe(false);
  });
});
