import { createRoute, z } from "@hono/zod-openapi";

export const JoinRoomSchema = z
	.object({
		participantToken: z.string().uuid(),
		role: z.enum(["participant", "facilitator"]).optional().default("participant"),
	})
	.openapi("JoinRoom");

export const JoinRoomResponseSchema = z
	.object({
		token: z.string(),
		livekitUrl: z.string(),
		participantId: z.string(),
		roomId: z.string(),
	})
	.openapi("JoinRoomResponse");

export const ActivateRoomResponseSchema = z
	.object({
		success: z.boolean(),
		roomId: z.string(),
		livekitRoomName: z.string(),
	})
	.openapi("ActivateRoomResponse");

export const PhaseTransitionSchema = z
	.object({
		phaseId: z.string().min(1),
	})
	.openapi("PhaseTransition");

export const PhaseTransitionResponseSchema = z
	.object({
		success: z.boolean(),
		phaseId: z.string(),
		phaseType: z.string(),
	})
	.openapi("PhaseTransitionResponse");

export const ParticipantRoleEnum = z.enum(["participant", "facilitator", "admin"]);

export const ParticipantSchema = z
	.object({
		id: z.string(),
		displayName: z.string(),
		role: ParticipantRoleEnum,
		joinedAt: z.string().datetime(),
		leftAt: z.string().datetime().nullable(),
	})
	.openapi("Participant");

// Route params
const RoomIdParamsSchema = z.object({ roomId: z.string() }).openapi("SessionRoomIdParams");

// Route definitions
export const joinRoomRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/join",
	tags: ["Session"],
	summary: "Join a room and get a LiveKit token",
	request: {
		params: RoomIdParamsSchema,
		body: {
			content: { "application/json": { schema: JoinRoomSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: JoinRoomResponseSchema } },
			description: "LiveKit token issued",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room not found",
		},
		403: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room is not active",
		},
		422: {
			content: {
				"application/json": { schema: z.object({ error: z.string(), details: z.any() }) },
			},
			description: "Validation error",
		},
	},
});

export const activateRoomRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/activate",
	tags: ["Session"],
	summary: "Activate a room: create LiveKit room and set status=active",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: ActivateRoomResponseSchema } },
			description: "Room activated",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room not found",
		},
		409: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room is already active",
		},
	},
});

export const phaseTransitionRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/phase/transition",
	tags: ["Session"],
	summary: "Transition to a new phase: update LiveKit metadata and mute controls",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParamsSchema,
		body: {
			content: { "application/json": { schema: PhaseTransitionSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PhaseTransitionResponseSchema } },
			description: "Phase transitioned",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		403: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room is not active",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room or phase not found",
		},
		422: {
			content: {
				"application/json": { schema: z.object({ error: z.string(), details: z.any() }) },
			},
			description: "Validation error",
		},
	},
});
