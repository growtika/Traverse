export type RobotsRules = {
  fetched: boolean;
  allowAll: boolean;
  disallows: string[];
  source: string | null;
};

export function parseRobotsTxt(body: string, userAgent: string): RobotsRules {
  const lines = body.split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim());
  const groups: { agents: string[]; disallows: string[]; allows: string[] }[] = [];
  let current: { agents: string[]; disallows: string[]; allows: string[] } | null =
    null;

  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || current.disallows.length + current.allows.length > 0) {
        current = { agents: [value.toLowerCase()], disallows: [], allows: [] };
        groups.push(current);
      } else {
        current.agents.push(value.toLowerCase());
      }
    } else if (key === "disallow" && current) {
      current.disallows.push(value);
    } else if (key === "allow" && current) {
      current.allows.push(value);
    }
  }

  const ua = userAgent.toLowerCase();
  const matching =
    groups.find((g) => g.agents.some((a) => a !== "*" && ua.includes(a))) ??
    groups.find((g) => g.agents.includes("*"));

  if (!matching) {
    return { fetched: true, allowAll: true, disallows: [], source: body.slice(0, 2000) };
  }

  const disallows = matching.disallows.filter((d) => d && d !== "/");
  const blockedAll = matching.disallows.includes("/");
  return {
    fetched: true,
    allowAll: !blockedAll && disallows.length === 0,
    disallows: blockedAll ? ["/"] : disallows,
    source: body.slice(0, 2000),
  };
}

export function isPathAllowed(pathname: string, rules: RobotsRules | null): boolean {
  if (!rules || rules.allowAll) return true;
  if (rules.disallows.includes("/")) return false;
  return !rules.disallows.some((rule) => {
    if (!rule) return false;
    return pathname.startsWith(rule);
  });
}

export function emptyRobots(fetched: boolean): RobotsRules {
  return { fetched, allowAll: true, disallows: [], source: null };
}
