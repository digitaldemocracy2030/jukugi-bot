/**
 * LLM utility module using Vercel AI SDK.
 *
 * Singleton pattern — call `initAi(env)` once per request in middleware,
 * then use `getModel("medium")` etc. from anywhere without passing env.
 *
 * Model sizes:
 *   large  — highest quality, slowest, most expensive
 *   medium — balanced (default)
 *   small  — fastest, cheapest, good for simple tasks
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { generateText } from "ai";
import { buildSystemPrompt, buildUserPrompt } from "./prompts/summary";

export type ModelSize = "large" | "medium" | "small";

export interface AiEnv {
	OPENAI_API_KEY?: string;
	AI_MODEL_LARGE?: string;
	AI_MODEL_MEDIUM?: string;
	AI_MODEL_SMALL?: string;
}

const DEFAULT_MODELS: Record<ModelSize, string> = {
	large: "gpt-4o",
	medium: "gpt-4o-mini",
	small: "gpt-4o-mini",
};

let _env: AiEnv | null = null;

/**
 * Initialize the module-level AI configuration.
 * Call this once per request in Hono middleware via `initAi(c.env)`.
 */
export function initAi(env: AiEnv): void {
	_env = env;
}

function getEnv(): AiEnv {
	if (!_env) throw new Error("AI not initialized. Call initAi(env) first.");
	return _env;
}

/** Check whether the AI feature is available (API key configured). */
export function isAiConfigured(): boolean {
	return !!_env?.OPENAI_API_KEY;
}

/** Resolve the model ID string for a given size. */
export function resolveModelId(size: ModelSize = "medium"): string {
	const env = getEnv();
	if (size === "large") return env.AI_MODEL_LARGE ?? DEFAULT_MODELS.large;
	if (size === "small") return env.AI_MODEL_SMALL ?? DEFAULT_MODELS.small;
	return env.AI_MODEL_MEDIUM ?? DEFAULT_MODELS.medium;
}

/** Get a LanguageModel instance for the given size. */
export function getModel(size: ModelSize = "medium"): LanguageModel {
	const env = getEnv();
	const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
	return openai(resolveModelId(size));
}

export type SummaryResult = {
	text: string;
	promptTokens: number;
	completionTokens: number;
	model: string;
};

export type SummaryOptions = {
	modelId?: string;
	systemPrompt?: string;
	userPrompt?: string;
};

export async function generateSummaryText(
	previousSummary: string | null,
	newTranscripts: string,
	size: ModelSize = "medium",
	options?: SummaryOptions,
): Promise<SummaryResult> {
	let model: LanguageModel;
	let modelId: string;

	if (options?.modelId) {
		const env = getEnv();
		const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
		model = openai(options.modelId);
		modelId = options.modelId;
	} else {
		model = getModel(size);
		modelId = resolveModelId(size);
	}

	const result = await generateText({
		model,
		system: options?.systemPrompt ?? buildSystemPrompt(),
		prompt: options?.userPrompt ?? buildUserPrompt(previousSummary, newTranscripts),
	});

	return {
		text: result.text,
		promptTokens: result.usage?.inputTokens ?? 0,
		completionTokens: result.usage?.outputTokens ?? 0,
		model: modelId,
	};
}
