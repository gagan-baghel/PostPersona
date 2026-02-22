import { NextResponse } from "next/server"
import { z } from "zod"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"
import { enforceXLimit, needsXLimit } from "@/lib/social/platform-limits"

const SingleScheduleSchema = z.object({
  personaId: z.string().min(1),
  topic: z.string().min(3).max(500),
  content: z.string().min(20),
  imageUrl: z.string().optional().nullable(),
  cloudinaryPublicId: z.string().optional().nullable(),
  cloudinarySecureUrl: z.string().optional().nullable(),
  imagePreset: z.string().optional().nullable(),
  imagePrompt: z.string().optional().nullable(),
  aiModelVersion: z.string().optional().nullable(),
  targetPlatform: z.enum(["linkedin", "x", "both"]).default("linkedin"),
})

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = SingleScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data
    if (needsXLimit(data.targetPlatform)) {
      const xLimit = enforceXLimit(data.content)
      if (!xLimit.ok) {
        return NextResponse.json(
          {
            error: `X post exceeds character limit (${xLimit.count}/${xLimit.limit}).`,
            code: "X_CHAR_LIMIT_EXCEEDED",
            maxChars: xLimit.limit,
            currentChars: xLimit.count,
          },
          { status: 400 },
        )
      }
    }

    const create = await convexMutation<any>("app:createPost", {
      userId,
      personaId: data.personaId,
      topic: data.topic,
      content: data.content,
      imageUrl: data.imageUrl || data.cloudinarySecureUrl || undefined,
      cloudinaryPublicId: data.cloudinaryPublicId || undefined,
      cloudinarySecureUrl: data.cloudinarySecureUrl || undefined,
      imagePreset: data.imagePreset || undefined,
      imagePrompt: data.imagePrompt || undefined,
      aiModelVersion: data.aiModelVersion || undefined,
      workflowStatus: "review",
      targetPlatform: data.targetPlatform,
    })

    if (!create?.ok || !create?.postId) {
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
    }

    const approve = await convexMutation<any>("app:approvePostAndAutoSchedule", {
      userId,
      postId: create.postId,
    })

    if (!approve?.ok) {
      await convexMutation<any>("app:deletePost", { userId, postId: create.postId }).catch(() => null)
      return NextResponse.json({ error: "Failed to schedule post" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      postId: create.postId,
      scheduledFor: approve.scheduledFor ?? null,
      queuePosition: approve.queuePosition ?? null,
    })
  } catch (error) {
    console.error("[Single Schedule API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
