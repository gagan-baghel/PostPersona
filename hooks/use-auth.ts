'use client'

import useSWR from 'swr'

interface SessionData {
  userId: string
}

interface User {
  id: string
  email: string
  full_name: string | null
  coins?: number
}

interface AuthData {
  user: User | null
  session: SessionData | null
  isLoading: boolean
  error: Error | undefined
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { method: 'GET' })
  if (!response.ok) throw new Error('Failed to fetch session')
  return response.json()
}

export function useAuth(): AuthData {
  const { data, error, isLoading } = useSWR('/api/auth/session', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isLoading,
    error,
  }
}
