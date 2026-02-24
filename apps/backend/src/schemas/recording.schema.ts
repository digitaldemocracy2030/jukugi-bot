import { createRoute, z } from "@hono/zod-openapi";

// ─── Shared ───────────────────────────────────────────────────────────────────

const RoomIdParams = z.object({ roomId: z.string() }).openapi("RecordingRoomIdParams");
const ErrorSchema = z.object({ error: z.string() });
const ValidationErrorSchema = z.object({ error: z.string(), details: z.any() });

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RecordingSchema = z
	.object({
		id: z.string(),
		roomId: z.string(),
		egressId: z.string(),
		status: z.enum(["recording", "completed", "failed"]),
		storageKey: z.string().nullable(),
		storageUrl: z.string().nullable(),
		startedAt: z.string().datetime(),
		endedAt: z.string().datetime().nullable(),
		durationSec: z.number().int().nullable(),
		fileSize: z.number().int().nullable(),
	})
	.openapi("Recording");

export const StartRecordingResponseSchema = z
	.object({
		recordingId: z.string(),
		egressId: z.string(),
	})
	.openapi("StartRecordingResponse");

export const StopRecordingResponseSchema = z
	.object({
		success: z.boolean(),
		recordingId: z.string(),
	})
	.openapi("StopRecordingResponse");

export const RecordingListResponseSchema = z
	.object({
		recordings: z.array(RecordingSchema),
	})
	.openapi("RecordingListResponse");

// ─── Routes ───────────────────────────────────────────────────────────────────

export const startRecordingRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/recording/start",
	tags: ["Recording"],
	summary: "Start recording a room via LiveKit Egress → R2",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: StartRecordingResponseSchema } },
			description: "Recording started",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Recording already in progress",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Failed to start recording",
		},
	},
});

export const stopRecordingRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/recording/stop",
	tags: ["Recording"],
	summary: "Stop the active recording for a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: StopRecordingResponseSchema } },
			description: "Recording stopped",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room or active recording not found",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Failed to stop recording",
		},
	},
});

export const listRecordingsRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/recordings",
	tags: ["Recording"],
	summary: "List recordings for a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: RecordingListResponseSchema } },
			description: "List of recordings",
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
