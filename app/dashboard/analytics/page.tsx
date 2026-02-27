"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { BarChart3 } from "lucide-react"

type AnalyticsData = {
  summary: {
    totalPosts: number
    campaignCount: number
    postedCount: number
    deadLetterCount: number
    retryingCount: number
    avgAttempts: number
    publishSuccessRate: number
    deadLetterRate: number
  }
  series30d: Array<{ date: string; created: number; posted: number; deadLetter: number }>
  topFailureReasons: Array<{ reason: string; count: number }>
}

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/analytics/advanced", { cache: "no-store" })
        const json = await response.json().catch(() => null)
        if (response.ok && json) setData(json)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3 p-1 sm:p-2 md:p-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-2 sm:p-3 md:p-4">
        <EmptyState
          title="Analytics Unavailable"
          description="Try refreshing. If this keeps happening, verify your session and data access."
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <PageHeader
        title="Advanced Analytics"
        description="Reliability, throughput, dead-letter trends, and publish quality signals."
        rightSlot={<Badge variant="secondary">Success rate: {data.summary.publishSuccessRate}%</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total posts</CardDescription><CardTitle className="metric-mono">{data.summary.totalPosts}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Campaigns</CardDescription><CardTitle className="metric-mono">{data.summary.campaignCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Dead letter</CardDescription><CardTitle className="metric-mono">{data.summary.deadLetterCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Avg attempts</CardDescription><CardTitle className="metric-mono">{data.summary.avgAttempts}</CardTitle></CardHeader></Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>30-Day Throughput</CardTitle>
            <CardDescription>Created vs posted vs dead-letter trend</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series30d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line dataKey="created" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                <Line dataKey="posted" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                <Line dataKey="deadLetter" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Top Failure Reasons</CardTitle>
            <CardDescription>Dead-letter error clustering</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topFailureReasons}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="reason" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-chart-4)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
