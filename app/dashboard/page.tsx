'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { useSetupSteps } from "@/hooks/use-setup-steps"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  Circle,
  Clock3,
  IdCard,
  Lightbulb,
  MessageSquareText,
  PenSquare,
  Target,
  UserPlus,
} from "lucide-react"

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
}

const quickTools = [
  { tool: "headline", title: "Sharpen your headline", hint: "5 options that say who you help", icon: IdCard },
  { tool: "ideas", title: "Get 10 post ideas", hint: "Tailored to your niche", icon: Lightbulb },
  { tool: "comment", title: "Draft a smart comment", hint: "Add value on someone's post", icon: MessageSquareText },
  { tool: "connect", title: "Write a connection note", hint: "Warm, specific, no pitch", icon: UserPlus },
]

export default function DashboardPage() {
  const { posts, isLoading: postsLoading } = usePosts()
  const { profile, isLoading: profileLoading } = useProfile()
  const { steps, doneCount, score } = useSetupSteps()

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
  const firstName = (profile?.full_name || "").split(" ")[0]
  const engine = profile?.ai_engines?.find((e) => e.id === profile?.ai_engine)

  const stats = [
    { label: "Waiting for review", value: pending.length, href: "/dashboard/review", hint: "Nothing posts without your OK" },
    { label: "Scheduled", value: scheduled.length, href: "/dashboard/calendar", hint: "Top of queue publishes first" },
    { label: "Published", value: posted.length, href: "/dashboard/profile-analysis", hint: "See what resonated" },
    {
      label: engine?.local ? `AI · ${engine.label}` : "Credits",
      value: engine?.local ? "Free" : profile?.coins ?? 0,
      href: engine?.local ? "/dashboard/settings#ai" : "/dashboard/coins",
      hint: engine?.local ? "Drafts run on your subscription" : (profile?.coins ?? 0) < 10 ? "Running low, top up" : "Healthy balance",
    },
  ]

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything for your LinkedIn, in one place.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard/generate">
              <PenSquare className="mr-2 h-4 w-4" />
              Write a post
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/dashboard/campaigns">
              <Target className="mr-2 h-4 w-4" />
              Plan my week
            </Link>
          </Button>
        </div>
      </section>

      {doneCount < steps.length ? (
        <Card className="border-primary/30">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Get LinkedIn on autopilot</CardTitle>
                <CardDescription>
                  {doneCount} of {steps.length} done
                </CardDescription>
              </div>
              <Badge variant="secondary" className="metric-mono">{score}%</Badge>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${score}%` }} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-2 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "group rounded-lg border p-3 transition-colors",
                  step.done ? "border-emerald-400/25 bg-emerald-500/5" : "hover:border-primary/50 hover:bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2">
                  {step.done ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>{step.label}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.hint}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="metric-mono mt-1 text-2xl font-semibold sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Next in queue
            </CardTitle>
            <CardDescription>These go live next, in this order.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {nextQueued.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                Your queue is empty.{" "}
                <Link href={pending.length ? "/dashboard/review" : "/dashboard/generate"} className="text-primary underline-offset-4 hover:underline">
                  {pending.length ? `Review ${pending.length} waiting draft${pending.length === 1 ? "" : "s"}` : "Write your next post"}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {nextQueued.map((post: any, index: number) => (
                  <div key={post.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Badge variant="secondary" className="metric-mono shrink-0">#{index + 1}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-medium">{post.topic}</p>
                      <p className="metric-mono text-xs text-muted-foreground">
                        {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "Time auto-assigned"}
                      </p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/dashboard/review">
                    Manage queue <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle>Grow faster</CardTitle>
            <CardDescription>One-click tools for your profile and network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {quickTools.map(({ tool, title, hint, icon: Icon }) => (
              <Link
                key={tool}
                href={`/dashboard/toolkit?tool=${tool}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/12">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            <Button asChild variant="outline" size="sm" className="w-full bg-transparent">
              <Link href="/dashboard/profile-analysis">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze my LinkedIn performance
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
