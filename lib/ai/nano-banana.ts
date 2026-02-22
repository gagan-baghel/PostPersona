import genAI from "./gemini";
import { generateImageDeAPI } from "./deapi";

export const IMAGE_PRESETS = {
    infographic: "clean, minimal infographic style, vector art, flat design, professional business statistics",
    // ... (start line 4)
    corporate: "professional corporate photography, office setting, high quality, 4k, linkedin style",
    fun: "vibrant pop art style, colorful, energetic, expressive, social media trend",
    ghibli: "studio ghibli style, anime background, peaceful, highly detailed, cel shaded",
    realistic: "hyperrealistic 4k photograph, detailed texture, cinematic lighting",
    sketch: "hand drawn pencil sketch, artistic, rough lines, creative concept",
}

export type ImagePreset = keyof typeof IMAGE_PRESETS

/**
 * Nano Banana (Gemini 2.5/3.0 Image + DeAPI) Implementation
 * - Tries DeAPI first for "end to end perfection" if DEAPI_API_KEY is present.
 * - Fallbacks to Gemini if DeAPI fails or key is missing.
 */
// lib/ai/nano-banana.ts
export async function generateImage(prompt: string, preset: ImagePreset = 'corporate') {
    // 1. Prepare the prompt with the preset
    const fullPrompt = `${IMAGE_PRESETS[preset]}. Subject: ${prompt}. (IMPORTANT: Generate the image only, no text descriptions)`;

    // 2. Try DeAPI first
    if (process.env.DEAPI_API_KEY) {
        try {
            console.log("[Nano Banana] Attempting DeAPI (Flux) generation...");
            return await generateImageDeAPI(fullPrompt);
        } catch (error) {
            console.error("[Nano Banana] DeAPI failed, falling back to Gemini:", error);
            // Fallthrough to Gemini
        }
    } else {
        console.log("[Nano Banana] DEAPI_API_KEY not found. Skipping DeAPI.");
    }

    // 3. Fallback to Gemini (Imagen 3)
    try {
        console.log("[Nano Banana] Using Gemini generation...");
        // 1. Model Selection: Use the dedicated image-capable model ID
        // Note: 'gemini-2.5-flash-image' is the optimized multimodal generation endpoint
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-image"
        });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                // This is the CRITICAL fix: Explicitly request image modality
                // @ts-ignore - responseModalities is required for multimodal output
                responseModalities: ["IMAGE"],
                candidateCount: 1,
                temperature: 0.4,
            }
        });

        const response = await result.response;
        const candidate = response.candidates?.[0];

        // 3. Robust parsing for the 'inlineData' part
        const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);

        if (!imagePart || !imagePart.inlineData?.data) {
            console.error("[Nano Banana] No image data found. Response:", JSON.stringify(response, null, 2));
            throw new Error("Gemini returned text instead of an image. Check prompt constraints.");
        }

        return {
            success: true,
            imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
            model: "gemini-2.5-flash-image"
        };

    } catch (error) {
        console.error("[Nano Banana] Generation Error:", error);
        throw error;
    }
}