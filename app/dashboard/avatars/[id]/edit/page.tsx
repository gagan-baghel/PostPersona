import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { AvatarForm } from "@/components/avatar-form"

export default async function EditAvatarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: avatar } = await supabase.from("avatars").select("*").eq("id", id).eq("user_id", user.id).single()

  if (!avatar) {
    notFound()
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit Avatar</h1>
          <p className="mt-2 text-muted-foreground">Update your AI persona's personality and writing style</p>
        </div>

        <AvatarForm avatar={avatar} />
      </div>
    </div>
  )
}
