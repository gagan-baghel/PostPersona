"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Avatar {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  avatar_url: string | null
  avatar_type: string
}

export function SuggestedAvatarCard({ avatar }: { avatar: Avatar }) {
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const router = useRouter()

  const handleAdd = async () => {
    setIsAdding(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsAdding(false)
      return
    }

    try {
      // Create a copy of this avatar for the user
      const { error } = await supabase.from("avatars").insert({
        user_id: user.id,
        name: avatar.name,
        title: avatar.title,
        personality: avatar.personality,
        writing_style: avatar.writing_style,
        avatar_url: avatar.avatar_url,
        avatar_type: "user_created",
      })

      if (error) throw error

      setIsAdded(true)
      router.refresh()
    } catch (err) {
      console.error("[v0] Error adding avatar:", err)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent/5">
      <div className="mb-4">
        {avatar.avatar_url ? (
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">
            <img
              src={avatar.avatar_url || "/placeholder.svg"}
              alt={avatar.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{avatar.name}</h3>
            <Badge variant="secondary" className="text-xs">
              Curated
            </Badge>
          </div>
          {avatar.title && <p className="text-sm text-muted-foreground">{avatar.title}</p>}
        </div>
      </div>

      <div className="mb-4 space-y-3 text-sm">
        <div className="rounded-md bg-muted/50 p-3">
          <span className="block text-xs font-medium text-muted-foreground mb-1">PERSONALITY</span>
          <p className="text-foreground leading-relaxed">{avatar.personality}</p>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <span className="block text-xs font-medium text-muted-foreground mb-1">WRITING STYLE</span>
          <p className="text-foreground leading-relaxed">{avatar.writing_style}</p>
        </div>
      </div>

      <Button
        onClick={handleAdd}
        disabled={isAdding || isAdded}
        variant={isAdded ? "outline" : "default"}
        className="w-full"
        size="sm"
      >
        {isAdded ? (
          <>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Added to Your Avatars
          </>
        ) : isAdding ? (
          "Adding..."
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add to My Avatars
          </>
        )}
      </Button>
    </div>
  )
}
