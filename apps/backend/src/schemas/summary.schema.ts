import { createRoute, z } from "@hono/zod-openapi";

// ─── Shared ───────────────────────────────────────────────────────────────────

const RoomPhaseParams = z
	.object({
		roomId: z.string(),
		phaseId: z.string(),
	})
	.openapi("SummaryRoomPhaseParams");

const ErrorSchema = z.object({ error: z.string() });
const ValidationErrorSchema = z.object({ error: z.string(), details: z.any() });

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const SummarySchema = z
	.object({
		id: z.string(),
		roomId: z.string(),
		phaseId: z.string(),
		content: z.string(),
		model: z.string(),
		promptTokens: z.number().nullable(),
		completionTokens: z.number().nullable(),
		transcriptCount: z.number(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("DiscussionSummary");

const GenerateSkippedSchema = z
	.object({
		skipped: z.literal(true),
		reason: z.enum(["too_recent", "no_new_transcripts"]),
	})
	.openapi("GenerateSkipped");

const LatestSummaryResponseSchema = z
	.object({
		summary: SummarySchema.nullable(),
	})
	.openapi("LatestSummaryResponse");

// ─── Routes ───────────────────────────────────────────────────────────────────

export const generateSummaryRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/phases/{phaseId}/summaries/generate",
	tags: ["Summary"],
	summary: "Trigger summary generation for a discussion phase",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomPhaseParams,
	},
	responses: {
		201: {
			content: { "application/json": { schema: SummarySchema } },
			description: "Summary generated",
		},
		200: {
			content: { "application/json": { schema: GenerateSkippedSchema } },
			description: "Skipped (too recent or no new transcripts)",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room or phase not found",
		},
		422: {
			content: { "application/json": { schema: ValidationErrorSchema } },
			description: "Validation error",
		},
		503: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "LLM not configured",
		},
	},
});

export const getLatestSummaryRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/phases/{phaseId}/summaries/latest",
	tags: ["Summary"],
	summary: "Get the latest discussion summary",
	request: {
		params: RoomPhaseParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: LatestSummaryResponseSchema } },
			description: "Latest summary (or null if none exists)",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room or phase not found",
		},
		422: {
			content: { "application/json": { schema: ValidationErrorSchema } },
			description: "Validation error",
		},
	},
});
