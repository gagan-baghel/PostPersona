import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [posts, campaigns] = await Promise.all([
      convexQuery<any[]>("app:listPosts", { userId, page: 1, pageSize: 250 }),
      convexQuery<any[]>("app:listCampaigns", { userId }),
    ])

    const all = posts ?? []
    const dead = all.filter((p) => (p.workflow_status ?? "draft") === "dead_letter")
    const posted = all.filter((p) => (p.workflow_status ?? "draft") === "posted")
    const retrying = all.filter((p) => p.delivery_status === "retrying")
    const attempts = all.map((p) => Number(p.publish_attempt_count || 0))
    const avgAttempts = attempts.length ? attempts.reduce((a, b) => a + b, 0) / attempts.length : 0

    const denominator = posted.length + dead.length
    const publishSuccessRate = denominator > 0 ? Number(((posted.length / denominator) * 100).toFixed(2)) : 100
    const deadLetterRate = denominator > 0 ? Number(((dead.length / denominator) * 100).toFixed(2)) : 0

    const now = Date.now()
    const last30 = new Map<string, { created: number; posted: number; deadLetter: number }>()
    for (let i = 29; i >= 0; i--) {
      const date = dayKey(now - i * 24 * 60 * 60 * 1000)
      last30.set(date, { created: 0, posted: 0, deadLetter: 0 })
    }

    for (const post of all) {
      const created = Number(post.created_at || 0)
      const postedAt = Number(post.posted_at || 0)
      const createdKey = dayKey(created)
      if (last30.has(createdKey)) {
        const row = last30.get(createdKey)!
        row.created += 1
        last30.set(createdKey, row)
      }
      if ((post.workflow_status ?? "draft") === "posted" && postedAt > 0) {
        const postedKey = dayKey(postedAt)
        if (last30.has(postedKey)) {
          const row = last30.get(postedKey)!
          row.posted += 1
          last30.set(postedKey, row)
        }
      }
      if ((post.workflow_status ?? "draft") === "dead_letter") {
        const row = last30.get(createdKey)
        if (row) {
          row.deadLetter += 1
          last30.set(createdKey, row)
        }
      }
    }

    const reasonCounts = new Map<string, number>()
    for (const post of dead) {
      const reason = String(post.publish_last_error || "unknown").slice(0, 80)
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
    }

    const topReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    return NextResponse.json({
      summary: {
        totalPosts: all.length,
        campaignCount: (campaigns ?? []).length,
        postedCount: posted.length,
        deadLetterCount: dead.length,
        retryingCount: retrying.length,
        avgAttempts: Number(avgAttempts.toFixed(2)),
        publishSuccessRate,
        deadLetterRate,
      },
      series30d: Array.from(last30.entries()).map(([date, value]) => ({
        date,
        created: value.created,
        posted: value.posted,
        deadLetter: value.deadLetter,
      })),
      topFailureReasons: topReasons,
      campaigns: campaigns ?? [],
    })
  } catch (error) {
    console.error("[Advanced Analytics API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

