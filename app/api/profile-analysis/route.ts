import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexQuery } from "@/lib/convex/client"
import { ensureLinkedInAccessToken } from "@/lib/social/linkedin-token"

type LinkedInMetric = {
  likes: number
  comments: number
  reposts: number
  impressions: number
  isEstimatedImpressions: boolean
}

type AnalysisPost = {
  id: string
  topic: string
  content: string
  publishedAt: number
  likes: number
  comments: number
  reposts: number
  impressions: number
  isEstimatedImpressions: boolean
  engagementScore: number
  engagementRate: number
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeLinkedInUrn(id: string) {
  if (id.startsWith("urn:li:")) return id
  if (/^\d+$/.test(id)) return `urn:li:share:${id}`
  return id
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function estimateImpressions(likes: number, comments: number, reposts: number) {
  return Math.max(1, likes * 28 + comments * 45 + reposts * 60)
}

async function fetchLinkedInSocialActions(accessToken: string, rawPostId?: string | null): Promise<LinkedInMetric | null> {
  if (!rawPostId) return null

  const urn = normalizeLinkedInUrn(rawPostId)
  const url = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(urn)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    cache: "no-store",
  })

  if (!response.ok) return null
  const data = await response.json().catch(() => ({}))

  const likes =
    safeNumber(data?.likesSummary?.totalLikes) ||
    safeNumber(data?.likesSummary?.count) ||
    safeNumber(data?.numLikes)
  const comments =
    safeNumber(data?.commentsSummary?.totalFirstLevelComments) ||
    safeNumber(data?.commentsSummary?.count) ||
    safeNumber(data?.numComments)
  const reposts =
    safeNumber(data?.repostsSummary?.count) ||
    safeNumber(data?.resharesSummary?.count) ||
    safeNumber(data?.numShares)
  const impressions =
    safeNumber(data?.impressionSummary?.impressionCount) ||
    safeNumber(data?.impressionsSummary?.impressionCount) ||
    safeNumber(data?.totalShareStatistics?.impressionCount)

  if (impressions > 0) {
    return {
      likes,
      comments,
      reposts,
      impressions,
      isEstimatedImpressions: false,
    }
  }

  return {
    likes,
    comments,
    reposts,
    impressions: estimateImpressions(likes, comments, reposts),
    isEstimatedImpressions: true,
  }
}

function textContainsHashtag(text: string) {
  return /#[\p{L}\p{N}_]+/u.test(text)
}

