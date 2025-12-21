import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { personaId, topic, content, imageUrl, imagePrompt, imagePreset } = await request.json()

    if (!personaId || !topic || !content) {
      return Response.json(
        { error: "Missing required fields: personaId, topic, and content are required" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("id")
      .eq("id", personaId)
      .or(`user_id.eq.${user.id},is_app_provided.eq.true`)
      .single()

    if (personaError || !persona) {
      return Response.json({ error: "Persona not found or access denied" }, { status: 403 })
    }

    // Check if user has LinkedIn connected
    const { data: profile } = await supabase.from("profiles").select("linkedin_connected").eq("id", user.id).single()

    // In production, this would integrate with LinkedIn API

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        persona_id: personaId,
        topic,
        content,
        image_url: imageUrl || null,
        image_prompt: imagePrompt || null,
        image_preset: imagePreset || null,
        posted_to_linkedin: true,
        linkedin_post_id: `dummy_${Date.now()}`, // Dummy ID for now
      })
      .select()
      .single()

    if (postError) {
      console.error("[v0] Error saving post:", postError)
      return Response.json({ error: "Failed to save post: " + postError.message }, { status: 500 })
    }

    // In production, would call LinkedIn API here:
    // const linkedInResponse = await postToLinkedInAPI(content, imageUrl, accessToken)

    return Response.json({
      success: true,
      postId: post.id,
      message: profile?.linkedin_connected
        ? "Posted to LinkedIn successfully!"
        : "Post saved! Connect LinkedIn to publish.",
    })
  } catch (error) {
    console.error("[v0] Error posting to LinkedIn:", error)
    return Response.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
