import { NextResponse } from "next/server"
import { z } from "zod"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

const CreateCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  goal: z.string().min(3).max(400),
  audience: z.string().min(2).max(400),
  pillars: z.array(z.string().min(2).max(120)).min(1).max(8),
  cadencePerWeek: z.number().int().min(1).max(14),
  kpiTarget: z.string().max(300).optional(),
  primaryPersonaId: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const campaigns = await convexQuery<any[]>("app:listCampaigns", { userId })
    return NextResponse.json(campaigns ?? [])
  } catch (error) {
    console.error("[Campaigns GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = CreateCampaignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data
    const result = await convexMutation<any>("app:createCampaign", {
      userId,
      name: data.name,
      goal: data.goal,
      audience: data.audience,
      pillars: data.pillars,
      cadencePerWeek: data.cadencePerWeek,
      kpiTarget: data.kpiTarget,
      primaryPersonaId: data.primaryPersonaId,
    })
    if (!result?.ok) return NextResponse.json({ error: "Failed to create campaign" }, { status: 400 })
    return NextResponse.json({ success: true, campaignId: result.campaignId })
  } catch (error) {
    console.error("[Campaigns POST] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

