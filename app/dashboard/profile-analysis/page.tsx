"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Search, TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"

type AnalysisPost = {
  id: string
  topic: string
  content: string
  publishedAt: number
  likes: number
  comments: number
  reposts: number
  impressions: number
  isEstimatedImpressions: boolean
  engagementScore: number
  engagementRate: number
}

type AnalysisResponse = {
  success: boolean
  warning?: string | null
  query: string
  profile: {
    name: string
    headline: string
    avatarUrl: string | null
    linkedInId: string | null
  }
  summary: {
    totalPosts: number
    totalLikes: number
    totalComments: number
    totalReposts: number
    totalImpressions: number
    avgEngagementRate: number
  }
  posts: {
    top: AnalysisPost[]
    recent: AnalysisPost[]
  }
  charts: {
    trend: Array<{
      index: number
      timestamp: number
      dateLabel: string
      engagementScore: number
      likes: number
      comments: number
    }>
    scatter: Array<{
      x: number
      y: number
      id: string
      topic: string
      content: string
      likes: number
      comments: number
      reposts: number
      impressions: number
      engagementRate: number
      dateLabel: string
    }>
  }
  insights: string[]
}

function formatCompact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString()
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null
  const p = payload[0].payload
  return (
    <div className="max-w-xs rounded-md border bg-background p-3 text-xs shadow-md">
      <p className="line-clamp-2 font-semibold">{p.topic}</p>
      <p className="mt-1 text-muted-foreground">{p.dateLabel}</p>
      <p className="mt-2 line-clamp-4">{p.content}</p>
      <div className="my-2 h-px bg-border" />
      <div className="grid grid-cols-2 gap-1">
        <span>Likes: {p.likes}</span>
        <span>Comments: {p.comments}</span>
        <span>Reposts: {p.reposts}</span>
        <span>ER: {p.engagementRate}%</span>
      </div>
    </div>
  )
}

export default function ProfileAnalysisPage() {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("me")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalysisResponse | null>(null)

  const fetchAnalysis = async (q: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/profile-analysis?q=${encodeURIComponent(q || "me")}`, {
        cache: "no-store",
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || "Failed to analyze profile")
      setData(json)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Failed to analyze profile")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis("me")
  }, [])

  const topPost = useMemo(() => (data?.posts?.top ?? [])[0] ?? null, [data?.posts?.top])

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Profile Analysis"
        description="Search and inspect post-level performance. Hover dots for full post context."
        rightSlot={
          <div className="flex w-full gap-2 sm:w-[420px]">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="LinkedIn name / URL / me"
          />
          <Button
            onClick={() => {
              const next = input.trim() || "me"
              setQuery(next)
              fetchAnalysis(next)
            }}
          >
            <Search className="mr-2 h-4 w-4" />
            Analyze
          </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : error ? (
        <EmptyState
          title="Analysis Failed"
          description={error}
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
        />
      ) : data ? (
        <>
          {data.warning ? (
            <Card className="border-amber-500/40">
              <CardContent className="p-4 text-sm text-amber-200">{data.warning}</CardContent>
            </Card>
          ) : null}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Profile</CardDescription>
                <CardTitle className="line-clamp-1 text-lg">{data.profile.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{data.profile.headline}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total analyzed posts</CardDescription>
                <CardTitle>{data.summary.totalPosts}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Query: {query}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Engagement totals</CardDescription>
                <CardTitle>{formatCompact(data.summary.totalLikes + data.summary.totalComments + data.summary.totalReposts)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Likes {formatCompact(data.summary.totalLikes)} | Comments {formatCompact(data.summary.totalComments)} | Reposts {formatCompact(data.summary.totalReposts)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average engagement rate</CardDescription>
                <CardTitle>{data.summary.avgEngagementRate}%</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Based on analyzed post set</CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Engagement Scatter (Post-level)
                </CardTitle>
                <CardDescription>
                  Each dot is one post. Hover to inspect topic, content, and metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[260px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(v) => new Date(v).toLocaleDateString()}
                    />
                    <YAxis dataKey="y" type="number" name="Engagement score" />
                    <RechartsTooltip content={<ScatterTooltip />} />
                    <Scatter data={data.charts.scatter} fill="var(--color-chart-1)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Best Post</CardTitle>
                <CardDescription>Highest engagement score</CardDescription>
              </CardHeader>
              <CardContent>
                {topPost ? (
                  <div className="space-y-2">
                    <p className="line-clamp-2 font-medium">{topPost.topic}</p>
                    <p className="line-clamp-6 text-sm text-muted-foreground">{topPost.content}</p>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <Badge variant="secondary">Likes: {topPost.likes}</Badge>
                      <Badge variant="secondary">Comments: {topPost.comments}</Badge>
                      <Badge variant="secondary">ER: {topPost.engagementRate}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(topPost.publishedAt)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No posts available yet.</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Trend Over Time</CardTitle>
                <CardDescription>Engagement score progression by publish order</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="index" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="engagementScore" stroke="var(--color-chart-2)" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Insights</CardTitle>
                <CardDescription>Automated findings from post analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.insights.map((insight, idx) => (
                  <div key={`insight-${idx}`} className="rounded-md border p-2 text-sm">
                    {insight}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Performing Posts</CardTitle>
                <CardDescription>Sorted by engagement score</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.posts.top.map((post) => (
                  <div key={post.id} className="rounded-md border p-3">
                    <p className="line-clamp-1 font-medium">{post.topic}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <Badge variant="outline">Score: {post.engagementScore}</Badge>
                      <Badge variant="outline">Likes: {post.likes}</Badge>
                      <Badge variant="outline">Comments: {post.comments}</Badge>
                      <Badge variant="outline">Impr: {formatCompact(post.impressions)}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Posts</CardTitle>
                <CardDescription>Latest analyzed posts with metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.posts.recent.map((post) => (
                  <div key={post.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 font-medium">{post.topic}</p>
                      <span className="text-xs text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <Badge variant="secondary">ER: {post.engagementRate}%</Badge>
                      <Badge variant="secondary">Likes: {post.likes}</Badge>
                      <Badge variant="secondary">Comments: {post.comments}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  )
}
