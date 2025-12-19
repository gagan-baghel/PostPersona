import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In production, generate real LinkedIn OAuth URL
    const clientId = process.env.LINKEDIN_CLIENT_ID || "dummy_client_id"
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/linkedin/callback`
    const state = `${user.id}-${Date.now()}` // CSRF protection
    const scope = "openid profile email w_member_social" // LinkedIn posting permissions

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`

    // For now, simulate connection by directly updating the database
    // Remove this in production and handle via callback
    const { error } = await supabase
      .from("profiles")
      .update({
        linkedin_connected: true,
        linkedin_profile_id: `dummy_${user.id}`,
      })
      .eq("id", user.id)

    if (error) {
      console.error("[v0] Error updating LinkedIn status:", error)
    }

    // In production, return authUrl for redirect
    // For dummy mode, return success immediately
    return Response.json({
      success: true,
      authUrl: "/dashboard/generate", // Redirect back to generate page
      message: "LinkedIn connected successfully (dummy mode)",
    })
  } catch (error) {
    console.error("[v0] Error initiating LinkedIn connection:", error)
    return Response.json(
      { error: "Failed to connect LinkedIn: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
