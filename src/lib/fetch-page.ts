import { emptyRobots, isPathAllowed, parseRobotsTxt, type RobotsRules } from "./robots";

export type FetchResult = {
  ok: boolean;
  status: number | null;
  url: string;
  finalUrl: string | null;
  contentType: string;
  html: string | null;
  error: string | null;
  robotsAllowed: boolean;
  partial: boolean;
  label: string;
};

const HTML_LIMIT = 80_000;
const DEFAULT_TIMEOUT_MS = 12_000;

export function userAgentFor(label: string): string {
  const safe = label.replace(/[^\w.-]+/g, "-").slice(0, 40) || "traverse-public-1";
  return `Traverse/${safe} (+public-page survey; no-login; no-form-submit)`;
}

export async function fetchRobots(origin: string, userAgent: string): Promise<RobotsRules> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": userAgent, accept: "text/plain,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return emptyRobots(true);
    const body = await res.text();
    return parseRobotsTxt(body, userAgent);
  } catch {
    return emptyRobots(false);
  }
}

export async function fetchPublicPage(input: {
  url: string;
  userAgent: string;
  robots: RobotsRules | null;
  respectRobots: boolean;
}): Promise<FetchResult> {
  const url = input.url;
  let pathname = "/";
  try {
    pathname = new URL(url).pathname;
  } catch {
    return fail(url, "Invalid URL");
  }

  if (input.respectRobots && input.robots && !isPathAllowed(pathname, input.robots)) {
    return {
      ok: false,
      status: null,
      url,
      finalUrl: null,
      contentType: "",
      html: null,
      error: "Blocked by robots.txt — not fetched.",
      robotsAllowed: false,
      partial: true,
      label: "Skipped — robots.txt disallow (honest skip, not a screenshot)",
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": input.userAgent,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const contentType = res.headers.get("content-type") || "";
    const finalUrl = res.url || url;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        url,
        finalUrl,
        contentType,
        html: null,
        error: `HTTP ${res.status}`,
        robotsAllowed: true,
        partial: true,
        label: `Fetch failed — HTTP ${res.status} (no page body stored)`,
      };
    }
    if (!contentType.includes("html") && !contentType.includes("xml") && contentType.length > 0) {
      return {
        ok: false,
        status: res.status,
        url,
        finalUrl,
        contentType,
        html: null,
        error: `Not HTML (${contentType})`,
        robotsAllowed: true,
        partial: true,
        label: "Skipped — non-HTML response",
      };
    }
    const raw = await res.text();
    const html = raw.slice(0, HTML_LIMIT);
    const truncated = raw.length > HTML_LIMIT;
    return {
      ok: true,
      status: res.status,
      url,
      finalUrl,
      contentType,
      html,
      error: null,
      robotsAllowed: true,
      partial: truncated,
      label: truncated
        ? "HTML evidence frame — truncated capture, not a Chromium screenshot"
        : "HTML evidence frame — real public fetch, not a Chromium screenshot",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return fail(url, message);
  }
}

function fail(url: string, message: string): FetchResult {
  return {
    ok: false,
    status: null,
    url,
    finalUrl: null,
    contentType: "",
    html: null,
    error: message,
    robotsAllowed: true,
    partial: true,
    label: `Fetch failed — ${message}`,
  };
}
