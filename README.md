# PersonaPost (Convex + Next.js)

PersonaPost is an AI-assisted social writing workspace for individuals and teams who want a clean, approval-first workflow for LinkedIn and X.

The app is optimized around one simple loop:
1. Generate drafts in Studio
2. Review/approve in Queue
3. Publish in queue order and monitor in Calendar

---

## Product Direction (Current)

### Core Principles
- Approval-first: nothing is posted without explicit user approval.
- Queue-first publishing: top item in scheduled queue posts first.
- Clarity over complexity: fewer nav items, fewer competing flows.
- Persona-driven writing: every output is grounded in persona style and training examples.

### Simplified Information Architecture
- `/dashboard` -> **Overview** (actionable control room)
- `/dashboard/generate` -> **Studio** (single-post generation)
- `/dashboard/review` -> **Review Queue** (approve/reject/reschedule + weekly batch generation)
- `/dashboard/calendar` -> **Calendar** (month view of scheduled/posted content)
- `/dashboard/personas` -> **Personas**
- `/dashboard/settings` -> **Settings**

Secondary pages like history/coins remain accessible but are no longer primary nav destinations.

---

## Feature Set

### 1) Studio (Single Post)
- Generate one post at a time using selected persona + topic.
- Optional explicit image generation (off by default).
- Save draft or send directly to review queue.

### 2) Review Queue
- Two-column layout:
  - Left: **Pending Review**
  - Right: **Scheduled Queue**
- Approve from pending -> moves into scheduled queue.
- Reject from pending -> blocked from posting.
- Drag-and-drop scheduled posts to reorder priority.
- Reschedule any queued post manually.
- Platform badge shown clearly on each card (`LinkedIn`, `X`, `LinkedIn + X`).

### 3) Schedule Week (Batch Workflow)
- Button in Review Queue: **Schedule Week**.
- Prompts for:
  - Persona (required)
  - Topic (optional)
  - Target platform
- Generates exactly 7 posts and inserts them into **Pending Review**.
- If topic is blank, generation uses persona-relevant trend themes.

### 4) Calendar
- Dedicated dashboard calendar page using `react-day-picker`.
- Large month grid with per-day content markers.
- Selected-day detail panel for scheduled/posted entries.

### 5) Queue Processor
- Background trigger on dashboard load calls `/api/posts/process-queue`.
- Posts only the top scheduled item when due.
- Moves published post to history state and resequences queue.

---

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Convex (data + backend functions)
- SWR (data fetching)
- Grok/Groq-compatible API (`GROK_API_KEY`) using `llama-3.1-8b-instant` (with automatic fallback)
- Gemini (`GEMINI_API_KEY`) for optional image generation
- Cloudinary (media)
- Razorpay (credits)

---

## Environment Variables

Create `.env.local`:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<deployment-name>
CONVEX_ADMIN_KEY=<admin-key>

# App/Auth
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=<long-random-string>

# AI
GROK_API_KEY=<grok-api-key>
GEMINI_API_KEY=<optional-for-image-generation>

# Payments
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>

# Cloudinary (optional unless using generated/uploaded media)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=<id>
LINKEDIN_CLIENT_SECRET=<secret>

# X OAuth
X_CLIENT_ID=<id>
X_CLIENT_SECRET=<secret>
```

---

## Local Setup

```bash
npm install
npm run dev
```

`npm run dev` starts both:
- Next.js frontend
- Convex dev server

If Convex isn’t initialized yet:

```bash
npx convex dev
```

---

## Important APIs

### Generation
- `POST /api/generate-post`
- `POST /api/generate-image`
- `POST /api/posts/review/schedule-week`

### Review + Queue
- `GET /api/posts/review`
- `PATCH /api/posts/[id]/review`
- `POST /api/posts/review/reorder`
- `POST /api/posts/process-queue`

### Posts
- `GET /api/posts`
- `POST /api/save-post`
- `DELETE /api/posts/[id]`

---

## Data Model (Convex)

Primary tables:
- `users`
- `profiles`
- `personas`
- `posts`
- `transactions`

Queue-specific post fields:
- `workflow_status` (`review`, `scheduled`, `posted`, `rejected`, ...)
- `target_platform` (`linkedin`, `x`, `both`)
- `scheduled_for`
- `queue_position`

---

## UX Audit Summary

### Problems identified
- Too many top-level navigation options causing cognitive load.
- Mixed generation/review responsibilities spread across pages.
- Dashboard prioritized charts over actions.
- Platform targeting visibility was easy to miss.

### Changes made
- Simplified nav to core workflow pages.
- Rebuilt dashboard as an action-first control room.
- Added explicit weekly batch generation flow in Review Queue.
- Enforced visible platform badges in review/schedule cards.
- Replaced custom calendar layout with library-backed calendar UI.
- Removed unused analytics hook and API route.

### Remaining opportunities (next iteration)
- Add role-based workspaces for teams.
- Add template packs by domain (founder, recruiter, creator, etc.).
- Add content performance feedback loop (import engagement metrics).

---

## Quality Gates

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Run these before every deploy.
