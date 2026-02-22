'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePosts } from "@/hooks/use-posts"
import { useProfile } from "@/hooks/use-profile"
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { PostCard } from "@/components/post-card"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  BarChart3,
  Coins,
  Globe,
  Linkedin,
  PenSquare,
  Sparkles,
  TrendingUp,
  Users,
  Twitter,
} from "lucide-react"

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b"]

export default function DashboardPage() {
  const { posts, isLoading: postsLoading } = usePosts()
  const { profile } = useProfile()
  const { analytics, isLoading: analyticsLoading } = useDashboardAnalytics()

  if (postsLoading || analyticsLoading || !analytics) {
    return <DashboardSkeleton />
  }

  const greetingName = profile?.full_name?.trim() || "there"
  const totalPosts = analytics.totals.posts
  const publishMix = [
    { name: "LinkedIn", value: analytics.totals.postedToLinkedin },
    { name: "X", value: analytics.totals.postedToX },
    {
      name: "Drafts",
      value: Math.max(0, totalPosts - analytics.totals.postedToLinkedin - analytics.totals.postedToX),
    },
  ]

  return (
    <div className="space-y-8 p-2 sm:p-4 md:p-6">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-sky-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {greetingName}</h1>
            <p className="mt-2 text-muted-foreground">Create, publish, and track persona-based content across LinkedIn and X.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/generate">
                <PenSquare className="mr-2 h-4 w-4" />
                Create Post
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/dashboard/personas">
                <Sparkles className="mr-2 h-4 w-4" />
                Explore Personas
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Posts</CardDescription>
            <CardTitle className="text-3xl">{analytics.totals.posts}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Last 30 days: {analytics.totals.posts30d}</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Personas</CardDescription>
            <CardTitle className="text-3xl">{analytics.totals.personas}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Public: {analytics.totals.publicPersonas}</span>
            <Users className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Coin Balance</CardDescription>
            <CardTitle className="text-3xl">{analytics.totals.coins}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Spent 30d: {analytics.totals.coinsSpent30d}</span>
            <Coins className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connected Channels</CardDescription>
            <CardTitle className="text-3xl">
              {Number(analytics.connections.linkedin) + Number(analytics.connections.x)} / 2
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge variant={analytics.connections.linkedin ? "default" : "secondary"}>
              <Linkedin className="mr-1 h-3 w-3" /> LinkedIn
            </Badge>
            <Badge variant={analytics.connections.x ? "default" : "secondary"}>
              <Twitter className="mr-1 h-3 w-3" /> X
            </Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Publishing Activity (7 days)
            </CardTitle>
            <CardDescription>How often you are creating content this week.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.weeklySeries}>
                <defs>
                  <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#postsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Publish Mix
            </CardTitle>
            <CardDescription>Where your posts are ending up.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={publishMix} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} label>
                  {publishMix.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Your latest generated content</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/history">View history</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.slice(0, 3).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No posts yet. Generate your first one.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Snapshot</CardTitle>
            <CardDescription>Simple view of momentum this week</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
