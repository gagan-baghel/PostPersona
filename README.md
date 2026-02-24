# PersonaPost (Next.js + Convex)

PersonaPost is a LinkedIn/X content automation workspace with approval-first publishing, queue orchestration, campaign planning, and reliability controls.

## What It Does

- Studio: generate one post with persona guidance and optional image generation.
- Review Queue: approve/reject drafts, drag-reorder scheduled queue, reschedule, and delete.
- Week Scheduler: generate 7 drafts into pending review (never auto-approved).
- Calendar: shows only `scheduled` and `posted` items.
- Auto Publisher: posts top scheduled item first (queue order), with retry/backoff and dead-letter protection.
- Campaigns: define goal/audience/pillars/cadence and generate weekly campaign content.
- Profile Analysis: connected-account LinkedIn post analytics with trend + scatter charts.
- Advanced Analytics: delivery reliability and throughput metrics.

## Core Rules Enforced

- No post is published unless approved by user.
- Pending review items are excluded from calendar.
- Scheduled queue determines publish priority.
- If required channels are disconnected, scheduling/publishing UI warns and blocks invalid actions.
- Single-post Studio flow schedules directly (does not return to review).

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Convex (data + backend functions)
- SWR
- Groq-compatible API via `GROK_API_KEY` (default model `llama-3.3-70b`)
- Optional Gemini image generation
- LinkedIn + X OAuth
- Cloudinary (media)
- Razorpay (coins)

## Local Setup

1. Install deps:

```bash
npm install
```

2. Initialize Convex (first time only):

```bash
npx convex dev
```

3. Run app + Convex together:

```bash
npm run dev
```

## Environment

Create `.env.local` from `.env.example`.

### Required for auth in production

- `SESSION_SECRET` must be set in production.
- Missing `SESSION_SECRET` in production will break login/signup session creation.

### Convex

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`
- `CONVEX_ADMIN_KEY` (server-side admin calls)

### AI

- `GROK_API_KEY` (required for post generation)
- `GROK_MODEL` (optional override, defaults to `llama-3.3-70b`)
- `GEMINI_API_KEY` (optional image generation)
- `DEAPI_API_KEY` (optional image generation provider)

### Social OAuth

- LinkedIn: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- Optional refresh-token scope request: `LINKEDIN_REQUEST_OFFLINE_ACCESS=true`
- X: `X_CLIENT_ID`, `X_CLIENT_SECRET`

### Optional integrations

- Razorpay keys
- Cloudinary keys

## Reliability Features

- Publish lock (`publish_lock_until`) to avoid duplicate concurrent posting.
- Idempotency key tracking per publish attempt.
- Exponential retry/backoff via `publish_next_retry_at`.
- Dead-letter transition after max attempts.
- Replay dead-letter items back to scheduled queue.

## Campaign Features

- Campaign table with `goal`, `audience`, `pillars`, `cadence_per_week`, `kpi_target`.
- Weekly campaign generator inserts 7 posts into review queue and links `campaign_id`.
- Campaign-level status counters (review/scheduled/posted/dead-letter).

## Production Checklist

Before deploy:

```bash
npm run lint
npm run build
```

Production env must include at minimum:

- `SESSION_SECRET`
- Convex deployment + URL vars
- `CONVEX_ADMIN_KEY`
- `GROK_API_KEY`
- OAuth keys for channels you want to connect

## Notes

- LinkedIn profile analysis endpoint currently provides deep analytics for the connected account.
- LinkedIn impression data can be estimated if API does not return impression counters for a post.
