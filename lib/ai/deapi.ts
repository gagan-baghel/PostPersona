
export async function generateImageDeAPI(prompt: string) {
    const apiKey = process.env.DEAPI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing DEAPI_API_KEY");
    }
    console.log(`[DeAPI] Using key: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);

    try {
        const formData = new FormData();
        formData.append('text', prompt);

        // Use Flux.1 Schnell endpoint
        const response = await fetch('https://api.deepai.org/api/flux-schnell', {
            method: 'POST',
            headers: {
                'api-key': apiKey,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.output_url) {
            console.error("DeepAI Flux Error:", data);
            throw new Error(data.error || "DeepAI Flux generation failed");
        }

        return {
            success: true,
            imageUrl: data.output_url,
            model: "deepai-flux-schnell"
        };

    } catch (error) {
        console.error("DEAPI_API_KEY Generation Exception:", error);
        throw error;
    }
}
