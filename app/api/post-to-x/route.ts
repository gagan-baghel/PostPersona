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

    if (!profile?.x_connected || !profile?.x_access_token) {
      return NextResponse.json({ error: "X account not connected" }, { status: 400 })
    }

    const maxLen = 280
    const tweetText = content.length > maxLen ? `${content.slice(0, maxLen - 1)}…` : content

    const tweetResponse = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.x_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    })

    if (!tweetResponse.ok) {
      const detail = await tweetResponse.text()
      return NextResponse.json({ error: "X publish failed", details: detail.slice(0, 300) }, { status: tweetResponse.status })
    }

    const tweetData = await tweetResponse.json()
    const xPostId = tweetData?.data?.id || `x_${Date.now()}`

    const post = await convexMutation<any>("app:createPost", {
      userId,
      personaId,
      topic,
      content,
      imageUrl: imageUrl || undefined,
      imagePrompt: imagePrompt || undefined,
      imagePreset: imagePreset || undefined,
      postedToX: true,
      xPostId,
    })

    if (!post?.ok) {
      return NextResponse.json({ error: "Failed to save post" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      postId: post.postId,
      xPostId,
      message: "Posted to X successfully",
    })
  } catch (error) {
    console.error("[Post to X] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
