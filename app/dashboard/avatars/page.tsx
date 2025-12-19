import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AvatarCard } from "@/components/avatar-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuggestedAvatarCard } from "@/components/suggested-avatar-card"

export default async function AvatarsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userAvatars } = await supabase
    .from("avatars")
    .select("*")
    .eq("user_id", user!.id)
    .eq("avatar_type", "user_created")
    .order("created_at", { ascending: false })

  const { data: suggestedAvatars } = await supabase
    .from("avatars")
    .select("*")
    .in("avatar_type", ["suggested", "default"])
    .order("created_at", { ascending: true })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Avatars</h1>
          <p className="mt-2 text-muted-foreground">Create and manage your AI personas for content generation</p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/avatars/new">Create Avatar</Link>
        </Button>
      </div>

      <Tabs defaultValue="my-avatars" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-avatars">My Avatars</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="my-avatars" className="mt-0">
          {userAvatars && userAvatars.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {userAvatars.map((avatar) => (
                <AvatarCard key={avatar.id} avatar={avatar} />
              ))}
            </div>
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
              <h3 className="text-lg font-semibold">No avatars yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first AI persona to start generating content
              </p>
              <Button asChild className="mt-6">
                <Link href="/dashboard/avatars/new">Create Your First Avatar</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="explore" className="mt-0">
          <p className="mb-6 text-sm text-muted-foreground">
            Discover pre-configured avatars designed for different content styles. Click "Add to My Avatars" to use
            them.
          </p>

          {suggestedAvatars && suggestedAvatars.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {suggestedAvatars.map((avatar) => (
                <SuggestedAvatarCard key={avatar.id} avatar={avatar} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">No suggested avatars available at the moment.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
