import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

import { SIGNUP_COINS as DEFAULT_COINS } from "../lib/pricing"

const DEFAULT_POSTING_SCHEDULE = {
  monday: "09:30",
  tuesday: "10:00",
  wednesday: "09:45",
  thursday: "10:15",
  friday: "09:30",
}

const DEFAULT_PERSONAS = [
  {
    name: "Professional Voice",
    title: "Corporate Leader",
    personality:
      "Professional, polished, and authoritative. Values clarity, efficiency, and results. Speaks with confidence and expertise.",
    writing_style:
      "Clear and concise sentences. Uses data and facts. Professional tone with occasional strategic insights.",
    training_posts: [],
    avatar_url: undefined,
  },
  {
    name: "Founder Voice",
    title: "Startup Entrepreneur",
    personality:
      "Visionary, ambitious, and inspiring. Passionate about innovation and building the future.",
    writing_style:
      "Storytelling approach. Personal anecdotes mixed with insights. Energetic and motivational.",
    training_posts: [],
    avatar_url: undefined,
  },
  {
    name: "Thought Leader",
    title: "Industry Expert",
    personality:
      "Insightful, analytical, and forward-thinking. Challenges conventional wisdom and sparks meaningful discussions.",
    writing_style:
      "Deep-dive analysis. Uses frameworks and practical examples. Minimal fluff.",
    training_posts: [],
    avatar_url: undefined,
  },
]

function toMinuteOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return Math.max(0, Math.min(23, h || 0)) * 60 + Math.max(0, Math.min(59, m || 0))
}

function getUpcomingScheduleTimes(count: number, schedule: Record<string, string>, nowTs: number): number[] {
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
  const allowed = new Set(["monday", "tuesday", "wednesday", "thursday", "friday"])
  const slots: number[] = []

  for (let offset = 0; offset < 365 && slots.length < count; offset++) {
    const candidate = new Date(nowTs + offset * 24 * 60 * 60 * 1000)
    const dayName = dayKeys[candidate.getUTCDay()]
    if (!allowed.has(dayName)) continue

    const configured = schedule[dayName] || DEFAULT_POSTING_SCHEDULE[dayName as keyof typeof DEFAULT_POSTING_SCHEDULE]
    const minuteOfDay = toMinuteOfDay(configured)
    candidate.setUTCHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0)

    if (candidate.getTime() > nowTs) slots.push(candidate.getTime())
  }

  return slots
}

