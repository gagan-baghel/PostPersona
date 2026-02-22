'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { CalendarDays, CheckCircle2, Clock3, Coins, History, Linkedin, PenSquare, Settings, Sparkles, Twitter } from "lucide-react"

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

export default function DashboardPage() {
  const { posts, isLoading: postsLoading } = usePosts()
  const { profile, isLoading: profileLoading } = useProfile()

  if (postsLoading || profileLoading) {
    return <DashboardSkeleton />
  }

  const pending = posts.filter((p: any) => (p.workflow_status ?? "draft") === "review")
  const scheduled = posts
    .filter((p: any) => (p.workflow_status ?? "draft") === "scheduled")
    .sort((a: any, b: any) => {
      const aq = isNumber(a.queue_position) ? a.queue_position : Number.MAX_SAFE_INTEGER
      const bq = isNumber(b.queue_position) ? b.queue_position : Number.MAX_SAFE_INTEGER
      if (aq !== bq) return aq - bq
      return (a.scheduled_for ?? 0) - (b.scheduled_for ?? 0)
    })
  const posted = posts.filter((p: any) => (p.workflow_status ?? "draft") === "posted")

  const nextQueued = scheduled.slice(0, 5)
  const firstName = profile?.full_name?.trim()?.split(" ")?.[0] || "Creator"

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <Card className="bg-gradient-to-br from-primary/10 via-background to-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-3xl">{firstName}, this is your content control room</CardTitle>
          <CardDescription>
            One clear workflow: generate drafts, approve queue, and let scheduled posts publish in order.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/generate">
              <PenSquare className="mr-2 h-4 w-4" />
              Open Studio
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/dashboard/review">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Open Review Queue
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/dashboard/calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              Open Calendar
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">{pending.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Needs your approval before any posting.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled Queue</CardDescription>
            <CardTitle className="text-3xl">{scheduled.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Top queue item publishes first.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl">{posted.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Posts completed and moved to history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credits</CardDescription>
            <CardTitle className="text-3xl">{profile?.coins ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(profile?.coins ?? 0) < 10 ? "Low credits, consider topping up." : "Healthy credit balance."}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Next in Queue
            </CardTitle>
            <CardDescription>These are the next posts to be published, in exact order.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextQueued.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Queue is empty. Approve drafts in Review Queue to start scheduling.
              </div>
            ) : (
              <div className="space-y-3">
                {nextQueued.map((post: any, index: number) => (
                  <div key={post.id} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <p className="font-medium line-clamp-1">{post.topic}</p>
                      </div>
                      <Badge variant="outline">
                        {post.target_platform === "x" ? "X" : post.target_platform === "both" ? "LinkedIn + X" : "LinkedIn"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {post.scheduled_for ? `Scheduled: ${new Date(post.scheduled_for).toLocaleString()}` : "Time will be auto-assigned"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Health</CardTitle>
            <CardDescription>Connection status and quick tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile?.linkedin_connected ? "default" : "secondary"}>
                <Linkedin className="mr-1 h-3.5 w-3.5" /> LinkedIn
              </Badge>
              <Badge variant={profile?.x_connected ? "default" : "secondary"}>
                <Twitter className="mr-1 h-3.5 w-3.5" /> X
              </Badge>
            </div>

            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/personas">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Manage Personas
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/history">
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/coins">
                  <Coins className="mr-2 h-4 w-4" />
                  Manage Credits
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Posting Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
