import { OpenRouter } from "@openrouter/sdk";

// Initialize the official OpenRouter SDK
const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || "",
});

export const AI_MODELS = {
    // Switched to Nex AGI: DeepSeek V3.1 (Nex N1 – free) as requested
    TEXT_GENERATION: "nex-agi/deepseek-v3.1-nex-n1:free",
};

export default openrouter;
