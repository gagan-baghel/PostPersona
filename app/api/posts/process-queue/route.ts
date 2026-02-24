import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { LinkedInPublishError, publishToLinkedIn } from "@/lib/social/linkedin-publish"
import { ensureLinkedInAccessToken } from "@/lib/social/linkedin-token"
import { X_POST_CHAR_LIMIT, countXCharacters } from "@/lib/social/platform-limits"

async function postToX(profile: any, content: string) {
  if (!profile?.x_connected || !profile?.x_access_token) {
    return { ok: false as const, reason: "x_not_connected" }
  }

  const tweetText =
    countXCharacters(content) > X_POST_CHAR_LIMIT
      ? `${Array.from(content).slice(0, X_POST_CHAR_LIMIT - 1).join("")}…`
      : content
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.x_access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: tweetText }),
  })

  if (!response.ok) return { ok: false as const, reason: "x_failed" }
  const data = await response.json()
  return { ok: true as const, postId: data?.data?.id || `x_${Date.now()}` }
}

function sortQueue(posts: any[]) {
  return [...posts].sort((a, b) => {
    const aq = typeof a.queue_position === "number" ? a.queue_position : Number.MAX_SAFE_INTEGER
    const bq = typeof b.queue_position === "number" ? b.queue_position : Number.MAX_SAFE_INTEGER
    if (aq !== bq) return aq - bq
    return (a.scheduled_for ?? 0) - (b.scheduled_for ?? 0)
  })
}

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [profile, scheduled] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any[]>("app:listPostsByStatus", { userId, statuses: ["scheduled"] }),
    ])

    if (!profile?.auto_post_enabled) {
      return NextResponse.json({ success: true, processed: 0, reason: "auto_post_disabled" })
    }

    const now = Date.now()
    const next = sortQueue(scheduled ?? []).find((post) => {
      const dueTime = typeof post.scheduled_for === "number" ? post.scheduled_for <= now : true
      const retryDue = typeof post.publish_next_retry_at === "number" ? post.publish_next_retry_at <= now : true
      return dueTime && retryDue
    })

    if (!next) {
      return NextResponse.json({ success: true, processed: 0, reason: "no_due_posts" })
    }

    const lock = await convexMutation<any>("app:acquirePostPublishLock", {
      userId,
      postId: next._id,
      lockMs: 120000,
      idempotencyKey: `pub_${String(next._id)}_${now}`,
    })
    if (!lock?.ok) {
      return NextResponse.json({ success: true, processed: 0, reason: lock?.error || "lock_failed" })
    }

    const target = next.target_platform || "linkedin"
    let linkedinPostId: string | undefined
    let xPostId: string | undefined
    let postedLinkedin = false
    let postedX = false

    try {
      if (target === "linkedin" || target === "both") {
        const token = await ensureLinkedInAccessToken(userId, profile)
        if (!token.ok || !token.accessToken || !profile?.linkedin_profile_id) {
          throw new Error(token.warning || "linkedin_not_connected")
        }

        const li = await publishToLinkedIn({
          accessToken: token.accessToken,
          profileId: profile.linkedin_profile_id,
          content: next.content,
          imageUrl: next.image_url,
        })
        postedLinkedin = true
        linkedinPostId = li.postId
      }

      if (target === "x" || target === "both") {
        const x = await postToX(profile, next.content)
        if (!x.ok && target === "x") {
          throw new Error(x.reason)
        }
        if (x.ok) {
          postedX = true
          xPostId = x.postId
        }
      }

      if (!postedLinkedin && !postedX) {
        throw new Error("no_connected_targets")
      }

      const result = await convexMutation<any>("app:markScheduledPostPublished", {
        userId,
        postId: next._id,
        linkedinPostId,
        xPostId,
        postedLinkedin,
        postedX,
      })

      if (!result?.ok) {
        throw new Error("failed_to_mark_published")
      }

      return NextResponse.json({ success: true, processed: 1, postId: next._id })
    } catch (error) {
      const message =
        error instanceof LinkedInPublishError
          ? `${error.message}${error.details ? `: ${error.details}` : ""}`
          : error instanceof Error
            ? error.message
            : "publish_failed"

      const failure = await convexMutation<any>("app:markPostPublishFailure", {
        userId,
        postId: next._id,
        errorMessage: message,
        maxAttempts: 6,
        baseDelaySeconds: 90,
      })

      return NextResponse.json({
        success: false,
        processed: 0,
        failedPostId: next._id,
        reason: "publish_failed",
        deadLetter: Boolean(failure?.deadLetter),
        nextRetryAt: failure?.nextRetryAt ?? null,
      })
    }
  } catch (error) {
    console.error("[Process Queue] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

