import { NextResponse } from "next/server"
import { z } from "zod"

import { buildWeeklyStructuredPrompt } from "@/lib/ai/prompt-builder"
import { generateWithGrok } from "@/lib/ai/grok"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { enforceXLimit, needsXLimit } from "@/lib/social/platform-limits"

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

class AIOutputFormatError extends Error {
  constructor(message = "AI output format error") {
    super(message)
    this.name = "AIOutputFormatError"
  }
}

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === "\"") {
        inString = false
      }
      continue
    }
    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}

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
    const fenced = raw.match(/```json\n([\s\S]*?)\n```/)?.[1]
    if (fenced) {
      try {
        return tryJson(fenced)
      } catch {
        // Continue to object extraction.
      }
    }

    const objectCandidate = extractFirstJsonObject(raw)
    if (!objectCandidate) throw new AIOutputFormatError("AI generation malformed")
    try {
      return tryJson(objectCandidate)
    } catch {
      throw new AIOutputFormatError("AI generation malformed")
    }
  }
}

function mapGenerateError(error: unknown): { status: number; body: Record<string, unknown> } {
  const status = typeof (error as any)?.status === "number" ? (error as any).status : undefined
  const message = error instanceof Error ? error.message : "Unknown error"
  const lower = message.toLowerCase()

  if (status === 429 || lower.includes("rate limit")) {
    return {
      status: 429,
      body: {
        error: "Model rate limit reached. Please retry shortly.",
        code: "MODEL_RATE_LIMIT",
        retryAfterSeconds: 20,
      },
    }
  }

  if (status === 401 || status === 403 || lower.includes("invalid api key")) {
    return {
      status: 503,
      body: {
        error: "AI provider authentication failed. Check GROK_API_KEY.",
        code: "PROVIDER_AUTH_FAILED",
      },
    }
  }

  if (lower.includes("missing grok_api_key")) {
    return {
      status: 503,
      body: { error: "Missing GROK_API_KEY in environment.", code: "MISSING_GROK_API_KEY" },
    }
  }

  if (lower.includes("decommissioned") || lower.includes("no longer supported")) {
    return {
      status: 503,
      body: {
        error: "Configured AI model is no longer supported. Update GROK_MODEL.",
        code: "MODEL_DEPRECATED",
      },
    }
  }

  if (error instanceof AIOutputFormatError || lower.includes("malformed")) {
    return {
      status: 502,
      body: {
        error: "AI returned an invalid response format. Please retry.",
        code: "INVALID_AI_OUTPUT",
      },
    }
  }

  return {
    status: 500,
    body: { error: "Internal Server Error", code: "INTERNAL_ERROR" },
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

    const messages = buildWeeklyStructuredPrompt(persona, topic, targetPlatform)
    const generation = await generateWithGrok({
      messages,
      temperature: 0.4,
      maxTokens: 1900,
    })
    const resultRaw = generation.text

    const parsed = parseWeeklyOutput(resultRaw)
    const createdPostIds: string[] = []

    for (let i = 0; i < parsed.posts.length; i++) {
      const item = parsed.posts[i]
      const content = item.content.trim()
      if (needsXLimit(targetPlatform)) {
        const xLimit = enforceXLimit(content)
        if (!xLimit.ok) {
          throw new AIOutputFormatError(`Weekly post ${i + 1} exceeds X limit (${xLimit.count}/${xLimit.limit})`)
        }
      }
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
    const mapped = mapGenerateError(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
