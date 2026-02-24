'use client'

import { PostGenerator } from "@/components/post-generator"
import { usePersonas } from "@/hooks/use-personas"
import { useAuth } from "@/hooks/use-auth"
import { PersonaGridSkeleton } from "@/components/skeletons/persona-grid-skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { Sparkles } from "lucide-react"

export default function GeneratePage() {
  const { user } = useAuth()
  const { personas, isLoading } = usePersonas()

  if (isLoading) {
    return (
      <div className="space-y-3 p-2 sm:p-3 md:p-4">
        <PageHeader title="Studio" description="Create one post quickly, then route it to schedule." />
        <PersonaGridSkeleton />
      </div>
    )
  }

  const userPersonas = personas.filter((p) => p.user_id === user?.id) || []

  if (!userPersonas.length) {
    return (
      <div className="space-y-3 p-2 sm:p-3 md:p-4">
        <PageHeader title="Studio" description="Create one post quickly, then route it to schedule." />
        <EmptyState
          title="No Personas Yet"
          description="Create your first persona to unlock post generation."
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          actionLabel="Create Persona"
          actionHref="/dashboard/personas"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 p-2 sm:p-3 md:p-4">
      <PageHeader
        title="Studio"
        description="Step 1/3: Generate draft. Step 2/3: Review. Step 3/3: Auto-publish."
        rightSlot={
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/dashboard/review?scheduleWeek=1">Schedule Week</Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">1. Generate</Badge>
        <Badge variant="outline">2. Review</Badge>
        <Badge variant="outline">3. Publish</Badge>
      </div>
      <PostGenerator avatars={userPersonas} selectedAvatar={null} />
    </div>
  )
}
