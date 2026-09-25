import { NextResponse } from "next/server"

import {
  clearSessionCookie,
  getCookieValueFromHeader,
  getSessionUserIdFromRequest,
  verifyOAuthState,
} from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"
import {
  LINKEDIN_OAUTH_NONCE_COOKIE,
  LINKEDIN_OAUTH_STATE_MAX_AGE_MS,
  resolveLinkedInRedirectUri,
  setLinkedInOAuthNonceCookie,
} from "@/lib/social/linkedin-oauth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  let nextPath = "/dashboard/generate"
  // Every exit ends the flow, so the one-time nonce is always cleared.
  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    setLinkedInOAuthNonceCookie(response, "")
    return response
  }
  const redirectToLoginAndLogout = () => {
    const response = redirectTo("/auth/login?reason=session_mismatch")
    clearSessionCookie(response)
    return response
  }

  console.log("[LinkedIn Callback] Started callback flow", { error, hasCode: !!code, hasState: !!state })

  if (error) {
    console.error(`[LinkedIn Callback] Received error from LinkedIn: ${error}`)
    return redirectTo(`/dashboard/generate?linkedin_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    console.error("[LinkedIn Callback] Missing code or state")
    return redirectTo("/dashboard/generate?linkedin_error=missing_params")
  }

  try {
    const userId = getSessionUserIdFromRequest(request)
    console.log(`[LinkedIn Callback] User ID from session: ${userId}`)

    if (!userId) {
      console.warn("[LinkedIn Callback] Unauthorized: no user ID")
      return redirectTo("/auth/login")
    }

    const stateData = verifyOAuthState(state) as {
      userId?: string
      ts?: number
      nextPath?: string
      nonce?: string
    } | null
    const nonceCookie = getCookieValueFromHeader(request.headers.get("cookie"), LINKEDIN_OAUTH_NONCE_COOKIE)
    if (
      !stateData ||
      typeof stateData.ts !== "number" ||
      Date.now() - stateData.ts > LINKEDIN_OAUTH_STATE_MAX_AGE_MS ||
      !nonceCookie ||
      stateData.nonce !== nonceCookie
    ) {
      console.error("[LinkedIn Callback] Rejected state: bad signature, expired, or nonce mismatch")
      return redirectTo(`${nextPath}?linkedin_error=invalid_state`)
    }

    const stateUserId = stateData.userId
    if (typeof stateData.nextPath === "string" && stateData.nextPath.startsWith("/dashboard")) {
      nextPath = stateData.nextPath
    }


    if (stateUserId !== userId) {
      console.error(`[LinkedIn Callback] State User ID mismatch! Expected ${userId}, got ${stateUserId}`)
      return redirectToLoginAndLogout()
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    const redirectUri = resolveLinkedInRedirectUri(request)

    console.log(`[LinkedIn Callback] Config check:`, { hasClientId: !!clientId, hasClientSecret: !!clientSecret, redirectUri })

    if (!clientId || !clientSecret) {
      console.error("[LinkedIn Callback] Missing client_id or client_secret")
      return redirectTo(`${nextPath}?linkedin_error=missing_config`)
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
      const errText = await tokenResponse.text()
      console.error(`[LinkedIn Callback] Token exchange failed. Status: ${tokenResponse.status}. Body: ${errText}`)
      throw new Error("Failed to exchange code for token")
    }

    const tokenData = await tokenResponse.json()
    console.log("[LinkedIn Callback] Successfully exchanged token")
    
    const accessToken = typeof tokenData?.access_token === "string" ? tokenData.access_token : ""
    const refreshToken = typeof tokenData?.refresh_token === "string" ? tokenData.refresh_token : undefined
    const accessTokenExpiresAt =
      typeof tokenData?.expires_in === "number" ? Date.now() + tokenData.expires_in * 1000 : undefined
    const refreshTokenExpiresAt =
      typeof tokenData?.refresh_token_expires_in === "number"
        ? Date.now() + tokenData.refresh_token_expires_in * 1000
        : undefined

    if (!accessToken) {
        console.error("[LinkedIn Callback] Missing access token in JSON response", tokenData)
      throw new Error("Missing access token in callback response")
    }

    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
        const errText = await profileResponse.text()
        console.error(`[LinkedIn Callback] Profile fetch failed. Status: ${profileResponse.status}. Body: ${errText}`)
      throw new Error("Failed to fetch LinkedIn profile")
    }

    const profile = await profileResponse.json()
    console.log(`[LinkedIn Callback] Fetched profile for: ${profile.sub}`)
    const profileImageUrl = typeof profile?.picture === "string" ? profile.picture : undefined

    const result = await convexMutation<any>("app:setLinkedinConnection", {
      userId,
      connected: true,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      profileId: profile.sub,
      profileImageUrl,
    })

    if (!result?.ok) {
        console.error(`[LinkedIn Callback] Convex mutation failed:`, result)
      throw new Error("Failed to store LinkedIn profile")
    }

    console.log("[LinkedIn Callback] Success! Redirecting")
    return redirectTo(`${nextPath}?linkedin_success=true`)
  } catch (callbackError) {
    console.error("[LinkedIn Callback] Caught Error:", callbackError)
    return redirectTo(`${nextPath}?linkedin_error=callback_failed`)
  }
}
