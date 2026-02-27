'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { BarChart3, Clock3, Coins, History, Linkedin, Settings, Sparkles } from "lucide-react"

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
  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="metric-mono text-2xl sm:text-3xl">{pending.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Needs your approval before any posting.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Scheduled Queue</CardDescription>
            <CardTitle className="metric-mono text-2xl sm:text-3xl">{scheduled.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Top queue item publishes first.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Published (LinkedIn)</CardDescription>
            <CardTitle className="metric-mono text-2xl sm:text-3xl">{posted.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">Live completed posts and archive-ready history.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 p-4">
            <CardDescription>Credits</CardDescription>
            <CardTitle className="metric-mono text-2xl sm:text-3xl">{profile?.coins ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-muted-foreground">{(profile?.coins ?? 0) < 10 ? "Low credits, consider topping up." : "Healthy credit balance."}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Next in Queue
            </CardTitle>
            <CardDescription>These are the next posts to be published, in exact order.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {nextQueued.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Queue is empty. Approve drafts in Review Queue to start scheduling.
              </div>
            ) : (
              <div className="space-y-3">
                {nextQueued.map((post: any, index: number) => (
                  <div key={post.id} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="metric-mono">#{index + 1}</Badge>
                        <p className="font-medium line-clamp-1">{post.topic}</p>
                      </div>
                      <Badge variant="outline">
                        LinkedIn
                      </Badge>
                    </div>
                    <p className="metric-mono text-xs text-muted-foreground">
                      {post.scheduled_for ? `Scheduled: ${new Date(post.scheduled_for).toLocaleString()}` : "Time will be auto-assigned"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle>Account Health</CardTitle>
            <CardDescription>LinkedIn automation status and quick tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile?.linkedin_connected ? "default" : "secondary"}>
                <Linkedin className="mr-1 h-3.5 w-3.5" /> LinkedIn
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
              <Button asChild variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/dashboard/profile-analysis">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze LinkedIn Performance
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
