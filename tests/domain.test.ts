import { describe, expect, it } from "vitest";
import { normalizeDomainInput, resolveUrl } from "../src/lib/domain";

describe("normalizeDomainInput", () => {
  it("accepts a bare public domain", () => {
    expect(normalizeDomainInput("Example.com/pricing").domain).toBe("example.com");
    expect(normalizeDomainInput("Example.com/pricing").startPath).toBe("/pricing");
  });

  it("rejects localhost and IPs", () => {
    expect(() => normalizeDomainInput("localhost")).toThrow();
    expect(() => normalizeDomainInput("127.0.0.1")).toThrow();
    expect(() => normalizeDomainInput("10.0.0.8")).toThrow();
  });

  it("rejects missing TLD", () => {
    expect(() => normalizeDomainInput("intranet")).toThrow(/TLD/);
  });
});

describe("resolveUrl", () => {
  it("keeps http(s) and drops hashes", () => {
    expect(resolveUrl("/about#team", "https://example.com")).toBe("https://example.com/about");
    expect(resolveUrl("javascript:alert(1)", "https://example.com")).toBeNull();
  });
});
