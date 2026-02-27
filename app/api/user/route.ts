import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation, convexQuery } from "@/lib/convex/client"
import { getLinkedInTokenHealth } from "@/lib/social/linkedin-token"

export async function GET(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [user, profile] = await Promise.all([
      convexQuery<any>("app:getUserById", { userId }),
      convexQuery<any>("app:getProfile", { userId }),
    ])

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const tokenHealth = getLinkedInTokenHealth(profile || {})

    return NextResponse.json({
      id: user._id,
      email: user.email,
      full_name: user.full_name ?? null,
      coins: profile?.coins ?? 0,
      default_persona_public: profile?.default_persona_public ?? false,
      allow_profile_in_explore: profile?.allow_profile_in_explore ?? true,
      posting_schedule: profile?.posting_schedule ?? null,
      auto_post_enabled: profile?.auto_post_enabled ?? false,
      timezone: profile?.timezone ?? "UTC",
      linkedin_connected: profile?.linkedin_connected ?? false,
      linkedin_profile_image_url: profile?.linkedin_profile_image_url ?? null,
      linkedin_access_token_expires_at: profile?.linkedin_access_token_expires_at ?? null,
      linkedin_refresh_token_expires_at: profile?.linkedin_refresh_token_expires_at ?? null,
      linkedin_token_warning: tokenHealth.warning,
      linkedin_needs_reconnect: tokenHealth.needsReconnect,
      created_at: user.created_at,
      updated_at: profile?.updated_at ?? user.created_at,
    })
  } catch (error) {
    console.error("[User GET] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined
    const defaultPersonaPublic = typeof body.default_persona_public === "boolean" ? body.default_persona_public : undefined
    const allowProfileInExplore =
      typeof body.allow_profile_in_explore === "boolean" ? body.allow_profile_in_explore : undefined
    const postingSchedule =
      body.posting_schedule && typeof body.posting_schedule === "object" ? body.posting_schedule : undefined
    const autoPostEnabled = typeof body.auto_post_enabled === "boolean" ? body.auto_post_enabled : undefined
    const timezone = typeof body.timezone === "string" ? body.timezone : undefined

    const result = await convexMutation<any>("app:updateProfile", {
      userId,
      fullName,
      defaultPersonaPublic,
      allowProfileInExplore,
      postingSchedule,
      autoPostEnabled,
      timezone,
    })

    if (!result?.ok) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[User PATCH] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
