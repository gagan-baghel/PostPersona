import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

const DEFAULT_COINS = 100

const DEFAULT_PERSONAS = [
  {
    name: "Professional Voice",
    title: "Corporate Leader",
    personality:
      "Professional, polished, and authoritative. Values clarity, efficiency, and results. Speaks with confidence and expertise.",
    writing_style:
      "Clear and concise sentences. Uses data and facts. Professional tone with occasional strategic insights.",
    avatar_url: undefined,
  },
  {
    name: "Founder Voice",
    title: "Startup Entrepreneur",
    personality:
      "Visionary, ambitious, and inspiring. Passionate about innovation and building the future.",
    writing_style:
      "Storytelling approach. Personal anecdotes mixed with insights. Energetic and motivational.",
    avatar_url: undefined,
  },
  {
    name: "Thought Leader",
    title: "Industry Expert",
    personality:
      "Insightful, analytical, and forward-thinking. Challenges conventional wisdom and sparks meaningful discussions.",
    writing_style:
      "Deep-dive analysis. Uses frameworks and practical examples. Minimal fluff.",
    avatar_url: undefined,
  },
]

async function ensureDefaultPersonas(ctx: any) {
  const existing = await ctx.db
    .query("personas")
    .withIndex("by_app_provided", (q: any) => q.eq("is_app_provided", true))
    .take(1)

  if (existing.length > 0) return

  const now = Date.now()
  for (const persona of DEFAULT_PERSONAS) {
    await ctx.db.insert("personas", {
      ...persona,
      is_public: true,
      is_app_provided: true,
      created_at: now,
      updated_at: now,
    })
  }
}

export const getUserByEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).unique()
  },
})

export const getUserById = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId)
  },
})

export const createUser = mutationGeneric({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, { email, passwordHash, fullName }) => {
    const existing = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).unique()
    if (existing) {
      return { ok: false, error: "EMAIL_EXISTS" as const }
    }

    await ensureDefaultPersonas(ctx)

    const now = Date.now()
    const userId = await ctx.db.insert("users", {
      email,
      password_hash: passwordHash,
      full_name: fullName,
      created_at: now,
    })

    await ctx.db.insert("profiles", {
      user_id: userId,
      coins: DEFAULT_COINS,
      default_persona_public: false,
      allow_profile_in_explore: true,
      linkedin_connected: false,
      x_connected: false,
      created_at: now,
      updated_at: now,
    })

    return { ok: true, userId }
  },
})

export const getProfile = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
  },
})

export const updateProfile = mutationGeneric({
  args: {
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    defaultPersonaPublic: v.optional(v.boolean()),
    allowProfileInExplore: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, fullName, defaultPersonaPublic, allowProfileInExplore }) => {
    const user = await ctx.db.get(userId)
    if (!user) return { ok: false, error: "USER_NOT_FOUND" as const }

    await ctx.db.patch(userId, {
      full_name: fullName,
    })

    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (profile) {
      await ctx.db.patch(profile._id, {
        default_persona_public: defaultPersonaPublic ?? profile.default_persona_public ?? false,
        allow_profile_in_explore: allowProfileInExplore ?? profile.allow_profile_in_explore ?? true,
        updated_at: Date.now(),
      })
    }

    return { ok: true }
  },
})

export const listPersonas = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const personas = await ctx.db.query("personas").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    return personas.sort((a, b) => b.created_at - a.created_at)
  },
})

export const listExplorePersonas = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ensureDefaultPersonas(ctx)

    const [allPersonas, profiles] = await Promise.all([
      ctx.db.query("personas").collect(),
      ctx.db.query("profiles").collect(),
    ])
    const profileByUserId = new Map<string, any>()
    for (const profile of profiles) {
      profileByUserId.set(String(profile.user_id), profile)
    }

    const all = allPersonas.filter((p) => {
      if (p.is_app_provided || !p.user_id) return true
      if (String(p.user_id) === String(userId)) return true

      const ownerProfile = profileByUserId.get(String(p.user_id))
      return ownerProfile?.allow_profile_in_explore !== false
    })

    return all
      .filter((p) => p.is_app_provided || p.is_public)
      .filter((p) => p.is_app_provided || p.user_id !== userId)
      .sort((a, b) => {
        if (a.is_app_provided && !b.is_app_provided) return -1
        if (!a.is_app_provided && b.is_app_provided) return 1
        return b.created_at - a.created_at
      })
  },
})

