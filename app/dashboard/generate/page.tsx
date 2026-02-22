'use client'

import { PostGenerator } from "@/components/post-generator"
import { usePersonas } from "@/hooks/use-personas"
import { useAuth } from "@/hooks/use-auth"
import { PersonaGridSkeleton } from "@/components/skeletons/persona-grid-skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GeneratePage() {
  const { user } = useAuth()
  const { personas, isLoading } = usePersonas()

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Generate Post</h1>
          </div>
          <PersonaGridSkeleton />
        </div>
      </div>
    )
  }

  const userPersonas = personas.filter((p) => p.user_id === user?.id) || []

  if (!userPersonas.length) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Generate Post</h1>
          </div>

          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
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
            <h2 className="mt-6 text-xl font-semibold">No AI Personas Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first AI persona to start generating personalized social posts.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/personas">Create Persona</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-4">
          <div className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Generate Post</h1>
          </div>
          <PostGenerator avatars={userPersonas} selectedAvatar={null} />
        </div>

        <aside className="xl:col-span-1">
          <div className="space-y-2 xl:sticky xl:top-4">
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/review?scheduleWeek=1">Schedule Week</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/review">Open Review Queue</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/dashboard/calendar">Open Calendar</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
