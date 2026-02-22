import { z } from "zod"

// Helper to strip control characters and normalize input
const sanitizeInput = (val: string) => val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim()

export const GeneratePostSchema = z.object({
    avatarId: z.string().min(1, "Persona ID is required"),
    // Topic: Allow alphanumeric, punctuation, emojis. Block generic injection attempts.
    topic: z.string()
        .min(5, "Topic must be at least 5 characters")
        .max(500, "Topic too long")
        .transform(sanitizeInput)
        // Basic filter for script/html injection risks in the topic itself
        .refine(val => !/<script|javascript:|on\w+=/i.test(val), "Invalid content detected in topic"),
})

export const ImagePromptSchema = z.object({
    personaId: z.string().min(1).optional(),
    // Sanitized post content context
    postContent: z.string().min(10).transform(sanitizeInput),
    imagePreset: z.enum(['infographic', 'corporate', 'fun', 'ghibli', 'realistic', 'sketch']).optional().default('corporate'),
    // Custom description: Strict validation against prompt injection characters
    customDescription: z.string()
        .max(200)
        .optional()
        .transform(val => val ? sanitizeInput(val) : undefined)
        .refine(val => !val || !/[<>{}]/g.test(val), "Special characters < > { } are not allowed in description"),
})

export const SavePostSchema = z.object({
    personaId: z.string().min(1, "Persona ID is required"),
    topic: z.string().min(5).max(500).transform(sanitizeInput),
    content: z.string().min(10).transform(sanitizeInput),
    // Allow empty strings by transforming them to null, and use .catch() to avoid hard failures on weird values
    imageUrl: z.string().nullish().transform(val => val === "" ? null : val),
    cloudinaryPublicId: z.string().optional().nullable(),
    cloudinarySecureUrl: z.string().nullish().transform(val => val === "" ? null : val),
    imagePreset: z.string().optional().nullable(),
    imagePrompt: z.string().optional().nullable(),
    aiModelVersion: z.string().optional().nullable(),
    workflowStatus: z.enum(["draft", "review", "scheduled", "posted", "rejected"]).optional().nullable(),
    targetPlatform: z.enum(["linkedin", "x", "both"]).optional().nullable(),
    scheduledFor: z.number().optional().nullable(),
    reviewNotes: z.string().optional().nullable(),
})