async function resequenceScheduledQueue(ctx: any, userId: any, baseTs = Date.now()) {
  const [profile, posts] = await Promise.all([
    ctx.db.query("profiles").withIndex("by_user_id", (q: any) => q.eq("user_id", userId)).unique(),
    ctx.db.query("posts").withIndex("by_user_id", (q: any) => q.eq("user_id", userId)).collect(),
  ])

  const scheduled = posts
    .filter((p: any) => (p.workflow_status ?? "draft") === "scheduled")
    .sort((a: any, b: any) => {
      const aq = typeof a.queue_position === "number" ? a.queue_position : Number.MAX_SAFE_INTEGER
      const bq = typeof b.queue_position === "number" ? b.queue_position : Number.MAX_SAFE_INTEGER
      if (aq !== bq) return aq - bq
      const at = typeof a.scheduled_for === "number" ? a.scheduled_for : a.created_at
      const bt = typeof b.scheduled_for === "number" ? b.scheduled_for : b.created_at
      return at - bt
    })

  const schedule = (profile?.posting_schedule as Record<string, string> | undefined) ?? DEFAULT_POSTING_SCHEDULE
  const slots = getUpcomingScheduleTimes(scheduled.length, schedule, baseTs)

  for (let i = 0; i < scheduled.length; i++) {
    await ctx.db.patch(scheduled[i]._id, {
      queue_position: i + 1,
      scheduled_for: slots[i] ?? (baseTs + (i + 1) * 24 * 60 * 60 * 1000),
    })
  }
}

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
      posting_schedule: DEFAULT_POSTING_SCHEDULE,
      auto_post_enabled: false,
      timezone: "UTC",
      linkedin_connected: false,
      linkedin_refresh_token: undefined,
      linkedin_access_token_expires_at: undefined,
      linkedin_refresh_token_expires_at: undefined,
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
    postingSchedule: v.optional(v.any()),
    autoPostEnabled: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    aiProvider: v.optional(v.string()),
  },
  handler: async (ctx, { userId, fullName, defaultPersonaPublic, allowProfileInExplore, postingSchedule, autoPostEnabled, timezone, aiProvider }) => {
    const user = await ctx.db.get(userId)
    if (!user) return { ok: false, error: "USER_NOT_FOUND" as const }

    // patch() with undefined deletes the field, so only touch the name when one was sent.
    if (fullName !== undefined) await ctx.db.patch(userId, { full_name: fullName })

    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (profile) {
      await ctx.db.patch(profile._id, {
        default_persona_public: defaultPersonaPublic ?? profile.default_persona_public ?? false,
        allow_profile_in_explore: allowProfileInExplore ?? profile.allow_profile_in_explore ?? true,
        posting_schedule: postingSchedule ?? profile.posting_schedule ?? DEFAULT_POSTING_SCHEDULE,
        auto_post_enabled: autoPostEnabled ?? profile.auto_post_enabled ?? false,
        timezone: timezone ?? profile.timezone ?? "UTC",
        ai_provider: aiProvider ?? profile.ai_provider,
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
    training_posts: v.optional(v.array(v.string())),
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
      training_posts: args.training_posts,
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
    training_posts: v.optional(v.array(v.string())),
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
      training_posts: args.training_posts,
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
      training_posts: original.training_posts,
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
          workflow_status: post.workflow_status ?? "draft",
          target_platform: post.target_platform ?? "linkedin",
          scheduled_for: post.scheduled_for ?? null,
          approved_at: post.approved_at ?? null,
          posted_at: post.posted_at ?? null,
          review_notes: post.review_notes ?? null,
          queue_position: post.queue_position ?? null,
          campaign_id: post.campaign_id ?? null,
          publish_attempt_count: post.publish_attempt_count ?? 0,
          publish_last_attempt_at: post.publish_last_attempt_at ?? null,
          publish_next_retry_at: post.publish_next_retry_at ?? null,
          publish_last_error: post.publish_last_error ?? null,
          delivery_status: post.delivery_status ?? "queued",
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
    workflowStatus: v.optional(v.string()),
    targetPlatform: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    queuePosition: v.optional(v.number()),
    campaignId: v.optional(v.id("campaigns")),
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
      workflow_status: args.workflowStatus ?? "draft",
      target_platform: args.targetPlatform ?? "linkedin",
      scheduled_for: args.scheduledFor,
      review_notes: args.reviewNotes,
      queue_position: args.queuePosition,
      campaign_id: args.campaignId,
      publish_attempt_count: 0,
      publish_last_attempt_at: undefined,
      publish_next_retry_at: undefined,
      publish_last_error: undefined,
      publish_lock_until: undefined,
      idempotency_key: undefined,
      delivery_status: args.workflowStatus === "posted" ? "posted" : "queued",
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

export const listPostsByStatus = queryGeneric({
  args: {
    userId: v.id("users"),
    statuses: v.array(v.string()),
  },
  handler: async (ctx, { userId, statuses }) => {
    const posts = await ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    return posts
      .filter((post) => statuses.includes(post.workflow_status ?? "draft"))
      .sort((a, b) => {
        const aQueue = typeof a.queue_position === "number" ? a.queue_position : Number.MAX_SAFE_INTEGER
        const bQueue = typeof b.queue_position === "number" ? b.queue_position : Number.MAX_SAFE_INTEGER
        if (aQueue !== bQueue) return aQueue - bQueue
        const aTs = a.scheduled_for ?? a.created_at
        const bTs = b.scheduled_for ?? b.created_at
        return aTs - bTs
      })
  },
})

export const getPostByIdForUser = queryGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, { userId, postId }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return null
    return post
  },
})

export const setPostWorkflow = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    status: v.string(),
    reviewNotes: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, { userId, postId, status, reviewNotes, scheduledFor }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    const patch: Record<string, any> = {
      workflow_status: status,
      review_notes: reviewNotes,
    }
    if (typeof scheduledFor === "number") patch.scheduled_for = scheduledFor
    if (status === "approved" || status === "scheduled") patch.approved_at = Date.now()
    if (status === "posted") patch.posted_at = Date.now()
    if (status === "scheduled") {
      patch.publish_next_retry_at = undefined
      patch.publish_last_error = undefined
      patch.publish_lock_until = undefined
      patch.delivery_status = "queued"
    }
    if (status === "rejected") {
      patch.publish_lock_until = undefined
    }

    await ctx.db.patch(postId, patch)
    return { ok: true }
  },
})