export const getPersonaById = queryGeneric({
  args: {
    personaId: v.id("personas"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { personaId, userId }) => {
    const persona = await ctx.db.get(personaId)
    if (!persona) return null

    const canRead =
      persona.is_app_provided || persona.is_public || (userId ? persona.user_id === userId : false)

    return canRead ? persona : null
  },
})

export const createPersona = mutationGeneric({
  args: {
    userId: v.id("users"),
    name: v.string(),
    title: v.optional(v.string()),
    personality: v.string(),
    writing_style: v.string(),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const personaId = await ctx.db.insert("personas", {
      user_id: args.userId,
      name: args.name,
      title: args.title,
      personality: args.personality,
      writing_style: args.writing_style,
      avatar_url: args.avatar_url,
      is_public: false,
      is_app_provided: false,
      created_at: now,
      updated_at: now,
    })

    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", args.userId)).unique()
    if (profile?.default_persona_public) {
      await ctx.db.patch(personaId, { is_public: true, updated_at: now })
    }
    return { ok: true, personaId }
  },
})

export const updatePersona = mutationGeneric({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
    name: v.string(),
    title: v.optional(v.string()),
    personality: v.string(),
    writing_style: v.string(),
    avatar_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const persona = await ctx.db.get(args.personaId)
    if (!persona || persona.user_id !== args.userId || persona.is_app_provided) {
      return { ok: false, error: "FORBIDDEN" as const }
    }

    await ctx.db.patch(args.personaId, {
      name: args.name,
      title: args.title,
      personality: args.personality,
      writing_style: args.writing_style,
      avatar_url: args.avatar_url,
      updated_at: Date.now(),
    })

    return { ok: true }
  },
})

export const setPersonaVisibility = mutationGeneric({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, { userId, personaId, isPublic }) => {
    const persona = await ctx.db.get(personaId)
    if (!persona || persona.user_id !== userId || persona.is_app_provided) {
      return { ok: false, error: "FORBIDDEN" as const }
    }

    if (isPublic && persona.original_persona_id) {
      return { ok: false, error: "CLONED_CANNOT_PUBLISH" as const }
    }

    await ctx.db.patch(personaId, {
      is_public: isPublic,
      updated_at: Date.now(),
    })

    return { ok: true }
  },
})

export const deletePersona = mutationGeneric({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, { userId, personaId }) => {
    const persona = await ctx.db.get(personaId)
    if (!persona || persona.user_id !== userId || persona.is_app_provided) {
      return { ok: false, error: "FORBIDDEN" as const }
    }

    await ctx.db.delete(personaId)
    return { ok: true }
  },
})

export const clonePersona = mutationGeneric({
  args: {
    userId: v.id("users"),
    personaId: v.id("personas"),
  },
  handler: async (ctx, { userId, personaId }) => {
    const original = await ctx.db.get(personaId)
    if (!original) return { ok: false, error: "NOT_FOUND" as const }

    const canClone = original.is_app_provided || original.is_public
    if (!canClone) return { ok: false, error: "FORBIDDEN" as const }

    const alreadyOwned = await ctx.db
      .query("personas")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .collect()

    const hasClone = alreadyOwned.some((p) => p.original_persona_id === personaId)
    if (hasClone) return { ok: false, error: "ALREADY_CLONED" as const }

    const now = Date.now()
    const clonedId = await ctx.db.insert("personas", {
      user_id: userId,
      name: original.name,
      title: original.title,
      personality: original.personality,
      writing_style: original.writing_style,
      avatar_url: original.avatar_url,
      is_public: false,
      is_app_provided: false,
      original_persona_id: original._id,
      created_at: now,
      updated_at: now,
    })

    return { ok: true, personaId: clonedId }
  },
})

