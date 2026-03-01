import { createRoute, z } from "@hono/zod-openapi";

export const SpeakingTypeEnum = z.enum(["normal", "interruption"]);

export const SpeakingLogSchema = z
	.object({
		id: z.string(),
		roomId: z.string(),
		phaseId: z.string(),
		participantId: z.string(),
		type: SpeakingTypeEnum,
		startedAt: z.string().datetime(),
		endedAt: z.string().datetime().nullable(),
		durationSec: z.number().int().nullable(),
	})
	.openapi("SpeakingLog");

export const QueueJoinSchema = z
	.object({
		displayName: z.string().min(1).max(100),
	})
	.openapi("QueueJoin");

export const QueueLeaveSchema = z.object({}).openapi("QueueLeave");

export const QueueNextSchema = z
	.object({
		/** Optional override: speaking duration in seconds. Falls back to phase featureFlags.speakingTimeSec. */
		speakingTimeSec: z.number().int().positive().optional(),
	})
	.openapi("QueueNext");

export const InterruptRequestSchema = z
	.object({
		displayName: z.string().min(1).max(100),
	})
	.openapi("InterruptRequest");

export const InterruptEndSchema = z
	.object({
		/** Identity (participantId) of the interrupter to end */
		participantId: z.string().min(1),
	})
	.openapi("InterruptEnd");

// Shared response schemas
const SpeakerQueueStateSchema = z
	.object({
		currentSpeaker: z
			.object({
				participantId: z.string(),
				speakingUntil: z.number(),
			})
			.nullable(),
		queue: z.array(
			z.object({
				participantId: z.string(),
				displayName: z.string(),
				requestedAt: z.number(),
			}),
		),
		interruptions: z.array(
			z.object({
				participantId: z.string(),
				displayName: z.string(),
				expiresAt: z.number(),
			}),
		),
	})
	.openapi("SpeakerQueueState");

const QueueResponseSchema = z
	.object({ success: z.boolean(), speakerQueue: SpeakerQueueStateSchema })
	.openapi("QueueResponse");

const ErrorSchema = z.object({ error: z.string() });
const ValidationErrorSchema = z.object({ error: z.string(), details: z.any() });

// Route params
const RoomIdParams = z.object({ roomId: z.string() }).openapi("SpeakingRoomIdParams");
const ParticipantIdParams = z
	.object({ roomId: z.string(), participantId: z.string() })
	.openapi("SpeakingParticipantIdParams");

// ─── Route definitions ────────────────────────────────────────────────────────

export const queueJoinRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/queue/join",
	tags: ["Speaking Queue"],
	summary: "Request to speak (join queue)",
	security: [{ ParticipantTokenAuth: [] }],
	request: {
		params: RoomIdParams,
		body: { content: { "application/json": { schema: QueueJoinSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Joined queue",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Speaking not allowed or not a room member",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Already in queue",
		},
		422: {
			content: { "application/json": { schema: ValidationErrorSchema } },
			description: "Validation error",
		},
	},
});

export const queueLeaveRoute = createRoute({
	method: "delete",
	path: "/api/rooms/{roomId}/queue/leave",
	tags: ["Speaking Queue"],
	summary: "Leave the speaking queue",
	security: [{ ParticipantTokenAuth: [] }],
	request: {
		params: RoomIdParams,
		body: { content: { "application/json": { schema: QueueLeaveSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Left queue",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not a room member",
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

export const queueNextRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/queue/next",
	tags: ["Speaking Queue"],
	summary: "Advance to next speaker",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
		body: { content: { "application/json": { schema: QueueNextSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Advanced to next speaker",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not active",
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

export const queueSkipRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/queue/skip",
	tags: ["Speaking Queue"],
	summary: "Skip the current speaker",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Speaker skipped",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not active",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
	},
});

export const interruptRequestRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/interrupt",
	tags: ["Speaking Queue"],
	summary: "Request an interruption",
	security: [{ ParticipantTokenAuth: [] }],
	request: {
		params: RoomIdParams,
		body: { content: { "application/json": { schema: InterruptRequestSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Interruption granted",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Interruption not allowed or conditions not met",
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

export const interruptEndRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/interrupt/{participantId}/end",
	tags: ["Speaking Queue"],
	summary: "Force-end an interruption",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: ParticipantIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Interruption ended",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not active",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room or interruption not found",
		},
	},
});

export const queueEndSpeakingRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/queue/end-speaking",
	tags: ["Speaking Queue"],
	summary: "End own speaking turn early",
	security: [{ ParticipantTokenAuth: [] }],
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Speaking turn ended",
		},
		401: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not the current speaker or room not active",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
	},
});

export const speakingCheckRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/speaking/check",
	tags: ["Speaking Queue"],
	summary: "Poll leader timer check: auto-advance expired speakers and interruptions",
	request: {
		params: RoomIdParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: QueueResponseSchema } },
			description: "Check complete",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not found",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Room not active",
		},
	},
});
