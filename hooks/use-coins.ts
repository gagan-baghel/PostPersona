'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface CoinsData {
  coins: number
  isLoading: boolean
  error: Error | undefined
  mutateCoins: (newCoins: number) => Promise<void>
  deductCoins: (amount: number) => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch coins')
  return response.json()
}

export function useCoins(): CoinsData {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(
    user ? CACHE_KEYS.coins : null,
    async (url: string) => {
      const payload = await fetcher(url)
      return payload.coins ?? 0
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  )

  const mutateCoins = async (newCoins: number) => {
    await mutate(CACHE_KEYS.coins, newCoins, false)
  }

  const deductCoins = async (amount: number) => {
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
