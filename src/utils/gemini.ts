import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize API
// WARNING: In a production app, never store keys in client-side code.
// For this prototype/demo, we use the key provided by the user.
const API_KEY = "AIzaSyDHKMsc_Q-QKKBMCZ7mFlxOC4MErLq1mvo";
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `
    its a 5 video clip of make a word challenge moments

Your Role: You are a social media manager specialize in viral memes and internet culture. strategist for viral short-form video content on platforms like YouTube Shorts, TikTok, and Instagram Reels.

Your Task: Analyze the provided video frames and create a list of on-screen text overlays for each video clip designed for maximum engagement and retention.

Instructions and Rules:
1. One Word Max
2. Emoji: End every line with a specific, funny emoji (use things like , , , , ).
3. Write every overlay text in code block format.
4. I don't want sarcastic overlay text i want straight to the point but RELEVANT on every clip

PART 2: FULL SEO PACKAGE

Instructions:
Create a complete SEO package for this video with the following structure:

Best searchable Title:

*starts with the word "Ranking The Best/Funniest" and end with "moments" example: Ranking the best Whitney Houston drum challenge reactions 
* Provide 1 best title, 
* title must include an emoji and the #shorts hashtag and hashtags that relevant on the video.
* Write this description in code block format.

Description:

* Write a concise, keyword-rich description that summarizes the video's content.
* Include a question to drive comments and a call-to-action to like and subscribe.
* End the description with a single block of relevant hashtags. 

Tags:
* the first tags must be specific related on the video and the so on must be general.
* Provide a comprehensive list of comma-separated SEO tags, mixing broad and specific terms.

Instructions and Rules:
1. Provide the final output as a JSON object.
2. Do not include any extra explanations or commentary, no backticks wrap, just the raw JSON object.
3. The object should have 4 properties: textOverlays, title, description, tags.
    
Example JSON Output:
{
    "textOverlays": ["Use this sound! 😭", "Wait for it... 👀", "Bro what? 💀", "No way! 🔥", "Emotional Damage 🤣"],
    "title": "Ranking the best Whitney Houston drum challenge reactions 🥁 #shorts #challenge",
    "description": "Can you handle the rhythm? Watch these hilarious reactions to the challenge! Who did it best? 👇 Like and subscribe for more viral challenges! #drumchallenge #reactions",
    "tags": ["drum challenge", "whitney houston", "funny reactions", "shorts", "viral"]
}`
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

        const promptParts: any[] = ["Analyze these 5 video clips and generate the SEO package + 5 overlay texts (one for each video) in order."];

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
