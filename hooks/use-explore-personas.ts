'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'
import type { Persona } from './use-personas'

interface ExplorePersonasData {
  explorePersonas: Persona[]
  isLoading: boolean
  error: Error | undefined
  refetch: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch explore personas')
  return response.json()
}

export function useExplorePersonas(): ExplorePersonasData {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(user ? CACHE_KEYS.explorePersonas : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  })

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
