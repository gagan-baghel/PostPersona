'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface Profile {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
    coins: number
    created_at: string
    updated_at: string
}

interface ProfileData {
    profile: Profile | null
    isLoading: boolean
    error: Error | undefined
    refetch: () => Promise<void>
}

export function useProfile(): ProfileData {
    const { user } = useAuth()

    const { data, error, isLoading } = useSWR(
        user ? CACHE_KEYS.user : null,
        async () => {
            const supabase = createClient()
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single()

            return profile
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30s - profile doesn't change often
        }
    )

    const refetch = async () => {
        await mutate(CACHE_KEYS.user)
    }

    return {
        profile: data ?? null,
        isLoading,
        error,
        refetch,
    }
}
