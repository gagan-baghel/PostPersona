// Single source for credit prices: used by checkout, the API routes, and the marketing pages.
// No server-only imports here: convex/app.ts and client components import this too.

export const SIGNUP_COINS = 100

export const CREDIT_COSTS = {
  post: 3,
  image: 5,
  week: 21,
  tool: 1,
} as const

export const COIN_PACKAGES = [
  { id: "starter", coins: 50, price: 199, name: "Starter Pack", badge: null },
  { id: "pro", coins: 150, price: 499, name: "Pro Pack", badge: "Best Value" },
  { id: "agency", coins: 500, price: 1499, name: "Agency Pack", badge: "Popular" },
] as const
