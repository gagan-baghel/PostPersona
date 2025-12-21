'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthData {
    user: User | null
    session: Session | null
    isLoading: boolean
    error: Error | undefined
}

export function useAuth(): AuthData {
    const { data, error, isLoading } = useSWR(
        '/api/auth/session',
        async () => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            return session
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute - session doesn't change often
        }
    )

    return {
        user: data?.user ?? null,
        session: data ?? null,
        isLoading,
        error,
    }
}
