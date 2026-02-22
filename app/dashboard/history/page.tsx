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
    return posts.filter((post) => {
      const matchText =
        post.topic.toLowerCase().includes(lower) ||
        post.content.toLowerCase().includes(lower) ||
        post.personas?.name.toLowerCase().includes(lower)

      const matchPlatform =
        platform === "all" ||
        (platform === "linkedin" && post.posted_to_linkedin) ||
        (platform === "x" && post.posted_to_x) ||
        (platform === "drafts" && !post.posted_to_linkedin && !post.posted_to_x)

      return matchText && matchPlatform
    })
  }, [posts, query, platform])

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Post History</h1>
          <p className="mt-2 text-muted-foreground">View and manage your complete content archive.</p>
        </div>
        <PostHistorySkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post History</h1>
        <p className="mt-2 text-muted-foreground">Search, filter, and reuse your generated posts.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="Search topic, content, persona" />
        </div>
        <Tabs value={platform} onValueChange={setPlatform}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            <TabsTrigger value="x">X</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-6">
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
