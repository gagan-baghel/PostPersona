'use client'

import { PostCard } from "@/components/post-card"
import { usePosts } from "@/hooks/use-posts"
import { PostHistorySkeleton } from "@/components/skeletons/post-history-skeleton"

export default function HistoryPage() {
  const { posts, isLoading } = usePosts()

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Post History</h1>
          <p className="mt-2 text-muted-foreground">View your complete content archive with posts and images</p>
        </div>
        <PostHistorySkeleton />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Post History</h1>
        <p className="mt-2 text-muted-foreground">View your complete content archive with posts and images</p>
      </div>

      {posts && posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => (
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
        </div>
      )}
    </div>
  )
}
