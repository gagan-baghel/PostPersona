import "server-only"

import { ConvexHttpClient } from "convex/browser"
import { makeFunctionReference } from "convex/server"

function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL)")
  }
  return url
}

// Convex only answers callers holding this project's Vercel OIDC token (convex/auth.config.ts).
// On Vercel it arrives per request in the x-vercel-oidc-token header; locally `vercel env pull`
// writes VERCEL_OIDC_TOKEN to .env.local. Same lookup as @vercel/oidc, without the dependency.
function getVercelOidcToken() {
  const requestContext = (globalThis as any)[Symbol.for("@vercel/request-context")]?.get?.()
  const token = requestContext?.headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN
  if (!token) {
    throw new Error("Missing Vercel OIDC token. Locally, run `vercel env pull .env.local` (tokens last about 12 hours).")
  }
  return token as string
}

function getClient() {
  const client = new ConvexHttpClient(getConvexUrl())
  client.setAuth(getVercelOidcToken())
  return client
}

export async function convexQuery<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  return (await getClient().query(makeFunctionReference<"query">(name), (args ?? {}) as any)) as T
}

export async function convexMutation<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  return (await getClient().mutation(makeFunctionReference<"mutation">(name), (args ?? {}) as any)) as T
}
