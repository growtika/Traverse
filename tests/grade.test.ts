import { describe, expect, it } from "vitest";
import { gradeKnow, gradeVerify, matchAnswerKey } from "../src/lib/grade";
import type { ParsedPage } from "../src/lib/parse";

const page = (over: Partial<ParsedPage> = {}): ParsedPage => ({
  title: "Example Domain",
  description: "This domain is for use in documentation.",
  h1: "Example Domain",
  headings: ["Example Domain"],
  excerpt: "This domain is for use in illustrative examples.",
  text: "This domain is for use in illustrative examples in documents.",
  links: [],
  forms: [],
  loginSignals: [],
  ...over,
});

describe("matchAnswerKey", () => {
  it("requires the phrase at normal/strict", () => {
    expect(matchAnswerKey("Welcome to Example Domain", "example domain", "normal")).toBe(true);
    expect(matchAnswerKey("Welcome to Example Domain", "pricing starts at $12", "strict")).toBe(
      false,
    );
  });

  it("allows token overlap when loose", () => {
    expect(matchAnswerKey("illustrative examples in documents", "illustrative documents", "loose")).toBe(
      true,
    );
  });
});

describe("gradeVerify", () => {
  it("returns N/A when no keys exist", () => {
    const result = gradeVerify([], "anything", "normal");
    expect(result.score).toBeNull();
    expect(result.note).toMatch(/No answer keys/);
  });

  it("scores matched keys", () => {
    const result = gradeVerify(
      [
        {
          id: "1",
          siteId: null,
          routeId: null,
          claim: "Name",
          expected: "example domain",
          createdAt: "",
        },
      ],
      "Example Domain is reserved",
      "normal",
    );
    expect(result.score).toBe(100);
  });
});

describe("gradeKnow", () => {
  it("scores a real public identity page", () => {
    expect(gradeKnow(page(), true)).toBeGreaterThanOrEqual(80);
  });

  it("is zero when the fetch failed", () => {
    expect(gradeKnow(null, false)).toBe(0);
  });
});
