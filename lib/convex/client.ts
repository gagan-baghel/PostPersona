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

let warnedMissingKey = false

function warnMissingKey() {
  if (warnedMissingKey) return
  warnedMissingKey = true
  console.error(
    "[convex] CONVEX_ADMIN_KEY is not set. Convex functions are internal, so calls will fail once they are deployed. " +
      "Create a deploy key in the Convex dashboard (Settings > Deploy keys) and add it to your environment.",
  )
}

// With the admin key we use the path `npx convex run` uses (/api/function), which can reach internal
// functions. Without it we fall back to the public endpoints, which only work until internal functions deploy.
// ponytail: `function` is typed @internal in convex/browser; recheck on Convex upgrades.
async function callConvex<T>(kind: "query" | "mutation", name: string, args?: Record<string, unknown>): Promise<T> {
  const client = new ConvexHttpClient(getConvexUrl()) as any
  const adminKey = process.env.CONVEX_ADMIN_KEY
  if (adminKey) {
    client.setAdminAuth(adminKey)
    return (await client.function(makeFunctionReference(name), undefined, args ?? {})) as T
  }
  warnMissingKey()
  return (await client[kind](makeFunctionReference(name), args ?? {})) as T
}

export async function convexQuery<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  return callConvex<T>("query", name, args)
}

export async function convexMutation<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  return callConvex<T>("mutation", name, args)
}
