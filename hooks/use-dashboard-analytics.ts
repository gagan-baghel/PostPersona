'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface AnalyticsData {
  totals: {
    posts: number
    personas: number
    publicPersonas: number
    posts30d: number
    postedToLinkedin: number
    postedToX: number
    coins: number
    coinsSpent30d: number
  }
  weeklySeries: Array<{ date: string; count: number }>
  connections: {
    linkedin: boolean
    x: boolean
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch dashboard analytics')
  return response.json()
}

export function useDashboardAnalytics() {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR<AnalyticsData>(user ? CACHE_KEYS.dashboardAnalytics : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  })

  const refetch = async () => {
    await mutate(CACHE_KEYS.dashboardAnalytics)
  }

  return {
    analytics: data,
    isLoading,
    error,
    refetch,
  }
}