export const setPostTargetPlatform = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    targetPlatform: v.string(),
  },
  handler: async (ctx, { userId, postId, targetPlatform }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    await ctx.db.patch(postId, {
      target_platform: targetPlatform,
      updated_at: Date.now(),
    })

    return { ok: true }
  },
})

export const approvePostAndAutoSchedule = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, { userId, postId }) => {
    const [post, allPosts] = await Promise.all([
      ctx.db.get(postId),
      ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
    ])

    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    const maxQueue = allPosts
      .filter((p) => (p.workflow_status ?? "draft") === "scheduled")
      .reduce((max, p) => Math.max(max, typeof p.queue_position === "number" ? p.queue_position : 0), 0)

    await ctx.db.patch(postId, {
      workflow_status: "scheduled",
      approved_at: Date.now(),
      queue_position: maxQueue + 1,
      review_notes: undefined,
      publish_next_retry_at: undefined,
      publish_last_error: undefined,
      publish_lock_until: undefined,
      delivery_status: "queued",
    })

    await resequenceScheduledQueue(ctx, userId)
    const updated = await ctx.db.get(postId)

    return { ok: true, scheduledFor: updated?.scheduled_for ?? null, queuePosition: updated?.queue_position ?? null }
  },
})

export const reorderScheduledQueue = mutationGeneric({
  args: {
    userId: v.id("users"),
    orderedPostIds: v.array(v.id("posts")),
  },
  handler: async (ctx, { userId, orderedPostIds }) => {
    const posts = await ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect()
    const scheduled = posts.filter((p) => (p.workflow_status ?? "draft") === "scheduled")
    const scheduledIds = new Set(scheduled.map((p) => String(p._id)))

    if (orderedPostIds.length !== scheduled.length) {
      return { ok: false, error: "INVALID_ORDER_LENGTH" as const }
    }
    for (const id of orderedPostIds) {
      if (!scheduledIds.has(String(id))) {
        return { ok: false, error: "INVALID_ORDER_CONTENT" as const }
      }
    }

    for (let i = 0; i < orderedPostIds.length; i++) {
      await ctx.db.patch(orderedPostIds[i], { queue_position: i + 1 })
    }
    await resequenceScheduledQueue(ctx, userId)
    return { ok: true }
  },
})

export const markScheduledPostPublished = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    linkedinPostId: v.optional(v.string()),
    postedLinkedin: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, postId, linkedinPostId, postedLinkedin }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    await ctx.db.patch(postId, {
      workflow_status: "posted",
      posted_at: Date.now(),
      queue_position: undefined,
      posted_to_linkedin: postedLinkedin ?? post.posted_to_linkedin ?? false,
      linkedin_post_id: linkedinPostId ?? post.linkedin_post_id,
      publish_next_retry_at: undefined,
      publish_last_error: undefined,
      publish_lock_until: undefined,
      delivery_status: "posted",
    })

    await resequenceScheduledQueue(ctx, userId)

    return { ok: true }
  },
})

export const acquirePostPublishLock = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    lockMs: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, { userId, postId, lockMs = 120000, idempotencyKey }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }
    if ((post.workflow_status ?? "draft") !== "scheduled") return { ok: false, error: "NOT_SCHEDULED" as const }

    const now = Date.now()
    if (typeof post.publish_lock_until === "number" && post.publish_lock_until > now) {
      return { ok: false, error: "LOCKED" as const }
    }

    await ctx.db.patch(postId, {
      publish_lock_until: now + Math.max(15000, lockMs),
      idempotency_key: idempotencyKey,
      publish_last_attempt_at: now,
      publish_attempt_count: (post.publish_attempt_count ?? 0) + 1,
      delivery_status: "publishing",
    })

    return { ok: true }
  },
})

