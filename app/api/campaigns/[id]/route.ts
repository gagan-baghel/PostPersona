import { NextResponse } from "next/server"
import { z } from "zod"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"

const UpdateCampaignSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  goal: z.string().min(3).max(400).optional(),
  audience: z.string().min(2).max(400).optional(),
  pillars: z.array(z.string().min(2).max(120)).min(1).max(8).optional(),
  cadencePerWeek: z.number().int().min(1).max(14).optional(),
  kpiTarget: z.string().max(300).optional(),
  primaryPersonaId: z.string().optional(),
  status: z.string().max(40).optional(),
})

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params

    const analytics = await convexQuery<any>("app:getCampaignAnalytics", { userId, campaignId: id })
    if (!analytics) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    return NextResponse.json(analytics)
  } catch (error) {
    console.error("[Campaign GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params

    const body = await request.json()
    const parsed = UpdateCampaignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data
    const result = await convexMutation<any>("app:updateCampaign", {
      userId,
      campaignId: id,
      name: data.name,
      goal: data.goal,
      audience: data.audience,
      pillars: data.pillars,
      cadencePerWeek: data.cadencePerWeek,
      kpiTarget: data.kpiTarget,
      primaryPersonaId: data.primaryPersonaId,
      status: data.status,
    })
    if (!result?.ok) return NextResponse.json({ error: "Failed to update campaign" }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Campaign PATCH] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

