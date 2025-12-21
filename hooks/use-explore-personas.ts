'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'
import type { Persona } from './use-personas'

interface ExplorePersonasData {
    explorePersonas: Persona[]
    isLoading: boolean
    error: Error | undefined
    refetch: () => Promise<void>
}

export function useExplorePersonas(): ExplorePersonasData {
    const { user } = useAuth()

    const { data, error, isLoading } = useSWR(
        user ? CACHE_KEYS.explorePersonas : null,
        async () => {
            const supabase = createClient()

            // Fetch personas that are either app-provided OR public
            // AND not owned by the current user (unless app-provided)
            const { data: personas } = await supabase
                .from('personas')
                .select('*')
                .or('is_app_provided.eq.true,is_public.eq.true')
                .order('is_app_provided', { ascending: false }) // App-provided first
                .order('created_at', { ascending: false })

            // Filter out user's own personas (except app-provided ones)
            return personas ?? []
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000, // 15s cache
        }
    )

    const refetch = async () => {
        await mutate(CACHE_KEYS.explorePersonas)
    }

    return {
        explorePersonas: data ?? [],
        isLoading,
        error,
        refetch,
    }
}

// Legacy export for backwards compatibility
export { useExplorePersonas as useExploreAvatars }