export const listPosts = queryGeneric({
  args: {
    userId: v.id("users"),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { userId, page = 1, pageSize = 20 }) => {
    const posts = await ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    const sorted = posts.sort((a, b) => b.created_at - a.created_at)
    const start = (page - 1) * pageSize
    const paged = sorted.slice(start, start + pageSize)

    const enriched = await Promise.all(
      paged.map(async (post) => {
        const persona = post.persona_id ? await ctx.db.get(post.persona_id) : null
        return {
          ...post,
          id: post._id,
          posted_to_linkedin: post.posted_to_linkedin ?? false,
          posted_to_x: post.posted_to_x ?? false,
          personas: persona
            ? {
                id: persona._id,
                name: persona.name,
                title: persona.title ?? null,
                avatar_url: persona.avatar_url ?? null,
              }
            : null,
        }
      }),
    )

    return enriched
  },
})

export const createPost = mutationGeneric({
  args: {
    userId: v.id("users"),
    personaId: v.optional(v.id("personas")),
    topic: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    cloudinaryPublicId: v.optional(v.string()),
    cloudinarySecureUrl: v.optional(v.string()),
    imagePreset: v.optional(v.string()),
    imagePrompt: v.optional(v.string()),
    aiModelVersion: v.optional(v.string()),
    postedToLinkedin: v.optional(v.boolean()),
    linkedinPostId: v.optional(v.string()),
    postedToX: v.optional(v.boolean()),
    xPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.personaId) {
      const persona = await ctx.db.get(args.personaId)
      if (!persona) return { ok: false, error: "PERSONA_NOT_FOUND" as const }
      const allowed = persona.user_id === args.userId || persona.is_public || persona.is_app_provided
      if (!allowed) return { ok: false, error: "PERSONA_FORBIDDEN" as const }
    }

    const id = await ctx.db.insert("posts", {
      user_id: args.userId,
      persona_id: args.personaId,
      topic: args.topic,
      content: args.content,
      image_url: args.imageUrl,
      cloudinary_public_id: args.cloudinaryPublicId,
      cloudinary_secure_url: args.cloudinarySecureUrl,
      image_preset: args.imagePreset,
      image_prompt: args.imagePrompt,
      ai_model_version: args.aiModelVersion,
      posted_to_linkedin: args.postedToLinkedin,
      linkedin_post_id: args.linkedinPostId,
      posted_to_x: args.postedToX,
      x_post_id: args.xPostId,
      created_at: Date.now(),
    })

    return { ok: true, postId: id }
  },
})

export const deletePost = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, { userId, postId }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) {
      return { ok: false, error: "FORBIDDEN" as const }
    }

    await ctx.db.delete(postId)
    return { ok: true }
  },
})

export const setLinkedinConnection = mutationGeneric({
  args: {
    userId: v.id("users"),
    connected: v.boolean(),
    accessToken: v.optional(v.string()),
    profileId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, connected, accessToken, profileId }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" as const }

    await ctx.db.patch(profile._id, {
      linkedin_connected: connected,
      linkedin_access_token: accessToken,
      linkedin_profile_id: profileId,
      updated_at: Date.now(),
    })

    return { ok: true }
  },
})

export const setXConnection = mutationGeneric({
  args: {
    userId: v.id("users"),
    connected: v.boolean(),
    accessToken: v.optional(v.string()),
    xUserId: v.optional(v.string()),
    xUsername: v.optional(v.string()),
  },
  handler: async (ctx, { userId, connected, accessToken, xUserId, xUsername }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" as const }

    await ctx.db.patch(profile._id, {
      x_connected: connected,
      x_access_token: accessToken,
      x_user_id: xUserId,
      x_username: xUsername,
      updated_at: Date.now(),
    })

    return { ok: true }
  },
})

