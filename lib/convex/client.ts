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

function getClient() {
  const client = new ConvexHttpClient(getConvexUrl())
  const adminKey = process.env.CONVEX_ADMIN_KEY
  if (adminKey && typeof (client as any).setAdminAuth === "function") {
    ;(client as any).setAdminAuth(adminKey)
  }
  return client
}

export async function convexQuery<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  const client = getClient()
  return (await client.query(makeFunctionReference<"query">(name), (args ?? {}) as any)) as T
}

export async function convexMutation<T = any>(name: string, args?: Record<string, unknown>): Promise<T> {
  const client = getClient()
  return (await client.mutation(makeFunctionReference<"mutation">(name), (args ?? {}) as any)) as T
}
