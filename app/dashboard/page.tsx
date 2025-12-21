'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePersonas } from "@/hooks/use-personas"
import { usePosts } from "@/hooks/use-posts"
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton"
import { PostCard } from "@/components/post-card"
import { Newspaper } from "lucide-react"

export default function DashboardPage() {
  const { personas, isLoading: personasLoading } = usePersonas()
  const { posts, isLoading: postsLoading } = usePosts()

  if (personasLoading || postsLoading) {
    return <DashboardSkeleton />
  }

  const personaCount = personas.length
  const postCount = posts.length

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome back! Ready to create amazing content?</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Personas</p>
              <p className="mt-2 text-3xl font-bold">{personaCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
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
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Posts Created</p>
              <p className="mt-2 text-3xl font-bold">{postCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">This Month</p>
              <p className="mt-2 text-3xl font-bold">{postCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10">
              <svg
                className="h-6 w-6 text-chart-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / History */}
      <div className="rounded-lg bg-background">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Recent Posts
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/history">View All</Link>
          </Button>
        </div>

        {posts && posts.length > 0 ? (
          <div className="space-y-6">
            {posts.slice(0, 5).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold">No posts yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Generate your first post to see it here</p>
            <Button asChild className="mt-6" size="lg">
              <Link href="/dashboard/generate">Create Your First Post</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