export const backfillProfiles = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect()
    let updated = 0

    for (const profile of profiles) {
      const patch: Record<string, unknown> = {}
      if (typeof profile.default_persona_public !== "boolean") {
        patch.default_persona_public = false
      }
      if (typeof profile.allow_profile_in_explore !== "boolean") {
        patch.allow_profile_in_explore = true
      }
      if (typeof profile.x_connected !== "boolean") {
        patch.x_connected = false
      }

      if (Object.keys(patch).length > 0) {
        patch.updated_at = Date.now()
        await ctx.db.patch(profile._id, patch)
        updated += 1
      }
    }

    return { ok: true, updated }
  },
})

export const getDashboardAnalytics = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const [posts, personas, profile, transactions] = await Promise.all([
      ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
      ctx.db.query("personas").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
      ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique(),
      ctx.db.query("transactions").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
    ])

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const posts30d = posts.filter((p) => p.created_at >= thirtyDaysAgo)
    const posts7d = posts.filter((p) => p.created_at >= sevenDaysAgo)
    const postedToLinkedinCount = posts.filter((p) => p.posted_to_linkedin).length
    const postedToXCount = posts.filter((p) => p.posted_to_x).length
    const publicPersonas = personas.filter((p) => p.is_public).length

    const dailyCounts = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const key = date.toISOString().slice(0, 10)
      dailyCounts.set(key, 0)
    }
    for (const post of posts7d) {
      const key = new Date(post.created_at).toISOString().slice(0, 10)
      if (dailyCounts.has(key)) {
        dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1)
      }
    }

    const weeklySeries = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    const spent30d = transactions
      .filter((t) => t.created_at >= thirtyDaysAgo && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      totals: {
        posts: posts.length,
        personas: personas.length,
        publicPersonas,
        posts30d: posts30d.length,
        postedToLinkedin: postedToLinkedinCount,
        postedToX: postedToXCount,
        coins: profile?.coins ?? 0,
        coinsSpent30d: spent30d,
      },
      weeklySeries,
      connections: {
        linkedin: profile?.linkedin_connected ?? false,
        x: profile?.x_connected ?? false,
      },
    }
  },
})

export const findTransactionByPaymentId = queryGeneric({
  args: { paymentId: v.string() },
  handler: async (ctx, { paymentId }) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_payment_id", (q) => q.eq("razorpay_payment_id", paymentId))
      .unique()
  },
})

export const addCoins = mutationGeneric({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    type: v.string(),
    description: v.optional(v.string()),
    orderId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    signature: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", args.userId)).unique()
    if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" as const }

    if (args.paymentId) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_payment_id", (q) => q.eq("razorpay_payment_id", args.paymentId))
        .unique()
      if (existing) {
        return { ok: true, duplicate: true as const, newBalance: existing.balance_after }
      }
    }

    const nextBalance = profile.coins + args.amount
    if (nextBalance < 0) {
      return { ok: false, error: "INSUFFICIENT_COINS" as const, current: profile.coins }
    }

    await ctx.db.patch(profile._id, {
      coins: nextBalance,
      updated_at: Date.now(),
    })

    await ctx.db.insert("transactions", {
      user_id: args.userId,
      type: args.type,
      amount: args.amount,
      balance_after: nextBalance,
      description: args.description,
      razorpay_order_id: args.orderId,
      razorpay_payment_id: args.paymentId,
      razorpay_signature: args.signature,
      metadata: args.metadata,
      created_at: Date.now(),
    })

    return { ok: true, duplicate: false as const, newBalance: nextBalance }
  },
})

export const deleteUserAccount = mutationGeneric({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (profile) {
      await ctx.db.delete(profile._id)
    }

    const posts = await ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    for (const post of posts) {
      await ctx.db.delete(post._id)
    }

    const personas = await ctx.db.query("personas").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    for (const persona of personas) {
      await ctx.db.delete(persona._id)
    }

    const txs = await ctx.db.query("transactions").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    for (const tx of txs) {
      await ctx.db.delete(tx._id)
    }

    const user = await ctx.db.get(userId)
    if (user) {
      await ctx.db.delete(userId)
    }

    return { ok: true }
  },
})
