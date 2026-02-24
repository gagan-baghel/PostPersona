import { convexMutation } from "@/lib/convex/client"

type LinkedInProfile = {
  linkedin_connected?: boolean
  linkedin_access_token?: string
  linkedin_refresh_token?: string
  linkedin_access_token_expires_at?: number
  linkedin_refresh_token_expires_at?: number
  linkedin_profile_id?: string
}

export type LinkedInTokenHealth = {
  needsReconnect: boolean
  expiresInSeconds: number | null
  warning: string | null
}

function nowMs() {
  return Date.now()
}

export function getLinkedInTokenHealth(profile: LinkedInProfile): LinkedInTokenHealth {
  if (!profile.linkedin_connected || !profile.linkedin_access_token) {
    return { needsReconnect: true, expiresInSeconds: null, warning: "LinkedIn is not connected." }
  }

  const now = nowMs()
  const expiry = profile.linkedin_access_token_expires_at
  if (typeof expiry !== "number") {
    return {
      needsReconnect: false,
      expiresInSeconds: null,
      warning: "LinkedIn token expiry metadata is unavailable. Reconnect LinkedIn for better reliability.",
    }
  }

  const delta = Math.floor((expiry - now) / 1000)
  if (delta <= 0) {
    const hasRefresh = Boolean(profile.linkedin_refresh_token)
    return {
      needsReconnect: !hasRefresh,
      expiresInSeconds: delta,
      warning: hasRefresh ? "LinkedIn access token expired. Attempting auto-refresh." : "LinkedIn token expired. Reconnect required.",
    }
  }

  if (delta < 24 * 60 * 60) {
    return {
      needsReconnect: false,
      expiresInSeconds: delta,
      warning: `LinkedIn access token expires in ${Math.max(1, Math.floor(delta / 3600))}h.`,
    }
  }

  return { needsReconnect: false, expiresInSeconds: delta, warning: null }
}

export async function ensureLinkedInAccessToken(
  userId: string,
  profile: LinkedInProfile,
): Promise<{ ok: boolean; accessToken?: string; needsReconnect?: boolean; warning?: string }> {
  const health = getLinkedInTokenHealth(profile)
  if (!profile.linkedin_connected || !profile.linkedin_access_token) {
    return { ok: false, needsReconnect: true, warning: health.warning || "LinkedIn not connected" }
  }

  const now = nowMs()
  const expiresAt = profile.linkedin_access_token_expires_at
  const stillValid = typeof expiresAt !== "number" || expiresAt - now > 2 * 60 * 1000
  if (stillValid) {
    return {
      ok: true,
      accessToken: profile.linkedin_access_token,
      needsReconnect: health.needsReconnect,
      warning: health.warning || undefined,
    }
  }

  const refreshToken = profile.linkedin_refresh_token
  if (!refreshToken) {
    return { ok: false, needsReconnect: true, warning: "LinkedIn access token expired and no refresh token is available." }
  }

  const refreshExpiry = profile.linkedin_refresh_token_expires_at
  if (typeof refreshExpiry === "number" && refreshExpiry <= now) {
    return { ok: false, needsReconnect: true, warning: "LinkedIn refresh token expired. Reconnect required." }
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return { ok: false, needsReconnect: true, warning: "LinkedIn refresh config missing in environment." }
  }

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    return { ok: false, needsReconnect: true, warning: "LinkedIn token refresh failed. Reconnect required." }
  }

  const json = await response.json().catch(() => ({}))
  const newAccessToken = typeof json.access_token === "string" ? json.access_token : ""
  const accessTtl = typeof json.expires_in === "number" ? json.expires_in : 0
  const newRefresh = typeof json.refresh_token === "string" ? json.refresh_token : refreshToken
  const refreshTtl = typeof json.refresh_token_expires_in === "number" ? json.refresh_token_expires_in : undefined

  if (!newAccessToken || accessTtl <= 0) {
    return { ok: false, needsReconnect: true, warning: "LinkedIn token refresh returned invalid payload." }
  }

  await convexMutation<any>("app:setLinkedinConnection", {
    userId,
    connected: true,
    accessToken: newAccessToken,
    refreshToken: newRefresh,
    accessTokenExpiresAt: now + accessTtl * 1000,
    refreshTokenExpiresAt: typeof refreshTtl === "number" ? now + refreshTtl * 1000 : profile.linkedin_refresh_token_expires_at,
    profileId: profile.linkedin_profile_id,
  })

  return { ok: true, accessToken: newAccessToken, warning: "LinkedIn access token refreshed automatically." }
}

