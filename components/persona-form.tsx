"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { mutate } from "swr"
import { CACHE_KEYS } from "@/lib/cache-keys"

interface Persona {
    id: string
    name: string
    title: string | null
    personality: string
    writing_style: string
    avatar_url: string | null
}

export function PersonaForm({ persona, onSuccess }: { persona?: Persona; onSuccess?: () => void }) {
    const [name, setName] = useState(persona?.name || "")
    const [title, setTitle] = useState(persona?.title || "")
    const [personality, setPersonality] = useState(persona?.personality || "")
    const [writingStyle, setWritingStyle] = useState(persona?.writing_style || "")
    const [avatarUrl, setAvatarUrl] = useState(persona?.avatar_url || "")
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
            if (persona) {
                // Update existing persona
                const { error } = await supabase
                    .from("personas")
                    .update({
                        name,
                        title: title || null,
                        personality,
                        writing_style: writingStyle,
                        avatar_url: avatarUrl || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", persona.id)

                if (error) throw error
            } else {
                // Create new persona
                const { error } = await supabase.from("personas").insert({
                    user_id: user.id,
                    name,
                    title: title || null,
                    personality,
                    writing_style: writingStyle,
                    avatar_url: avatarUrl || null,
                    is_public: false,
                    is_app_provided: false,
                })

                if (error) throw error
            }

            // Invalidate cache
            await mutate(CACHE_KEYS.personas)

            if (onSuccess) {
                onSuccess()
            } else {
                router.push("/dashboard/personas")
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
                        <Label htmlFor="name">Persona Name *</Label>
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
                            Define the character traits that will influence how this persona communicates
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
                        <p className="text-xs text-muted-foreground">Specify how this persona should write and structure content</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatarUrl">Persona Image URL</Label>
                        <Input
                            id="avatarUrl"
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Optional: Add a profile image for this persona</p>
                    </div>
                </div>
            </div>

            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} size="lg">
                    {isLoading ? (persona ? "Updating..." : "Creating...") : persona ? "Update Persona" : "Create Persona"}
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

// Legacy export for backwards compatibility
export { PersonaForm as AvatarForm }
