'use client'

import useSWR, { mutate } from 'swr'
import { CACHE_KEYS } from '@/lib/cache-keys'
import { useAuth } from './use-auth'

export interface Persona {
  id: string
  user_id: string
  name: string
  title: string | null
  personality: string
  writing_style: string
  training_posts?: string[]
  avatar_url: string | null
  is_suggested: boolean
  is_public?: boolean
  is_app_provided?: boolean
  original_persona_id?: string | null
  created_at: string
  updated_at: string
}

interface PersonasData {
  personas: Persona[]
  isLoading: boolean
  error: Error | undefined
  refetch: () => Promise<void>
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch personas')
  return response.json()
}

export function usePersonas(): PersonasData {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(user ? CACHE_KEYS.personas : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  })

  const refetch = async () => {
    await mutate(CACHE_KEYS.personas)
  }

  return {
    personas: data ?? [],
    isLoading,
    error,
    refetch,
  }
}