function buildInsights(posts: AnalysisPost[]) {
  if (!posts.length) return ["No LinkedIn posts found to analyze yet."]

  const avgLength = Math.round(posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length)
  const hashtagRate = Math.round((posts.filter((p) => textContainsHashtag(p.content)).length / posts.length) * 100)

  const byWeekday = new Map<number, { total: number; count: number }>()
  const byHour = new Map<number, { total: number; count: number }>()
  for (const post of posts) {
    const d = new Date(post.publishedAt)
    const weekday = d.getDay()
    const hour = d.getHours()
    const entryDay = byWeekday.get(weekday) ?? { total: 0, count: 0 }
    entryDay.total += post.engagementScore
    entryDay.count += 1
    byWeekday.set(weekday, entryDay)

    const entryHour = byHour.get(hour) ?? { total: 0, count: 0 }
    entryHour.total += post.engagementScore
    entryHour.count += 1
    byHour.set(hour, entryHour)
  }

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const bestDay = [...byWeekday.entries()]
    .map(([day, value]) => ({ day, avg: value.total / Math.max(value.count, 1) }))
    .sort((a, b) => b.avg - a.avg)[0]
  const bestHour = [...byHour.entries()]
    .map(([hour, value]) => ({ hour, avg: value.total / Math.max(value.count, 1) }))
    .sort((a, b) => b.avg - a.avg)[0]

  const bestPost = [...posts].sort((a, b) => b.engagementScore - a.engagementScore)[0]

  const insights: string[] = []
  insights.push(
    `Best performing post scored ${bestPost.engagementScore.toFixed(1)} engagement points with ${bestPost.likes} likes and ${bestPost.comments} comments.`,
  )
  if (bestDay) insights.push(`Best weekday so far: ${weekdayNames[bestDay.day]} (highest average engagement).`)
  if (bestHour) insights.push(`Best posting hour so far: ${String(bestHour.hour).padStart(2, "0")}:00.`)
  insights.push(`Average post length is ${avgLength} characters.`)
  insights.push(`Hashtag usage appears in ${hashtagRate}% of analyzed posts.`)

  return insights
}

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const query = (url.searchParams.get("q") || "").trim()

    const [user, profile, rawPosts] = await Promise.all([
      convexQuery<any>("app:getUserById", { userId }),
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any[]>("app:listPosts", { userId, page: 1, pageSize: 250 }),
    ])

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (!profile?.linkedin_connected || !profile?.linkedin_access_token) {
      return NextResponse.json(
        { error: "LinkedIn account not connected. Connect LinkedIn in Settings first." },
        { status: 400 },
      )
    }

    const token = await ensureLinkedInAccessToken(userId, profile)
    if (!token.ok || !token.accessToken) {
      return NextResponse.json(
        { error: token.warning || "LinkedIn token unavailable. Reconnect LinkedIn." },
        { status: 400 },
      )
    }
    const accessToken = token.accessToken

    let linkedInName = user.full_name || user.email || "Connected profile"
    let linkedInAvatar: string | null = null
    let linkedInHeadline = "LinkedIn member"
    let linkedInId: string | null = profile.linkedin_profile_id ?? null

    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    if (userInfoRes.ok) {
      const info = await userInfoRes.json().catch(() => ({}))
      const name = [info?.given_name, info?.family_name].filter(Boolean).join(" ").trim()
      linkedInName = name || info?.name || linkedInName
      linkedInAvatar = typeof info?.picture === "string" ? info.picture : null
      linkedInId = typeof info?.sub === "string" ? info.sub : linkedInId
      linkedInHeadline = typeof info?.locale === "string" ? `Locale: ${info.locale}` : linkedInHeadline
    }

    let queryWarning: string | null = null
    if (query) {
      const q = query.toLowerCase()
      const selfTokens = [
        "me",
        linkedInName.toLowerCase(),
        String(user.email || "").toLowerCase(),
        String(linkedInId || "").toLowerCase(),
      ].filter(Boolean)

      const isSelfQuery = selfTokens.some((token) => token && q.includes(token))
      if (!isSelfQuery) {
        queryWarning =
          "LinkedIn API permissions in this app currently support deep analytics for your connected account. Showing your connected profile analysis."
      }
    }

    const posts = (rawPosts ?? [])
      .filter((post) => {
        const isLinkedInTarget = post.target_platform === "linkedin"
        return Boolean(post.posted_to_linkedin) || (isLinkedInTarget && (post.workflow_status ?? "draft") === "posted")
      })
      .map((post) => ({
        id: String(post.id ?? post._id ?? ""),
        topic: String(post.topic || ""),
        content: String(post.content || ""),
        publishedAt: toTimestamp(post.posted_at) ?? toTimestamp(post.created_at) ?? Date.now(),
        linkedinPostId: (post.linkedin_post_id as string | null | undefined) ?? null,
      }))
      .sort((a, b) => b.publishedAt - a.publishedAt)

    const metricLimited = posts.slice(0, 40)
    const metricResults = await Promise.all(
      metricLimited.map(async (post) => {
        const live = await fetchLinkedInSocialActions(accessToken, post.linkedinPostId).catch(() => null)
        if (live) return { postId: post.id, metric: live }
        return {
          postId: post.id,
          metric: {
            likes: 0,
            comments: 0,
            reposts: 0,
            impressions: 1,
            isEstimatedImpressions: true,
          } satisfies LinkedInMetric,
        }
      }),
    )

    const metricMap = new Map(metricResults.map((entry) => [entry.postId, entry.metric]))
    const enriched: AnalysisPost[] = posts.map((post) => {
      const metric = metricMap.get(post.id) ?? {
        likes: 0,
        comments: 0,
        reposts: 0,
        impressions: 1,
        isEstimatedImpressions: true,
      }
      const engagementScore = metric.likes + metric.comments * 2 + metric.reposts * 2.5
      const engagementRate = (engagementScore / Math.max(metric.impressions, 1)) * 100

      return {
        id: post.id,
        topic: post.topic,
        content: post.content,
        publishedAt: post.publishedAt,
        likes: metric.likes,
        comments: metric.comments,
        reposts: metric.reposts,
        impressions: metric.impressions,
        isEstimatedImpressions: metric.isEstimatedImpressions,
        engagementScore: Number(engagementScore.toFixed(2)),
        engagementRate: Number(engagementRate.toFixed(2)),
      }
    })

    const totalLikes = enriched.reduce((sum, p) => sum + p.likes, 0)
    const totalComments = enriched.reduce((sum, p) => sum + p.comments, 0)
    const totalReposts = enriched.reduce((sum, p) => sum + p.reposts, 0)
    const totalImpressions = enriched.reduce((sum, p) => sum + p.impressions, 0)
    const avgEngagementRate =
      enriched.length > 0
        ? Number((enriched.reduce((sum, p) => sum + p.engagementRate, 0) / enriched.length).toFixed(2))
        : 0

    const topPosts = [...enriched].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 8)
    const recentPosts = [...enriched].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 12)

    const trend = [...enriched]
      .sort((a, b) => a.publishedAt - b.publishedAt)
      .map((p, index) => ({
        index: index + 1,
        timestamp: p.publishedAt,
        dateLabel: new Date(p.publishedAt).toLocaleDateString(),
        engagementScore: p.engagementScore,
        likes: p.likes,
        comments: p.comments,
      }))

    const scatter = enriched.map((p) => ({
      x: p.publishedAt,
      y: p.engagementScore,
      id: p.id,
      topic: p.topic,
      content: p.content,
      likes: p.likes,
      comments: p.comments,
      reposts: p.reposts,
      impressions: p.impressions,
      engagementRate: p.engagementRate,
      dateLabel: new Date(p.publishedAt).toLocaleString(),
    }))

    const insights = buildInsights(enriched)

    return NextResponse.json({
      success: true,
      warning: queryWarning,
      query: query || "me",
      profile: {
        name: linkedInName,
        headline: linkedInHeadline,
        avatarUrl: linkedInAvatar,
        linkedInId,
      },
      summary: {
        totalPosts: enriched.length,
        totalLikes,
        totalComments,
        totalReposts,
        totalImpressions,
        avgEngagementRate,
      },
      posts: {
        top: topPosts,
        recent: recentPosts,
      },
      charts: {
        trend,
        scatter,
      },
      insights,
    })
  } catch (error) {
    console.error("[Profile Analysis API] Error:", error)
    return NextResponse.json({ error: "Failed to analyze profile" }, { status: 500 })
  }
}
