'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  coins: number
  default_persona_public?: boolean
  allow_profile_in_explore?: boolean
  linkedin_connected?: boolean
  x_connected?: boolean
  x_username?: string | null
  created_at: number | string
  updated_at: number | string
}

interface ProfileData {
  profile: Profile | null
  isLoading: boolean
  error: Error | undefined
  refetch: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch profile')
  return response.json()
}

export function useProfile(): ProfileData {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(user ? CACHE_KEYS.user : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

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
