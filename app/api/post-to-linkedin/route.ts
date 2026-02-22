import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

export async function POST(request: Request) {
  try {
    const { personaId, topic, content, imageUrl, imagePrompt, imagePreset } = await request.json()

    if (!personaId || !topic || !content) {
      return NextResponse.json(
        { error: "Missing required fields: personaId, topic, and content are required" },
        { status: 400 },
      )
    }

    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [persona, profile] = await Promise.all([
      convexQuery<any>("app:getPersonaById", { personaId, userId }),
      convexQuery<any>("app:getProfile", { userId }),
    ])

    if (!persona) {
      return NextResponse.json({ error: "Persona not found or access denied" }, { status: 403 })
    }

    if (!profile?.linkedin_connected || !profile?.linkedin_access_token || !profile?.linkedin_profile_id) {
      return NextResponse.json({ error: "LinkedIn account not connected" }, { status: 400 })
    }

    const author = `urn:li:person:${profile.linkedin_profile_id}`
    const shareResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
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
            shareCommentary: {
              text: content,
            },
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

    if (!shareResponse.ok) {
      const detail = await shareResponse.text()
      return NextResponse.json(
        { error: "LinkedIn publish failed", details: detail.slice(0, 300) },
        { status: shareResponse.status },
      )
    }

    const linkedinPostId = shareResponse.headers.get("x-restli-id") || `li_${Date.now()}`

    const post = await convexMutation<any>("app:createPost", {
      userId,
      personaId,
      topic,
      content,
      imageUrl: imageUrl || undefined,
      imagePrompt: imagePrompt || undefined,
      imagePreset: imagePreset || undefined,
      postedToLinkedin: true,
      linkedinPostId,
    })

    if (!post?.ok) {
      return NextResponse.json({ error: "Failed to save post" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      postId: post.postId,
      linkedinPostId,
      message: "Posted to LinkedIn successfully",
    })
  } catch (error) {
    console.error("[Post to LinkedIn] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
