const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

export type ParsedDomain = {
  domain: string;
  origin: string;
  startPath: string;
};

export function normalizeDomainInput(raw: string): ParsedDomain {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Enter a public domain, e.g. example.com");
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("That does not look like a valid domain.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only public http(s) sites are allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host)) {
    throw new Error("Local or loopback hosts are out of scope.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    throw new Error("Raw IP addresses are not allowed. Use a public hostname.");
  }
  if (!host.includes(".")) {
    throw new Error("Use a full public hostname with a TLD, e.g. example.com");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Internal hostnames are out of scope.");
  }

  const startPath = url.pathname && url.pathname !== "/" ? url.pathname : "/";
  return {
    domain: host,
    origin: `https://${host}`,
    startPath,
  };
}

export function siteOrigin(domain: string, startPath = "/"): string {
  const path = startPath.startsWith("/") ? startPath : `/${startPath}`;
  return `https://${domain}${path === "/" ? "/" : path}`;
}

export function sameRegistrableHost(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "");
    const hb = new URL(b, a).hostname.replace(/^www\./, "");
    return ha === hb;
  } catch {
    return false;
  }
}

export function resolveUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function faviconCandidates(domain: string): string[] {
  return [
    `https://${domain}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
  ];
}
