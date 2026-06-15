import OpenAI from "openai";
import { env } from "@/lib/config/env";
import type { AiFeature } from "@prisma/client";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!env.AI_API_KEY) {
      throw new Error("AI provider is not configured");
    }
    client = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_BASE_URL,
    });
  }
  return client;
}

export interface AiCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
}

export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<AiCompletionResult> {
  const ai = getClient();
  const response = await ai.chat.completions.create({
    model: env.AI_MODEL,
    max_tokens: options?.maxTokens ?? env.AI_MAX_TOKENS,
    temperature: options?.temperature ?? 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const choice = response.choices[0];
  return {
    content: choice?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    model: response.model,
  };
}

const FEATURE_PROMPTS: Partial<Record<AiFeature, string>> = {
  SMART_SEARCH:
    "You are a product search assistant for SmartShop Ghana marketplace. Parse the user's natural language query into structured search parameters.",
  LISTING_GENERATION:
    "You are a product listing expert for Ghana marketplace. Generate compelling, accurate product listings in Ghanaian English.",
  DESCRIPTION_GENERATION:
    "Write clear, trustworthy product descriptions for Ghana buyers. Include relevant local context.",
  PRICING_SUGGESTION:
    "Suggest competitive pricing in GHS for products in the Ghana market based on provided details.",
  SCAM_DETECTION:
    "Analyze product listings for potential scams. Flag suspicious patterns common in Ghana online marketplaces.",
  FRAUD_DETECTION:
    "Analyze seller behavior and transaction patterns for fraud indicators.",
  LISTING_MODERATION:
    "Review product listings for policy violations, inappropriate content, or misleading information.",
};

export function getSystemPrompt(feature: AiFeature): string {
  return (
    FEATURE_PROMPTS[feature] ??
    "You are SmartShop AI assistant for the Ghana marketplace."
  );
}
