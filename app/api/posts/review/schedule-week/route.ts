import { NextResponse } from "next/server"
import { z } from "zod"

import genAI from "@/lib/ai/gemini"
import { buildWeeklyStructuredPrompt } from "@/lib/ai/prompt-builder"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

const ScheduleWeekSchema = z.object({
  personaId: z.string().min(1, "Persona ID is required"),
  topic: z.string().max(500).optional(),
  targetPlatform: z.enum(["linkedin", "x", "both"]).default("linkedin"),
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

function parseWeeklyOutput(raw: string) {
  const tryJson = (value: string) => {
    const parsed = JSON.parse(value)
    const validated = WeeklyOutputSchema.safeParse(parsed)
    if (!validated.success) throw new Error("Invalid weekly output schema")
    return validated.data
  }

  try {
    return tryJson(raw)
  } catch {
    const match = raw.match(/```json\n([\s\S]*?)\n```/)
    if (!match?.[1]) throw new Error("AI generation malformed")
    return tryJson(match[1])
  }
}

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

    const requiredCoins = 21
    if ((profile.coins ?? 0) < requiredCoins) {
      return NextResponse.json(
        { error: `Insufficient coins. Weekly scheduling requires ${requiredCoins} coins.` },
        { status: 402 },
      )
    }

    const messages = buildWeeklyStructuredPrompt(persona, topic)
    const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join("\n\n")

    let resultRaw = ""

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
      const generation = await model.generateContent(prompt)
      resultRaw = generation.response.text() || ""
    } catch (geminiError: any) {
      const openRouterKey = process.env.OPENROUTER_API_KEY
      if (!openRouterKey) throw geminiError

      const fallbackResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nex-agi/deepseek-v3.1-nex-n1:free",
          messages,
          temperature: 0.7,
          max_tokens: 2800,
        }),
      })

      const fallbackJson = await fallbackResponse.json().catch(() => ({}))
      if (!fallbackResponse.ok) {
        throw new Error(
          fallbackJson?.error?.message ||
            fallbackJson?.message ||
            `Fallback provider failed with status ${fallbackResponse.status}`,
        )
      }

      resultRaw = fallbackJson?.choices?.[0]?.message?.content || ""
    }

    const parsed = parseWeeklyOutput(resultRaw)
    const createdPostIds: string[] = []

    for (let i = 0; i < parsed.posts.length; i++) {
      const item = parsed.posts[i]
      const result = await convexMutation<any>("app:createPost", {
        userId,
        personaId,
        topic: item.topic?.trim() || (topic?.trim() ? `${topic.trim()} #${i + 1}` : `Trending insight #${i + 1}`),
        content: item.content.trim(),
        aiModelVersion: "gemini-2.0-flash",
        workflowStatus: "review",
        targetPlatform,
      })

      if (!result?.ok || !result?.postId) {
        throw new Error("Failed to save generated weekly post")
      }

      createdPostIds.push(result.postId)
    }

    const deduction = await convexMutation<any>("app:addCoins", {
      userId,
      amount: -requiredCoins,
      type: "post_generation",
      description: `Generated 7 review posts as ${persona.name}`,
    })

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

    if (error?.status === 429) {
      return NextResponse.json(
        {
          error: "Gemini quota exceeded. Please retry shortly or enable billing/increase quota.",
        },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
