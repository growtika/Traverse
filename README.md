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
- Persists sites, rivals, routes, answer keys, runs, and alerts in SQLite locally
- On Vercel, uses a warm-instance store plus optional Blob snapshot (see Storage)
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

## Storage

Locally, Traverse uses SQLite in `data/traverse.sqlite`. Override the directory with `TRAVERSE_DATA_DIR`.

On Vercel, filesystem SQLite (`/tmp` or the deploy checkout) does **not** survive across serverless instances. The app therefore:

1. Keeps the workspace in `globalThis.__traverseStore` (an in-memory SQLite database) so warm instances reuse sites and runs.
2. When `BLOB_READ_WRITE_TOKEN` is set, serializes the workspace to a single JSON document in Vercel Blob (`traverse/workspace.json`) on writes and hydrates from it on cold start.
3. Accepts an optional `sites` array on `POST /api/runs` and upserts those records before starting. The Survey page sends the current site list, so a cold instance can still start a survey from the browser payload.

Temporary deploys (`vercel deploy --temporary`) work without extra setup. For multi-instance durability, create a Blob store and pass the token:

```bash
vercel deploy --temporary -e BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN
```

Or attach `BLOB_READ_WRITE_TOKEN` with `vercel env`. Without a token, storage is warm-instance only — add a client site again if a new isolate starts empty. The Survey page re-fetches sites before start and says so if none remain.

Optional Slack delivery:

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Or paste a webhook on the Settings page. In-app alerts work without it.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · better-sqlite3 · Vercel Blob · cheerio · vitest

## Honesty

This is a public-page fetch pipeline, not a paid session recorder and not a logged-in browser agent. Evidence is captured HTML, rendered as frames and labeled as such.
