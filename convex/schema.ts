import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password_hash: v.string(),
    full_name: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_email", ["email"]),

  profiles: defineTable({
    user_id: v.id("users"),
    coins: v.number(),
    default_persona_public: v.optional(v.boolean()),
    allow_profile_in_explore: v.optional(v.boolean()),
    linkedin_connected: v.boolean(),
    linkedin_access_token: v.optional(v.string()),
    linkedin_profile_id: v.optional(v.string()),
    x_connected: v.optional(v.boolean()),
    x_access_token: v.optional(v.string()),
    x_user_id: v.optional(v.string()),
    x_username: v.optional(v.string()),
    created_at: v.number(),
    updated_at: v.number(),
  }).index("by_user_id", ["user_id"]),

  personas: defineTable({
    user_id: v.optional(v.id("users")),
    name: v.string(),
    title: v.optional(v.string()),
    personality: v.string(),
    writing_style: v.string(),
    avatar_url: v.optional(v.string()),
    is_public: v.boolean(),
    is_app_provided: v.boolean(),
    original_persona_id: v.optional(v.id("personas")),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_user_id", ["user_id"])
    .index("by_public", ["is_public"])
    .index("by_app_provided", ["is_app_provided"]),

  posts: defineTable({
    user_id: v.id("users"),
    persona_id: v.optional(v.id("personas")),
    topic: v.string(),
    content: v.string(),
    image_url: v.optional(v.string()),
    cloudinary_public_id: v.optional(v.string()),
    cloudinary_secure_url: v.optional(v.string()),
    image_preset: v.optional(v.string()),
    image_prompt: v.optional(v.string()),
    ai_model_version: v.optional(v.string()),
    posted_to_linkedin: v.optional(v.boolean()),
    linkedin_post_id: v.optional(v.string()),
    posted_to_x: v.optional(v.boolean()),
    x_post_id: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_user_id", ["user_id"]),

  transactions: defineTable({
    user_id: v.id("users"),
    type: v.string(),
    amount: v.number(),
    balance_after: v.number(),
    description: v.optional(v.string()),
    razorpay_order_id: v.optional(v.string()),
    razorpay_payment_id: v.optional(v.string()),
    razorpay_signature: v.optional(v.string()),
    metadata: v.optional(v.any()),
    created_at: v.number(),
  })
    .index("by_user_id", ["user_id"])
    .index("by_payment_id", ["razorpay_payment_id"]),
})
