import { redirect } from "next/navigation"

import { getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  let nextPath = "/dashboard/generate"

  if (error) {
    return redirect(`/dashboard/generate?linkedin_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return redirect("/dashboard/generate?linkedin_error=missing_params")
  }

  try {
    const userId = getSessionUserIdFromRequest(request)

    if (!userId) {
      return redirect("/auth/login")
    }

    const stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId?: string
      nextPath?: string
    }
    const stateUserId = stateData.userId
    if (typeof stateData.nextPath === "string" && stateData.nextPath.startsWith("/dashboard")) {
      nextPath = stateData.nextPath
    }
    if (stateUserId !== userId) {
      return redirect(`${nextPath}?linkedin_error=invalid_state`)
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectUri = `${appUrl}/api/linkedin/callback`

    if (!clientId || !clientSecret) {
      return redirect(`${nextPath}?linkedin_error=missing_config`)
    }

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()
    const accessToken = typeof tokenData?.access_token === "string" ? tokenData.access_token : ""
    const refreshToken = typeof tokenData?.refresh_token === "string" ? tokenData.refresh_token : undefined
    const accessTokenExpiresAt =
      typeof tokenData?.expires_in === "number" ? Date.now() + tokenData.expires_in * 1000 : undefined
    const refreshTokenExpiresAt =
      typeof tokenData?.refresh_token_expires_in === "number"
        ? Date.now() + tokenData.refresh_token_expires_in * 1000
        : undefined

    if (!accessToken) {
      throw new Error("Missing access token in callback response")
    }

    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LinkedIn profile")
    }

    const profile = await profileResponse.json()

    const result = await convexMutation<any>("app:setLinkedinConnection", {
      userId,
      connected: true,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      profileId: profile.sub,
    })

    if (!result?.ok) {
      throw new Error("Failed to store LinkedIn profile")
    }

    return redirect(`${nextPath}?linkedin_success=true`)
  } catch (callbackError) {
    console.error("[LinkedIn Callback] Error:", callbackError)
    return redirect(`${nextPath}?linkedin_error=callback_failed`)
  }
}