export const markPostPublishFailure = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    errorMessage: v.string(),
    maxAttempts: v.optional(v.number()),
    baseDelaySeconds: v.optional(v.number()),
  },
  handler: async (ctx, { userId, postId, errorMessage, maxAttempts = 6, baseDelaySeconds = 90 }) => {
    const post = await ctx.db.get(postId)
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    const now = Date.now()
    const attempts = Math.max(1, post.publish_attempt_count ?? 1)
    const trimmed = errorMessage.trim().slice(0, 500)

    if (attempts >= maxAttempts) {
      await ctx.db.patch(postId, {
        workflow_status: "dead_letter",
        queue_position: undefined,
        publish_lock_until: undefined,
        publish_last_error: trimmed,
        publish_next_retry_at: undefined,
        delivery_status: "dead_letter",
      })
      await resequenceScheduledQueue(ctx, userId)
      return { ok: true, deadLetter: true }
    }

    const delaySeconds = Math.min(60 * 60, baseDelaySeconds * Math.pow(2, Math.max(0, attempts - 1)))
    const nextRetryAt = now + delaySeconds * 1000

    await ctx.db.patch(postId, {
      publish_lock_until: undefined,
      publish_last_error: trimmed,
      publish_next_retry_at: nextRetryAt,
      delivery_status: "retrying",
    })

    return { ok: true, deadLetter: false, nextRetryAt }
  },
})

export const replayDeadLetterPost = mutationGeneric({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, { userId, postId }) => {
    const [post, posts] = await Promise.all([
      ctx.db.get(postId),
      ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
    ])
    if (!post || post.user_id !== userId) return { ok: false, error: "FORBIDDEN" as const }

    const maxQueue = posts
      .filter((p) => (p.workflow_status ?? "draft") === "scheduled")
      .reduce((max, p) => Math.max(max, typeof p.queue_position === "number" ? p.queue_position : 0), 0)

    await ctx.db.patch(postId, {
      workflow_status: "scheduled",
      queue_position: maxQueue + 1,
      publish_lock_until: undefined,
      publish_next_retry_at: undefined,
      publish_last_error: undefined,
      delivery_status: "queued",
      review_notes: undefined,
    })

    await resequenceScheduledQueue(ctx, userId)
    const updated = await ctx.db.get(postId)
    return { ok: true, scheduledFor: updated?.scheduled_for ?? null, queuePosition: updated?.queue_position ?? null }
  },
})

export const createCampaign = mutationGeneric({
  args: {
    userId: v.id("users"),
    name: v.string(),
    goal: v.string(),
    audience: v.string(),
    pillars: v.array(v.string()),
    cadencePerWeek: v.number(),
    kpiTarget: v.optional(v.string()),
    primaryPersonaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { userId, name, goal, audience, pillars, cadencePerWeek, kpiTarget, primaryPersonaId }) => {
    const now = Date.now()
    const id = await ctx.db.insert("campaigns", {
      user_id: userId,
      name,
      goal,
      audience,
      pillars,
      cadence_per_week: cadencePerWeek,
      kpi_target: kpiTarget,
      primary_persona_id: primaryPersonaId,
      status: "active",
      created_at: now,
      updated_at: now,
    })
    return { ok: true, campaignId: id }
  },
})

export const updateCampaign = mutationGeneric({
  args: {
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    goal: v.optional(v.string()),
    audience: v.optional(v.string()),
    pillars: v.optional(v.array(v.string())),
    cadencePerWeek: v.optional(v.number()),
    kpiTarget: v.optional(v.string()),
    primaryPersonaId: v.optional(v.id("personas")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId)
    if (!campaign || campaign.user_id !== args.userId) return { ok: false, error: "FORBIDDEN" as const }

    const patch: Record<string, unknown> = { updated_at: Date.now() }
    if (typeof args.name === "string") patch.name = args.name
    if (typeof args.goal === "string") patch.goal = args.goal
    if (typeof args.audience === "string") patch.audience = args.audience
    if (Array.isArray(args.pillars)) patch.pillars = args.pillars
    if (typeof args.cadencePerWeek === "number") patch.cadence_per_week = args.cadencePerWeek
    if (typeof args.kpiTarget === "string") patch.kpi_target = args.kpiTarget
    if (typeof args.status === "string") patch.status = args.status
    if (args.primaryPersonaId !== undefined) patch.primary_persona_id = args.primaryPersonaId

    await ctx.db.patch(args.campaignId, patch)
    return { ok: true }
  },
})

