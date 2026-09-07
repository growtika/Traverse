import type { Route, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  agentLabel: "traverse-public-1",
  speed: "measured",
  crossingsPerRoute: 1,
  verifyStrictness: "normal",
  maxPagesPerCrossing: 6,
  respectRobots: true,
  includeRivals: true,
  slackWebhookUrl: "",
};

export const SPEED_DELAY_MS: Record<Settings["speed"], number> = {
  careful: 800,
  measured: 250,
  fast: 50,
};

export const DEFAULT_ROUTES: Omit<Route, "id">[] = [
  {
    name: "Identity",
    slug: "identity",
    intent: "Can a buyer agent say what this company does from public pages?",
    queryTerms: ["about", "company", "mission", "who we are", "our story"],
    pathHints: ["/about", "/company", "/about-us"],
    enabled: true,
    sortOrder: 10,
  },
  {
    name: "Pricing",
    slug: "pricing",
    intent: "Can the agent find public price, plan, or cost language?",
    queryTerms: ["pricing", "plans", "price", "cost", "subscription"],
    pathHints: ["/pricing", "/plans", "/price"],
    enabled: true,
    sortOrder: 20,
  },
  {
    name: "Security",
    slug: "security",
    intent: "Can the agent find security, privacy, or compliance facts?",
    queryTerms: ["security", "compliance", "privacy", "soc 2", "gdpr", "trust"],
    pathHints: ["/security", "/trust", "/privacy", "/compliance"],
    enabled: true,
    sortOrder: 30,
  },
  {
    name: "Product",
    slug: "product",
    intent: "Can the agent find what the product does and how it works?",
    queryTerms: ["product", "platform", "features", "how it works", "solution"],
    pathHints: ["/product", "/platform", "/features", "/solutions"],
    enabled: true,
    sortOrder: 40,
  },
  {
    name: "Proof",
    slug: "proof",
    intent: "Can the agent find customers, case studies, or other proof?",
    queryTerms: ["customers", "case study", "testimonials", "stories", "logo"],
    pathHints: ["/customers", "/case-studies", "/stories", "/customers"],
    enabled: true,
    sortOrder: 50,
  },
  {
    name: "Buy",
    slug: "buy",
    intent: "Can the agent reach a public demo, contact, or start path — without submitting?",
    queryTerms: ["demo", "contact", "get started", "talk to", "trial", "book"],
    pathHints: ["/demo", "/contact", "/get-started", "/talk-to-sales"],
    enabled: true,
    sortOrder: 60,
  },
  {
    name: "Compare",
    slug: "compare",
    intent: "Can the agent find comparison, alternative, or vs language?",
    queryTerms: ["compare", "vs", "alternative", "competitor", "why us"],
    pathHints: ["/compare", "/vs", "/alternatives"],
    enabled: true,
    sortOrder: 70,
  },
];

export const PASS_THRESHOLD = 60;
