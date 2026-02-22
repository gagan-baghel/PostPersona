import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { X_POST_CHAR_LIMIT, countXCharacters } from "@/lib/social/platform-limits"

async function postToLinkedIn(profile: any, content: string, imageUrl?: string | null) {
  if (!profile?.linkedin_connected || !profile?.linkedin_access_token || !profile?.linkedin_profile_id) {
    return { ok: false as const, reason: "linkedin_not_connected" }
  }

  const author = `urn:li:person:${profile.linkedin_profile_id}`
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.linkedin_access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
          media: imageUrl
            ? [
                {
                  status: "READY",
                  originalUrl: imageUrl,
                },
              ]
            : undefined,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  })

  if (!response.ok) return { ok: false as const, reason: "linkedin_failed" }
  return { ok: true as const, postId: response.headers.get("x-restli-id") || `li_${Date.now()}` }
}

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

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [profile, scheduled] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any[]>("app:listPostsByStatus", { userId, statuses: ["scheduled"] }),
    ])

    const now = Date.now()
    const nextInQueue = (scheduled ?? []).sort((a, b) => {
      const aq = typeof a.queue_position === "number" ? a.queue_position : Number.MAX_SAFE_INTEGER
      const bq = typeof b.queue_position === "number" ? b.queue_position : Number.MAX_SAFE_INTEGER
      if (aq !== bq) return aq - bq
      return (a.scheduled_for ?? 0) - (b.scheduled_for ?? 0)
    })[0]

    if (!nextInQueue) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    if (typeof nextInQueue.scheduled_for === "number" && nextInQueue.scheduled_for > now) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    const next = nextInQueue
    const target = next.target_platform || "linkedin"
    let linkedinPostId: string | undefined
    let xPostId: string | undefined
    let postedLinkedin = false
    let postedX = false

    if (target === "linkedin" || target === "both") {
      const li = await postToLinkedIn(profile, next.content, next.image_url)
      if (!li.ok && target === "linkedin") {
        return NextResponse.json({ success: false, error: li.reason }, { status: 400 })
      }
      if (li.ok) {
        postedLinkedin = true
        linkedinPostId = li.postId
      }
    }

    if (target === "x" || target === "both") {
      const x = await postToX(profile, next.content)
      if (!x.ok && target === "x") {
        return NextResponse.json({ success: false, error: x.reason }, { status: 400 })
      }
      if (x.ok) {
        postedX = true
        xPostId = x.postId
      }
    }

    if (!postedLinkedin && !postedX) {
      return NextResponse.json({ success: false, error: "no_connected_targets" }, { status: 400 })
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
      return NextResponse.json({ success: false, error: "failed_to_mark_published" }, { status: 500 })
    }

    return NextResponse.json({ success: true, processed: 1, postId: next._id })
  } catch (error) {
    console.error("[Process Queue] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