export const listCampaigns = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const [campaigns, posts] = await Promise.all([
      ctx.db.query("campaigns").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
      ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
    ])

    return campaigns
      .map((campaign) => {
        const scoped = posts.filter((p) => p.campaign_id === campaign._id)
        return {
          ...campaign,
          id: campaign._id,
          stats: {
            totalPosts: scoped.length,
            pending: scoped.filter((p) => (p.workflow_status ?? "draft") === "review").length,
            scheduled: scoped.filter((p) => (p.workflow_status ?? "draft") === "scheduled").length,
            posted: scoped.filter((p) => (p.workflow_status ?? "draft") === "posted").length,
            deadLetter: scoped.filter((p) => (p.workflow_status ?? "draft") === "dead_letter").length,
          },
        }
      })
      .sort((a, b) => b.created_at - a.created_at)
  },
})

export const getCampaignById = queryGeneric({
  args: {
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { userId, campaignId }) => {
    const campaign = await ctx.db.get(campaignId)
    if (!campaign || campaign.user_id !== userId) return null
    return campaign
  },
})

export const getCampaignAnalytics = queryGeneric({
  args: {
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { userId, campaignId }) => {
    const [campaign, posts] = await Promise.all([
      ctx.db.get(campaignId),
      ctx.db.query("posts").withIndex("by_user_id", (q) => q.eq("user_id", userId)).collect(),
    ])
    if (!campaign || campaign.user_id !== userId) return null

    const scoped = posts.filter((p) => p.campaign_id === campaignId)
    const total = scoped.length
    const posted = scoped.filter((p) => (p.workflow_status ?? "draft") === "posted")
    const dead = scoped.filter((p) => (p.workflow_status ?? "draft") === "dead_letter")
    const scheduled = scoped.filter((p) => (p.workflow_status ?? "draft") === "scheduled")
    const review = scoped.filter((p) => (p.workflow_status ?? "draft") === "review")
    const avgAttempts =
      total > 0 ? scoped.reduce((sum, p) => sum + (p.publish_attempt_count ?? 0), 0) / total : 0

    return {
      campaign: {
        ...campaign,
        id: campaign._id,
      },
      totals: {
        total,
        posted: posted.length,
        scheduled: scheduled.length,
        review: review.length,
        deadLetter: dead.length,
        avgAttempts: Number(avgAttempts.toFixed(2)),
      },
      recentPosts: scoped
        .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
        .slice(0, 20)
        .map((p) => ({
          id: p._id,
          topic: p.topic,
          workflow_status: p.workflow_status ?? "draft",
          publish_attempt_count: p.publish_attempt_count ?? 0,
          publish_last_error: p.publish_last_error ?? null,
          created_at: p.created_at,
          posted_at: p.posted_at ?? null,
        })),
    }
  },
})

export const setLinkedinConnection = mutationGeneric({
  args: {
    userId: v.id("users"),
    connected: v.boolean(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    profileId: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { userId, connected, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, profileId, profileImageUrl }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user_id", (q) => q.eq("user_id", userId)).unique()
    if (!profile) return { ok: false, error: "PROFILE_NOT_FOUND" as const }

    await ctx.db.patch(profile._id, {
      linkedin_connected: connected,
      linkedin_access_token: accessToken,
      linkedin_refresh_token: refreshToken,
      linkedin_access_token_expires_at: accessTokenExpiresAt,
      linkedin_refresh_token_expires_at: refreshTokenExpiresAt,
      linkedin_profile_id: profileId,
      linkedin_profile_image_url: profileImageUrl,
      auto_post_enabled: connected ? profile.auto_post_enabled : false,
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
      if (!profile.posting_schedule) {
        patch.posting_schedule = DEFAULT_POSTING_SCHEDULE
      }
      if (typeof profile.auto_post_enabled !== "boolean") {
        patch.auto_post_enabled = false
      }
      if (typeof profile.timezone !== "string") {
        patch.timezone = "UTC"
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
        coins: profile?.coins ?? 0,
        coinsSpent30d: spent30d,
      },
      weeklySeries,
      connections: {
        linkedin: profile?.linkedin_connected ?? false,
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
