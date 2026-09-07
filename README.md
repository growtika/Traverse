# Traverse

Survey how a buyer’s AI agent navigates a company’s **public** website (and rivals). This repo is the real product. The marketing site lives separately in Webflow.

There is **no auth** and **no Stripe**. The app is a single-tenant open workspace.

## What it does

- Crawls user-supplied public domains with real HTTP fetches
- Follows buyer journeys (Identity, Pricing, Security, Product, Proof, Buy, Compare)
- Grades **Know / Find / Extract / Verify / Act**
- Stores HTML evidence frames from those fetches (labeled honestly — not Chromium screenshots)
- Never logs in and never submits forms
- Respects `robots.txt` when that setting is on
- Persists sites, rivals, routes, answer keys, runs, and alerts in SQLite
- Fires in-app alerts from real run-to-run diffs (Slack only if a webhook is configured)

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Sites** — add a public domain (e.g. `example.com`)
2. **Answer keys** — optional; Verify stays `N/A` until keys exist
3. **Settings** — agent label, speed, crossings per route, verify strictness
4. **Survey** — start a real crawl
5. **Runs** — watch progress, then read the map / journal / evidence / fixes

Headless one-shot against a public domain:

```bash
npx tsx scripts/survey-once.ts example.com
```

SQLite lives in `data/traverse.sqlite`. Override with `TRAVERSE_DATA_DIR`.

Optional Slack delivery:

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Or paste a webhook on the Settings page. In-app alerts work without it.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · better-sqlite3 · cheerio · vitest

## Honesty

This is a public-page fetch pipeline, not a paid session recorder and not a logged-in browser agent. Evidence is captured HTML, rendered as frames and labeled as such.
