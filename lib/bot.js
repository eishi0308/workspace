/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 *
 * See the getting started guide for more information
 * https://ai.google.dev/gemini-api/docs/get-started/node
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiApiKey } from "./config.js";

const genAI = new GoogleGenerativeAI(geminiApiKey);

export const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

export function createBot(systemInstruction, history) {
  return model.startChat({
    generationConfig,
    history,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  });
}
