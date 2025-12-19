import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PostGenerator } from "@/components/post-generator"

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ avatar?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [{ data: avatars }, { data: profile }] = await Promise.all([
    supabase
      .from("avatars")
      .select("*")
      .or(`user_id.eq.${user.id},avatar_type.in.(suggested,default)`)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("coins").eq("id", user.id).single(),
  ])

  // Get selected avatar if provided
  let selectedAvatar = null
  if (params.avatar && avatars) {
    selectedAvatar = avatars.find((a) => a.id === params.avatar) || null
  }

  // Filter only user's avatars for generation (not suggested ones)
  const userAvatars = avatars?.filter((a) => a.user_id === user.id) || []

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Generate Post</h1>
          <p className="mt-2 text-muted-foreground">Create engaging LinkedIn content with your AI personas</p>
        </div>

        {userAvatars && userAvatars.length > 0 ? (
          <PostGenerator avatars={userAvatars} selectedAvatar={selectedAvatar} userProfile={profile || { coins: 0 }} />
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-8 w-8 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Create an avatar first</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You need to create at least one AI avatar before generating posts
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
