import { createRoute, z } from "@hono/zod-openapi";

// ─── Shared ───────────────────────────────────────────────────────────────────

const RoomIdParams = z.object({ roomId: z.string() }).openapi("TranscriptionRoomIdParams");
const ErrorSchema = z.object({ error: z.string() });
const ValidationErrorSchema = z.object({ error: z.string(), details: z.any() });

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateTranscriptSchema = z
	.object({
		participantId: z.string().optional(),
		phaseId: z.string().optional(),
		content: z.string().min(1),
		language: z.string().default("ja"),
		confidence: z.number().min(0).max(1).optional(),
		isFinal: z.boolean().default(false),
		startOffsetMs: z.number().int().nonnegative().optional(),
		endOffsetMs: z.number().int().nonnegative().optional(),
	})
	.openapi("CreateTranscript");

export const TranscriptSchema = z
	.object({
		id: z.string(),
		roomId: z.string(),
		participantId: z.string().nullable(),
		phaseId: z.string().nullable(),
		content: z.string(),
		language: z.string(),
		confidence: z.number().nullable(),
		isFinal: z.boolean(),
		startOffsetMs: z.number().int().nullable(),
		endOffsetMs: z.number().int().nullable(),
		createdAt: z.string().datetime(),
	})
	.openapi("Transcript");

export const CreateTranscriptResponseSchema = z
	.object({
		transcriptId: z.string(),
	})
	.openapi("CreateTranscriptResponse");

export const TranscriptListResponseSchema = z
	.object({
		transcripts: z.array(TranscriptSchema),
	})
	.openapi("TranscriptListResponse");

export const TranscriptQuerySchema = z
	.object({
		phaseId: z.string().optional(),
		participantId: z.string().optional(),
		finalOnly: z
			.string()
			.optional()
			.transform((v) => v === "true"),
	})
	.openapi("TranscriptQuery");

// ─── Routes ───────────────────────────────────────────────────────────────────

export const createTranscriptRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/transcripts",
	tags: ["Transcription"],
	summary: "Save a transcript segment (called by LiveKit Agent)",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
		body: {
			content: { "application/json": { schema: CreateTranscriptSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: CreateTranscriptResponseSchema } },
			description: "Transcript saved",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
		422: {
			content: { "application/json": { schema: ValidationErrorSchema } },
			description: "Validation error",
		},
	},
});

export const listTranscriptsRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/transcripts",
	tags: ["Transcription"],
	summary: "List transcripts for a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
		query: TranscriptQuerySchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: TranscriptListResponseSchema } },
			description: "List of transcripts",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
		422: {
			content: { "application/json": { schema: ValidationErrorSchema } },
			description: "Validation error",
		},
	},
});
