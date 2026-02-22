import { createHash, randomBytes } from "crypto"
import { NextResponse } from "next/server"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"

function base64Url(input: Buffer) {
  return input.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export async function POST(request: Request) {
  try {
    const userId = getSessionUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedNextPath =
      typeof body.nextPath === "string" && body.nextPath.startsWith("/dashboard") ? body.nextPath : "/dashboard/generate"

    const clientId = process.env.X_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    if (!clientId) {
      return NextResponse.json({ error: "X is not configured. Missing X_CLIENT_ID." }, { status: 400 })
    }

    const state = Buffer.from(
      JSON.stringify({
        userId,
        ts: Date.now(),
        nextPath: requestedNextPath,
        nonce: base64Url(randomBytes(12)),
      }),
      "utf8",
    ).toString("base64url")
    const codeVerifier = base64Url(randomBytes(32))
    const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest())
    const redirectUri = `${appUrl}/api/x/callback`

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access")
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("code_challenge", codeChallenge)
    authUrl.searchParams.set("code_challenge_method", "S256")

    const response = NextResponse.json({ success: true, authUrl: authUrl.toString() })
    response.cookies.set("pp_x_oauth", `${state}.${codeVerifier}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    console.error("[X Connect] Error:", error)
    return NextResponse.json({ error: "Failed to connect X" }, { status: 500 })
  }
}
