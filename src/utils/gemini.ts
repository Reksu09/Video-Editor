import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize API
// WARNING: In a production app, never store keys in client-side code.
// For this prototype/demo, we use the key provided by the user.
const API_KEY = "AIzaSyDHKMsc_Q-QKKBMCZ7mFlxOC4MErLq1mvo";
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    systemInstruction: `
Your Role: You are a social media manager specializing in viral memes and internet culture. You are a strategist for viral short-form video content on platforms like YouTube Shorts, TikTok, and Instagram Reels.

Your Task: Analyze the provided video frames and create a list of on-screen text overlays for each individual video clip. The text must be highly RELEVANT to what is actually happening in each specific clip.

Instructions and Rules for Overlays:
1. Max 3 words per overlay.
2. Each overlay should capture the essence or the "vibe" of that specific clip.
3. Emoji: End every line with a specific, funny emoji (use things like 😭, 👀, 💀, 🔥, 🤣).
4. Do not use generic overlays; look at the visual details to make them specific.

PART 2: FULL SEO PACKAGE
Instructions:
Create a complete SEO package for this video with the following structure:

Best searchable Title:
* Starts with "Ranking The..." or a similar hook relevant to the video's theme.
* Provide 1 best title.
* Title must include relevant emojis and the #shorts hashtag.

Description:
* Write a concise, keyword-rich description that summarizes the video's overall content.
* Include a question to drive comments and a call-to-action.
* End with a block of relevant hashtags.

Tags:
* Provide a comprehensive list of comma-separated SEO tags, specific to the video's content.

Final Output Format:
1. Provide the final output as a strictly valid JSON object.
2. Do not include any extra explanations or commentary.
3. Properties: textOverlays (array), title (string), description (string), tags (array).

Example JSON Output:
{
    "textOverlays": ["Perfect loop! ♾️", "Wait for it... 👀", "That's insane! 💀", "Pure skill 🔥", "Absolute fail 🤣"],
    "title": "Ranking the craziest parkour skips 🏃‍♂️ #shorts #parkour",
    "description": "Which of these skips was the most impressive? Let us know in the comments! Don't forget to like and subscribe! #parkour #highlights",
    "tags": ["parkour", "extreme sports", "stunts", "shorts", "viral"]
}
`
});

export interface GeminiSEOOutput {
    textOverlays: string[];
    title: string;
    description: string;
    tags: string[];
}

export const generateOverlays = async (videoFrames: string[][]): Promise<GeminiSEOOutput> => {
    try {
        // Flatten the frames but keep track of which video they belong to? 
        // Actually, the prompt asks for a list for "each video clip".
        // We will send all frames from all videos as a single sequence,
        // but explicitly label them in the prompt part if needed?
        // Or just send them as a stream of images.
        // Since we have 5 videos, and say 3 frames each.
        // We can send [Video 1 Frame 1, V1F2, V1F3, Video 2 Frame 1...]

        const promptParts: any[] = [`Analyze these ${videoFrames.length} video clips and generate the SEO package + ${videoFrames.length} overlay texts (one for each video) in order.`];

        videoFrames.forEach((frames, index) => {
            promptParts.push(`\nVideo ${index + 1}:`);
            frames.forEach(frame => {
                // frame is data:image/jpeg;base64,...
                // SDK expects just base64 or inlineData object
                const base64Data = frame.split(',')[1];
                promptParts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                });
            });
        });

        const result = await model.generateContent(promptParts);
        const response = result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text);

        // Clean markdown code blocks if present
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the JSON object if there's extra text
        const jsonMatch = cleanText.match(/\{.*\}/s);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        } else {
            throw new Error("No JSON object found in response");
        }

        const parsed = JSON.parse(cleanText);

        // Normalize data to ensure it matches the interface
        const normalized: GeminiSEOOutput = {
            title: parsed.title || "",
            description: parsed.description || "",
            textOverlays: Array.isArray(parsed.textOverlays)
                ? parsed.textOverlays
                : (typeof parsed.textOverlays === 'string' ? parsed.textOverlays.split(',').map((s: string) => s.trim()) : []),
            tags: Array.isArray(parsed.tags)
                ? parsed.tags
                : (typeof parsed.tags === 'string' ? parsed.tags.split(',').map((s: string) => s.trim()) : []),
        };

        return normalized;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};
