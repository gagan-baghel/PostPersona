'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
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

export function usePosts(page = 1): PostsData {
    const { user } = useAuth()

    const { data, error, isLoading } = useSWR(
        user ? CACHE_KEYS.posts(page) : null,
        async () => {
            const supabase = createClient()
            const { data: posts } = await supabase
                .from('posts')
                .select(`
                    *,
                    personas:persona_id (
                        id,
                        name,
                        title,
                        avatar_url
                    )
                `)
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false })
                .range((page - 1) * 20, page * 20 - 1)

            return posts ?? []
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 10000,
        }
    )

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
