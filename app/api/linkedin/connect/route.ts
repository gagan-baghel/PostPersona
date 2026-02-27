import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { resolveLinkedInRedirectUri } from "@/lib/social/linkedin-oauth"

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedNextPath =
      typeof body.nextPath === "string" && body.nextPath.startsWith("/dashboard") ? body.nextPath : "/dashboard/generate"

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    if (!clientId) {
      return NextResponse.json(
        { error: "LinkedIn is not configured. Missing LINKEDIN_CLIENT_ID." },
        { status: 400 },
      )
    }

    const redirectUri = resolveLinkedInRedirectUri(request)
    const statePayload = Buffer.from(
      JSON.stringify({
        userId,
        ts: Date.now(),
        nextPath: requestedNextPath,
        nonce: randomUUID(),
      }),
      "utf8",
    ).toString("base64url")
    const includeOffline = process.env.LINKEDIN_REQUEST_OFFLINE_ACCESS === "true"
    const scope = includeOffline ? "openid profile email w_member_social offline_access" : "openid profile email w_member_social"

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${statePayload}&scope=${encodeURIComponent(scope)}`

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
      message: `Continue in browser to connect LinkedIn from ${appUrl}`,
    })
  } catch (error) {
    console.error("[LinkedIn Connect] Error:", error)
    return NextResponse.json({ error: "Failed to connect LinkedIn" }, { status: 500 })
  }
}
