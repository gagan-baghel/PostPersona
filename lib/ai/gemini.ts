import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Configure the Google Generative AI client for direct Gemini API access.
 * This is used for Nano Banana (Gemini 2.5/3 Pro Image) generation.
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default genAI;
