import { NextResponse } from "next/server"
import { z } from "zod"

import { buildWeeklyStructuredPrompt } from "@/lib/ai/prompt-builder"
import { AIOutputFormatError, creditCost, generateText, mapAIError, parseJsonLoose, resolveEngine } from "@/lib/ai/llm"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { CREDIT_COSTS } from "@/lib/pricing"

const ScheduleWeekSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  topic: z.string().max(500).optional(),
  targetPlatform: z.literal("linkedin").default("linkedin"),
})

const WeeklyOutputSchema = z.object({
  posts: z
    .array(
      z.object({
        topic: z.string().min(3).max(200),
        content: z.string().min(30),
        hashtags: z.array(z.string()).optional(),
      }),
    )
    .length(7),
})

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const validation = ScheduleWeekSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input", details: validation.error.format() }, { status: 400 })
    }

    const { personaId, topic, targetPlatform } = validation.data
    const [profile, persona] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any>("app:getPersonaById", { personaId, userId }),
    ])

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    if (!persona) return NextResponse.json({ error: "Persona not found" }, { status: 404 })

    const engine = resolveEngine(profile.ai_provider)
    const requiredCoins = creditCost(engine, CREDIT_COSTS.week)
    if ((profile.coins ?? 0) < requiredCoins) {
      return NextResponse.json(
        { error: `Insufficient coins. Weekly scheduling requires ${requiredCoins} coins.` },
        { status: 402 },
      )
    }

    const messages = buildWeeklyStructuredPrompt(persona, topic, targetPlatform)
    const generation = await generateText({
      messages,
      temperature: 0.4,
      maxTokens: 1900,
      engine,
    })
    const validated = WeeklyOutputSchema.safeParse(parseJsonLoose(generation.text))
    if (!validated.success) throw new AIOutputFormatError("AI generation malformed")
    const parsed = validated.data
    const createdPostIds: string[] = []

    for (let i = 0; i < parsed.posts.length; i++) {
      const item = parsed.posts[i]
      const content = item.content.trim()
      const result = await convexMutation<any>("app:createPost", {
        userId,
        personaId,
        topic: item.topic?.trim() || (topic?.trim() ? `${topic.trim()} #${i + 1}` : `Trending insight #${i + 1}`),
        content,
        aiModelVersion: generation.model,
        workflowStatus: "review",
        targetPlatform,
      })

      if (!result?.ok || !result?.postId) {
        throw new Error("Failed to save generated weekly post")
      }

      createdPostIds.push(result.postId)
    }

    const deduction = requiredCoins
      ? await convexMutation<any>("app:addCoins", {
          userId,
          amount: -requiredCoins,
          type: "post_generation",
          description: `Generated 7 review posts as ${persona.name}`,
        })
      : { ok: true, newBalance: profile.coins }

    if (!deduction?.ok) {
      for (const postId of createdPostIds) {
        await convexMutation<any>("app:deletePost", { userId, postId }).catch(() => null)
      }
      return NextResponse.json({ error: "Transaction failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created: createdPostIds.length,
      postIds: createdPostIds,
      remainingCoins: deduction.newBalance,
    })
  } catch (error: any) {
    console.error("[Schedule Week API] Error:", error)
    const mapped = mapAIError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
