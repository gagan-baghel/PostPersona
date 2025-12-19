import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    console.error("[v0] LinkedIn OAuth error:", error)
    return redirect("/dashboard/generate?linkedin_error=" + error)
  }

  if (!code || !state) {
    return redirect("/dashboard/generate?linkedin_error=missing_params")
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return redirect("/auth/login")
    }

    // Verify state matches user ID (CSRF protection)
    const [userId] = state.split("-")
    if (userId !== user.id) {
      return redirect("/dashboard/generate?linkedin_error=invalid_state")
    }

    // Exchange code for access token
    const clientId = process.env.LINKEDIN_CLIENT_ID!
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`

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

    const { access_token } = await tokenResponse.json()

    // Fetch LinkedIn profile
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch LinkedIn profile")
    }

    const profile = await profileResponse.json()

    // Store in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_connected: true,
        linkedin_access_token: access_token,
        linkedin_profile_id: profile.sub,
      })
      .eq("id", user.id)

    if (updateError) {
      throw updateError
    }

    return redirect("/dashboard/generate?linkedin_success=true")
  } catch (error) {
    console.error("[v0] LinkedIn callback error:", error)
    return redirect("/dashboard/generate?linkedin_error=callback_failed")
  }
}
