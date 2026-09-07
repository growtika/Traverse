import * as cheerio from "cheerio";
import { resolveUrl, sameRegistrableHost } from "./domain";
import type { CapturedForm, ExtractedFacts } from "./types";

export type ParsedPage = {
  title: string;
  description: string;
  h1: string;
  headings: string[];
  excerpt: string;
  text: string;
  links: { href: string; text: string }[];
  forms: CapturedForm[];
  loginSignals: string[];
};

const LOGIN_HINTS = [
  "sign in",
  "log in",
  "login",
  "signin",
  "password",
  "sso",
  "authenticate",
];

export function parseHtml(html: string, pageUrl: string): ParsedPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();

  const title = ($("title").first().text() || "").replace(/\s+/g, " ").trim();
  const description = (
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
  const h1 = $("h1")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const headings = $("h1, h2, h3")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 24);

  const text = $("body").text().replace(/\s+/g, " ").trim();
  const excerpt = [h1, description, text].filter(Boolean).join(" ").slice(0, 800);

  const links: { href: string; text: string }[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = resolveUrl($(el).attr("href") || "", pageUrl);
    if (!href || seen.has(href)) return;
    if (!sameRegistrableHost(pageUrl, href)) return;
    seen.add(href);
    const linkText = $(el).text().replace(/\s+/g, " ").trim().slice(0, 160);
    links.push({ href, text: linkText });
  });

  const forms: CapturedForm[] = $("form")
    .toArray()
    .slice(0, 8)
    .map((form) => {
      const $form = $(form);
      const fields = $form
        .find("input, textarea, select")
        .toArray()
        .map((field) => {
          const $field = $(field);
          const name = $field.attr("name") || $field.attr("id") || "";
          const type = ($field.attr("type") || field.tagName || "text").toLowerCase();
          const label =
            ($field.attr("aria-label") ||
              $field.attr("placeholder") ||
              $field.attr("name") ||
              type) ?? "";
          return { name, type, label: String(label).slice(0, 80) };
        })
        .filter((f) => f.type !== "hidden");
      return {
        action: $form.attr("action") || "",
        method: ($form.attr("method") || "get").toLowerCase(),
        fields,
      };
    });

  const lower = `${title} ${text}`.toLowerCase();
  const loginSignals = LOGIN_HINTS.filter((hint) => lower.includes(hint));

  return {
    title,
    description,
    h1,
    headings,
    excerpt,
    text: text.slice(0, 20000),
    links: links.slice(0, 80),
    forms,
    loginSignals,
  };
}

export function extractFacts(pages: ParsedPage[]): ExtractedFacts {
  const identityLine =
    pages[0]?.h1 ||
    pages[0]?.title ||
    pages[0]?.description ||
    "No public identity line captured.";

  const facts = unique(
    pages.flatMap((p) =>
      [p.h1, p.description, ...p.headings]
        .map((s) => s.trim())
        .filter((s) => s.length > 8 && s.length < 180),
    ),
  ).slice(0, 20);

  const prices = unique(
    pages.flatMap((p) => p.text.match(/(?:\$|€|£)\s?\d[\d,.]*(?:\s?\/\s?\w+)?/g) ?? []),
  ).slice(0, 12);

  const contacts = unique(
    pages.flatMap((p) => [
      ...(p.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
      ...(p.text.match(/\+?\d[\d\s().-]{7,}\d/g) ?? []),
    ]),
  ).slice(0, 8);

  const claims = unique(
    pages.flatMap((p) =>
      p.headings.filter((h) => /we|our|trusted|secure|used by|customers/i.test(h)),
    ),
  ).slice(0, 12);

  return { identityLine, facts, prices, contacts, claims };
}

export function scoreTermMatch(haystack: string, terms: string[]): number {
  const hay = haystack.toLowerCase();
  if (!terms.length) return 0;
  let hits = 0;
  let weight = 0;
  for (const term of terms) {
    const t = term.toLowerCase();
    if (!t) continue;
    if (hay.includes(t)) {
      hits += 1;
      weight += Math.min(t.length, 12);
    }
  }
  if (!hits) return 0;
  return Math.min(100, Math.round((hits / terms.length) * 70 + weight));
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
