// Cache keys for SWR data fetching
export const CACHE_KEYS = {
    user: '/api/user',
    coins: '/api/user/coins',
    personas: '/api/personas',
    explorePersonas: '/api/personas/explore',
    posts: (page = 1) => `/api/posts?page=${page}`,
    // Legacy keys for backwards compatibility during migration
    avatars: '/api/personas',
    exploreAvatars: '/api/personas/explore',
    suggestedAvatars: '/api/personas/suggested',
} as const
