import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { LinkedInPublishError, publishToLinkedIn } from "@/lib/social/linkedin-publish"
import { ensureLinkedInAccessToken } from "@/lib/social/linkedin-token"

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

    const token = await ensureLinkedInAccessToken(userId, profile)
    if (!token.ok || !token.accessToken) {
      return NextResponse.json(
        { error: token.warning || "LinkedIn token is unavailable. Reconnect LinkedIn." },
        { status: 400 },
      )
    }

    const linkedin = await publishToLinkedIn({
      accessToken: token.accessToken,
      profileId: profile.linkedin_profile_id,
      content,
      imageUrl: imageUrl || undefined,
    })
    const linkedinPostId = linkedin.postId

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
      workflowStatus: "posted",
      targetPlatform: "linkedin",
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
    if (error instanceof LinkedInPublishError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status || 400 },
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
