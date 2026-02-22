# PersonaPost V1 (Convex Edition)

PersonaPost is a Next.js app for generating persona-driven LinkedIn posts with AI text/image generation, coin-based usage, and payment support.

This project has been migrated from Supabase to Convex for data storage and backend logic.

## Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Convex (database + server functions)
- SWR (client data fetching/cache)
- Razorpay (coin purchase)
- OpenRouter (text generation)
- Gemini/DeepAI fallback for image generation
- Cloudinary (image upload + storage)

## Architecture
- `convex/schema.ts`: all data tables/indexes
- `convex/app.ts`: core backend queries/mutations (users, profiles, personas, posts, coins, transactions)
- `lib/convex/client.ts`: server-side Convex HTTP client wrapper
- `lib/auth/password.ts`: password hashing/verification
- `lib/auth/session.ts`: secure cookie session creation/validation
- `app/api/*`: API surface consumed by the frontend
- `hooks/*`: SWR hooks now using API endpoints (not direct DB clients)

## Data Model
Convex tables:
- `users`
- `profiles`
- `personas`
- `posts`
- `transactions`

## Required Environment Variables
Create `.env.local`:

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_ADMIN_KEY=<your-convex-admin-key>

# Session/Auth
SESSION_SECRET=<long-random-secret>

# AI Text
OPENROUTER_API_KEY=<key>

# Payments
RAZORPAY_KEY_ID=<key>
RAZORPAY_KEY_SECRET=<secret>

# App URL (used by OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Optional Environment Variables
```bash
# Image generation (fallback chain)
GEMINI_API_KEY=<key>
DEAPI_API_KEY=<key>

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=<id>
LINKEDIN_CLIENT_SECRET=<secret>

# X OAuth
X_CLIENT_ID=<id>
X_CLIENT_SECRET=<secret>
```

## Local Setup
1. Install deps:
```bash
npm install
```

2. Generate a strong local session secret:
```bash
echo "SESSION_SECRET=$(openssl rand -base64 48)" >> .env.local
```

3. Validate env:
```bash
node check-env.js
```

4. Push Convex schema/functions:
```bash
npx convex dev
```

5. Run app (frontend + Convex together):
```bash
npm run dev
```

6. Open:
```text
http://localhost:3000
```

## API Surface
Auth:
- `POST /api/auth/sign-up`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `DELETE /api/auth/delete-account`

User:
- `GET /api/user`
- `PATCH /api/user`
- `GET /api/user/coins`

Personas:
- `GET /api/personas`
- `POST /api/personas`
- `GET /api/personas/explore`
- `GET|PATCH|DELETE /api/personas/[id]`
- `POST /api/personas/[id]/clone`
- `POST /api/personas/[id]/publish`

Posts:
- `GET /api/posts?page=1`
- `DELETE /api/posts/[id]`
- `POST /api/save-post`

Generation:
- `POST /api/generate-post`
- `POST /api/generate-image`
- `POST /api/sign-media`

Coins/Payments:
- `POST /api/deduct-coins`
- `POST /api/coins/dummy-purchase` (dev-only)
- `POST /api/razorpay/order`
- `POST /api/razorpay/verify`

LinkedIn:
- `POST /api/linkedin/connect`
- `GET /api/linkedin/callback`
- `POST /api/linkedin/disconnect`
- `POST /api/post-to-linkedin`

X:
- `POST /api/x/connect`
- `GET /api/x/callback`
- `POST /api/x/disconnect`
- `POST /api/post-to-x`

## Quality Gates
- Type-check:
```bash
npx tsc --noEmit
```
- Build:
```bash
npm run build
```

## Notes
- Session auth is cookie-based (`pp_session`) and validated server-side.
- In local development, if `SESSION_SECRET` is missing, the app uses a temporary fallback secret and logs a warning.
- For LinkedIn/X OAuth, set callback URLs to:
  - `http://localhost:3000/api/linkedin/callback`
  - `http://localhost:3000/api/x/callback`
- Coin updates are centralized via Convex mutation `app:addCoins`.
- Razorpay verification path includes signature validation and payment-id deduping.
- `next.config.mjs` no longer ignores TypeScript build errors.
