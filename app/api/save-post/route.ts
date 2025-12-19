import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { avatarId, topic, content } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Save post to database
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      avatar_id: avatarId,
      topic,
      content,
    })

    if (error) {
      console.error("[v0] Error saving post:", error)
      return new Response("Failed to save post", { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[v0] Error in save-post:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
