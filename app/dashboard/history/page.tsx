'use client'

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PostCard } from "@/components/post-card"
import { usePosts } from "@/hooks/use-posts"
import { PostHistorySkeleton } from "@/components/skeletons/post-history-skeleton"
import Link from "next/link"
import { Search } from "lucide-react"

export default function HistoryPage() {
  const { posts, isLoading } = usePosts()
  const [query, setQuery] = useState("")
  const [platform, setPlatform] = useState("all")

  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim()
    return posts
      .filter((post) => {
        const status = post.workflow_status || "draft"
        return status === "posted" && Boolean(post.posted_at)
      })
      .filter((post) => {
      const matchText =
        post.topic.toLowerCase().includes(lower) ||
        post.content.toLowerCase().includes(lower) ||
        post.personas?.name.toLowerCase().includes(lower)

      const matchPlatform =
        platform === "all" ||
        (platform === "linkedin" && post.posted_to_linkedin)

        return matchText && matchPlatform
      })
  }, [posts, query, platform])

  if (isLoading) {
    return (
      <div className="p-2 sm:p-3 md:p-4">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Post History</h1>
          <p className="mt-1 text-muted-foreground">View and manage your complete content archive.</p>
        </div>
        <PostHistorySkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1 sm:p-2 md:p-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Post History</h1>
        <p className="mt-1 text-muted-foreground">Only successfully posted content appears here.</p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="Search topic, content, persona" />
        </div>
        <Tabs value={platform} onValueChange={setPlatform}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No posts found</h3>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search/filter, or generate new posts.</p>
          <Button asChild className="mt-4"><Link href="/dashboard/generate">Create Post</Link></Button>
        </div>
      )}
    </div>
  )
}
