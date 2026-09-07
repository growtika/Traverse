import { PASS_THRESHOLD } from "./defaults";
import { scoreTermMatch, type ParsedPage } from "./parse";
import type {
  AnswerKey,
  ExtractedFacts,
  FixSuggestion,
  Route,
  StageName,
  VerifyStrictness,
} from "./types";

export type StageScores = {
  know: number;
  find: number | null;
  extract: number;
  verify: number | null;
  act: number;
  overall: number;
  passed: boolean;
  verifyNote: string;
};

export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchAnswerKey(
  haystack: string,
  expected: string,
  strictness: VerifyStrictness,
): boolean {
  const hay = normalizeForMatch(haystack);
  const needle = normalizeForMatch(expected);
  if (!needle) return false;
  if (strictness === "strict") {
    return hay.includes(needle);
  }
  if (strictness === "normal") {
    return hay.includes(needle);
  }
  const tokens = needle.split(" ").filter((t) => t.length > 2);
  if (!tokens.length) return hay.includes(needle);
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits / tokens.length >= 0.6;
}

export function gradeKnow(page: ParsedPage | null, fetchOk: boolean): number {
  if (!fetchOk || !page) return 0;
  let score = 0;
  if (page.title.length > 2) score += 20;
  if (page.description.length > 8) score += 20;
  if (page.h1.length > 2) score += 20;
  if ((page.title + page.h1 + page.description).length > 24) score += 20;
  const generic = /error|not found|access denied|just a moment/i.test(
    `${page.title} ${page.h1}`,
  );
  if (!generic && page.text.length > 80) score += 20;
  return clamp(score);
}

export function gradeFind(
  route: Route,
  pages: { url: string; page: ParsedPage }[],
): number {
  if (!pages.length) return 0;
  if (route.slug === "identity") {
    return pages[0] ? Math.max(70, scoreFromPages(pages, route)) : 0;
  }
  return scoreFromPages(pages, route);
}

function scoreFromPages(
  pages: { url: string; page: ParsedPage }[],
  route: Route,
): number {
  let best = 0;
  for (const item of pages) {
    const hay = `${item.url} ${item.page.title} ${item.page.headings.join(" ")} ${item.page.excerpt}`;
    const termScore = scoreTermMatch(hay, route.queryTerms);
    const hintScore = route.pathHints.some((hint) =>
      new URL(item.url).pathname.toLowerCase().includes(hint.toLowerCase()),
    )
      ? 30
      : 0;
    best = Math.max(best, Math.min(100, termScore + hintScore));
  }
  return clamp(best);
}

export function gradeExtract(facts: ExtractedFacts, pages: ParsedPage[]): number {
  if (!pages.length) return 0;
  let score = 0;
  if (facts.identityLine && facts.identityLine.length > 8) score += 20;
  score += Math.min(30, facts.facts.length * 6);
  score += Math.min(20, facts.prices.length * 8);
  score += Math.min(15, facts.contacts.length * 8);
  score += Math.min(15, facts.claims.length * 5);
  if (pages.some((p) => p.text.length > 200)) score += 10;
  return clamp(score);
}

export function gradeVerify(
  keys: AnswerKey[],
  corpus: string,
  strictness: VerifyStrictness,
): { score: number | null; note: string; missed: AnswerKey[] } {
  if (!keys.length) {
    return {
      score: null,
      note: "No answer keys configured — Verify is N/A, not a pass.",
      missed: [],
    };
  }
  const missed = keys.filter((key) => !matchAnswerKey(corpus, key.expected, strictness));
  const matched = keys.length - missed.length;
  return {
    score: clamp(Math.round((matched / keys.length) * 100)),
    note: `${matched}/${keys.length} keys matched at ${strictness} strictness.`,
    missed,
  };
}

export function gradeAct(pages: ParsedPage[]): number {
  if (!pages.length) return 0;
  let score = 0;
  const forms = pages.flatMap((p) => p.forms);
  const publicForm = forms.find((f) =>
    f.fields.some((field) => !/password|otp|token/i.test(`${field.name} ${field.type}`)),
  );
  if (publicForm) {
    score += 50;
    if (publicForm.fields.length) score += 15;
  }
  const cta = pages.some((p) =>
    p.links.some((l) =>
      /demo|contact|start|trial|talk|book|sales/i.test(`${l.href} ${l.text}`),
    ),
  );
  if (cta) score += 25;
  const loginHeavy = pages.some(
    (p) => p.loginSignals.length >= 2 && p.forms.some((f) => f.fields.some((field) => field.type === "password")),
  );
  if (loginHeavy && !publicForm) score = Math.min(score, 25);
  return clamp(score);
}

export function combineScores(parts: {
  know: number;
  find: number;
  extract: number;
  verify: number | null;
  act: number;
}): StageScores {
  const numeric = [parts.know, parts.find, parts.extract, parts.act];
  if (parts.verify !== null) numeric.push(parts.verify);
  const overall = clamp(Math.round(numeric.reduce((a, b) => a + b, 0) / numeric.length));
  return {
    know: parts.know,
    find: parts.find,
    extract: parts.extract,
    verify: parts.verify,
    act: parts.act,
    overall,
    passed: overall >= PASS_THRESHOLD,
    verifyNote: "",
  };
}

export function buildFixes(input: {
  route: Route;
  scores: StageScores;
  missedKeys: AnswerKey[];
  pages: ParsedPage[];
}): FixSuggestion[] {
  const fixes: FixSuggestion[] = [];
  if (input.scores.know < 60) {
    fixes.push({
      stage: "know",
      severity: "hazard",
      title: "Identity is thin on the first public page",
      detail:
        "Put a one-sentence description of what you do in the H1 or meta description. Agents start there.",
    });
  }
  if ((input.scores.find ?? 0) < 60 && input.route.slug !== "identity") {
    fixes.push({
      stage: "find",
      severity: "hazard",
      title: `No clear path for “${input.route.name}”`,
      detail: `Add a public nav or footer link using words like ${input.route.queryTerms.slice(0, 3).join(", ")}.`,
    });
  }
  if (input.scores.extract < 60) {
    fixes.push({
      stage: "extract",
      severity: "gap",
      title: "Facts are hard to extract",
      detail: "Move key claims into headings and the first two paragraphs. Avoid burying them in images or PDFs.",
    });
  }
  if (input.missedKeys.length) {
    for (const key of input.missedKeys.slice(0, 4)) {
      fixes.push({
        stage: "verify",
        severity: "hazard",
        title: `Answer key missed: ${key.claim}`,
        detail: `Public text did not contain “${key.expected}”.`,
      });
    }
  }
  if (input.scores.act < 60) {
    const loginWall = input.pages.some((p) =>
      p.forms.some((f) => f.fields.some((field) => field.type === "password")),
    );
    fixes.push({
      stage: "act",
      severity: loginWall ? "hazard" : "gap",
      title: loginWall ? "Next step sits behind a login" : "No public next step",
      detail: loginWall
        ? "Agents stop at login. Offer a public contact or demo form with visible fields."
        : "Expose a public demo/contact form. Traverse lists fields and never submits them.",
    });
  }
  return fixes;
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return clamp(Math.round(nums.reduce((a, b) => a + b, 0) / nums.length));
}

export function stageLabel(stage: StageName): string {
  return stage[0].toUpperCase() + stage.slice(1);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
