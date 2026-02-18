
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const getApiKey = () => {
    return process.env.VITE_GEMINI_API_KEY || '';
};

async function listModels() {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        // There might not be a listModels in this specific SDK, let's try to find it
        console.log("Checking AI object:", Object.keys(ai));
        if (ai.models && ai.models.list) {
            const models = await ai.models.list();
            console.log("Available models:", JSON.stringify(models, null, 2));
        } else {
            console.log("ai.models.list not found");
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
