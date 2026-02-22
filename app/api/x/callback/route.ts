import { redirect } from "next/navigation"

import { getCookieValueFromHeader, getSessionUserIdFromRequest } from "@/lib/auth/session"
import { convexMutation } from "@/lib/convex/client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  let nextPath = "/dashboard/generate"

  if (oauthError) {
    return redirect(`/dashboard/settings?x_error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !state) {
    return redirect("/dashboard/settings?x_error=missing_params")
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
      return redirect(`${nextPath}?x_error=invalid_state`)
    }

    const oauthCookie = getCookieValueFromHeader(request.headers.get("cookie"), "pp_x_oauth")
    if (!oauthCookie || !oauthCookie.startsWith(`${state}.`)) {
      return redirect(`${nextPath}?x_error=oauth_cookie_missing`)
    }

    const codeVerifier = oauthCookie.slice(state.length + 1)

    const clientId = process.env.X_CLIENT_ID
    const clientSecret = process.env.X_CLIENT_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectUri = `${appUrl}/api/x/callback`

    if (!clientId || !clientSecret) {
      return redirect(`${nextPath}?x_error=missing_config`)
    }

    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      return redirect(`${nextPath}?x_error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData?.access_token
    if (!accessToken) {
      return redirect(`${nextPath}?x_error=missing_access_token`)
    }

    const meResponse = await fetch("https://api.x.com/2/users/me?user.fields=username,name", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!meResponse.ok) {
      return redirect(`${nextPath}?x_error=profile_fetch_failed`)
    }

    const meData = await meResponse.json()
    const xUserId = meData?.data?.id
    const username = meData?.data?.username

    const result = await convexMutation<any>("app:setXConnection", {
      userId,
      connected: true,
      accessToken,
      xUserId,
      xUsername: username,
    })

    if (!result?.ok) {
      return redirect(`${nextPath}?x_error=profile_store_failed`)
    }

    return redirect(`${nextPath}?x_success=true`)
  } catch (error) {
    console.error("[X Callback] Error:", error)
    return redirect(`${nextPath}?x_error=callback_failed`)
  }
}
