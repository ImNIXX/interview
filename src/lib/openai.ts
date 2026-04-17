import OpenAI from "openai";

// OpenRouter uses the OpenAI-compatible API
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export default openrouter;
