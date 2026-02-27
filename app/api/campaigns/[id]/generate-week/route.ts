import { NextResponse } from "next/server"
import { z } from "zod"

import { buildWeeklyStructuredPrompt } from "@/lib/ai/prompt-builder"
import { generateWithGrok } from "@/lib/ai/grok"
import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

const GenerateCampaignWeekSchema = z.object({
  personaId: z.string().optional(),
  targetPlatform: z.literal("linkedin").default("linkedin"),
})

const WeeklyOutputSchema = z.object({
  posts: z
    .array(
      z.object({
        topic: z.string().min(3).max(200),
        content: z.string().min(30),
      }),
    )
    .length(7),
})

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf("{")
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === "\"") inString = false
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
  const parse = (value: string) => {
    const json = JSON.parse(value)
    const validated = WeeklyOutputSchema.safeParse(json)
    if (!validated.success) throw new Error("Invalid schema")
    return validated.data
  }

  try {
    return parse(raw)
  } catch {
    const fenced = raw.match(/```json\n([\s\S]*?)\n```/)?.[1]
    if (fenced) {
      try {
        return parse(fenced)
      } catch {
        // fallthrough
      }
    }
    const objectCandidate = extractFirstJsonObject(raw)
    if (!objectCandidate) throw new Error("Malformed model output")
    return parse(objectCandidate)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params

    const body = await request.json().catch(() => ({}))
    const parsed = GenerateCampaignWeekSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 })
    }
    const { targetPlatform, personaId: overridePersonaId } = parsed.data

    const [profile, campaign] = await Promise.all([
      convexQuery<any>("app:getProfile", { userId }),
      convexQuery<any>("app:getCampaignById", { userId, campaignId: id }),
    ])

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const personaId = overridePersonaId || campaign.primary_persona_id
    if (!personaId) {
      return NextResponse.json({ error: "Campaign has no persona. Set one first." }, { status: 400 })
    }
    const persona = await convexQuery<any>("app:getPersonaById", { personaId, userId })
    if (!persona) return NextResponse.json({ error: "Persona not found" }, { status: 404 })

    const requiredCoins = 21
    if ((profile.coins ?? 0) < requiredCoins) {
      return NextResponse.json(
        { error: `Insufficient coins. Campaign weekly generation requires ${requiredCoins} coins.` },
        { status: 402 },
      )
    }

    const topic = [
      `Campaign: ${campaign.name}`,
      `Goal: ${campaign.goal}`,
      `Audience: ${campaign.audience}`,
      `Pillars: ${(campaign.pillars ?? []).join(", ")}`,
      `Cadence: ${campaign.cadence_per_week} posts/week`,
      campaign.kpi_target ? `KPI target: ${campaign.kpi_target}` : "",
    ]
      .filter(Boolean)
      .join(" | ")

    const messages = buildWeeklyStructuredPrompt(persona, topic, targetPlatform)
    const generation = await generateWithGrok({
      messages,
      temperature: 0.35,
      maxTokens: 1900,
    })
    const parsedPosts = parseWeeklyOutput(generation.text)

    const createdPostIds: string[] = []
    for (let i = 0; i < parsedPosts.posts.length; i++) {
      const item = parsedPosts.posts[i]
      const create = await convexMutation<any>("app:createPost", {
        userId,
        personaId,
        campaignId: id,
        topic: item.topic.trim() || `${campaign.name} #${i + 1}`,
        content: item.content.trim(),
        aiModelVersion: generation.model,
        workflowStatus: "review",
        targetPlatform,
      })
      if (!create?.ok || !create?.postId) throw new Error("Failed to create campaign post")
      createdPostIds.push(create.postId)
    }

    const deduction = await convexMutation<any>("app:addCoins", {
      userId,
      amount: -requiredCoins,
      type: "post_generation",
      description: `Campaign weekly batch for ${campaign.name}`,
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
  } catch (error) {
    console.error("[Campaign Generate Week] Error:", error)
    return NextResponse.json({ error: "Failed to generate campaign week" }, { status: 500 })
  }
}

