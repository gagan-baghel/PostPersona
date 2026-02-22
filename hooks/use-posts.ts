'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface Post {
  id: string
  user_id: string
  persona_id: string | null
  topic: string
  content: string
  image_url: string | null
  image_prompt: string | null
  image_preset: string | null
  posted_to_linkedin: boolean
  posted_to_x: boolean
  posted_at: string | null
  created_at: string
  personas: {
    id: string
    name: string
    title: string | null
    avatar_url: string | null
  } | null
}

interface PostsData {
  posts: Post[]
  isLoading: boolean
  error: Error | undefined
  refetch: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch posts')
  return response.json()
}

export function usePosts(page = 1): PostsData {
  const { user } = useAuth()

  const key = user ? CACHE_KEYS.posts(page) : null
  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  })

  const refetch = async () => {
    await mutate(CACHE_KEYS.posts(page))
  }

  return {
    posts: data ?? [],
    isLoading,
    error,
    refetch,
  }
}
