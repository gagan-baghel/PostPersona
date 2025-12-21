'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface CoinsData {
    coins: number
    isLoading: boolean
    error: Error | undefined
    mutateCoins: (newCoins: number) => Promise<void>
    deductCoins: (amount: number) => Promise<void>
}

export function useCoins(): CoinsData {
    const { user } = useAuth()

    const { data, error, isLoading } = useSWR(
        user ? CACHE_KEYS.coins : null,
        async () => {
            const supabase = createClient()
            const { data: profile } = await supabase
                .from('profiles')
                .select('coins')
                .eq('id', user!.id)
                .single()

            return profile?.coins ?? 0
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    )

    const mutateCoins = async (newCoins: number) => {
        await mutate(CACHE_KEYS.coins, newCoins, false)
    }

    const deductCoins = async (amount: number) => {
        // Optimistic update
        const currentCoins = data ?? 0
        await mutate(CACHE_KEYS.coins, currentCoins - amount, false)
    }

    return {
        coins: data ?? 0,
        isLoading,
        error,
        mutateCoins,
        deductCoins,
    }
}
