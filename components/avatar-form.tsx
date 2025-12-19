"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Avatar {
  id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  avatar_url: string | null
}

export function AvatarForm({ avatar, onSuccess }: { avatar?: Avatar; onSuccess?: () => void }) {
  const [name, setName] = useState(avatar?.name || "")
  const [title, setTitle] = useState(avatar?.title || "")
  const [personality, setPersonality] = useState(avatar?.personality || "")
  const [writingStyle, setWritingStyle] = useState(avatar?.writing_style || "")
  const [avatarUrl, setAvatarUrl] = useState(avatar?.avatar_url || "")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("You must be logged in")
      setIsLoading(false)
      return
    }

    try {
      if (avatar) {
        // Update existing avatar
        const { error } = await supabase
          .from("avatars")
          .update({
            name,
            title: title || null,
            personality,
            writing_style: writingStyle,
            avatar_url: avatarUrl || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", avatar.id)

        if (error) throw error
      } else {
        // Create new avatar
        const { error } = await supabase.from("avatars").insert({
          user_id: user.id,
          name,
          title: title || null,
          personality,
          writing_style: writingStyle,
          avatar_url: avatarUrl || null,
          avatar_type: "user_created",
        })

        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard/avatars")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Avatar Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Professional Sarah, Tech Expert Mike"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title / Role</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Senior Product Manager, AI Researcher"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality *</Label>
            <Textarea
              id="personality"
              placeholder="Describe the personality traits, tone, and approach. E.g., Thoughtful, analytical, empathetic, direct, humorous..."
              required
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Define the character traits that will influence how this avatar communicates
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="writingStyle">Writing Style *</Label>
            <Textarea
              id="writingStyle"
              placeholder="Describe the writing style. E.g., Clear and concise, uses storytelling, includes data and examples, conversational..."
              required
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Specify how this avatar should write and structure content</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar Image URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional: Add a profile image for this avatar</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? (avatar ? "Updating..." : "Creating...") : avatar ? "Update Avatar" : "Create Avatar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => (onSuccess ? onSuccess() : router.back())}
          className="bg-transparent"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
