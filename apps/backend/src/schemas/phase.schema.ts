import { createRoute, z } from "@hono/zod-openapi";

export const PhaseTypeEnum = z.enum(["video", "discussion", "voting", "survey"]);

export const PhaseFeatureFlagsSchema = z
	.object({
		canSpeak: z.boolean().optional(),
		canInterrupt: z.boolean().optional(),
		canVote: z.boolean().optional(),
		speakingTimeSec: z.number().int().positive().optional(),
		interruptionTimeSec: z.number().int().positive().optional(),
		interruptionCooldownSec: z.number().int().positive().optional(),
		maxInterruptions: z.number().int().positive().optional(),
		participantCanProposeTransition: z.boolean().optional(),
		transitionMinDurationSec: z.number().int().nonnegative().optional(),
		transitionThreshold: z.number().min(0).max(1).optional(),
		transitionVoteDurationSec: z.number().int().positive().optional(),
	})
	.openapi("PhaseFeatureFlags");

export const PhaseSchema = z
	.object({
		id: z.string(),
		roomId: z.string(),
		type: PhaseTypeEnum,
		title: z.string(),
		sortOrder: z.number().int(),
		config: z.record(z.string(), z.unknown()),
		featureFlags: PhaseFeatureFlagsSchema,
		createdAt: z.string().datetime(),
	})
	.openapi("Phase");

export const CreatePhaseSchema = z
	.object({
		type: PhaseTypeEnum,
		title: z.string().min(1).max(200),
		sortOrder: z.number().int().min(0).optional(),
		config: z.record(z.string(), z.unknown()).optional().default({}),
		featureFlags: PhaseFeatureFlagsSchema.optional().default({}),
	})
	.openapi("CreatePhase");

export const UpdatePhaseSchema = z
	.object({
		type: PhaseTypeEnum.optional(),
		title: z.string().min(1).max(200).optional(),
		sortOrder: z.number().int().min(0).optional(),
		config: z.record(z.string(), z.unknown()).optional(),
		featureFlags: PhaseFeatureFlagsSchema.optional(),
	})
	.openapi("UpdatePhase");

export const ReorderPhasesSchema = z
	.object({
		orderedIds: z.array(z.string()).min(1),
	})
	.openapi("ReorderPhases");

export const PhaseParamsSchema = z
	.object({
		roomId: z.string(),
		phaseId: z.string(),
	})
	.openapi("PhaseParams");

export const RoomIdParamsSchema = z
	.object({
		roomId: z.string(),
	})
	.openapi("RoomIdParams");

// Route definitions
export const addPhaseRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/phases",
	tags: ["Phases"],
	summary: "Add a phase to a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParamsSchema,
		body: {
			content: { "application/json": { schema: CreatePhaseSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: PhaseSchema } },
			description: "Phase created",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		422: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), details: z.any() }),
				},
			},
			description: "Validation error",
		},
	},
});

export const listPhasesRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/phases",
	tags: ["Phases"],
	summary: "List phases for a room",
	request: {
		params: RoomIdParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.array(PhaseSchema) } },
			description: "List of phases",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
		},
	},
});

export const updatePhaseRoute = createRoute({
	method: "patch",
	path: "/api/rooms/{roomId}/phases/{phaseId}",
	tags: ["Phases"],
	summary: "Update a phase",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: PhaseParamsSchema,
		body: {
			content: { "application/json": { schema: UpdatePhaseSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PhaseSchema } },
			description: "Phase updated",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Phase not found",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		422: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), details: z.any() }),
				},
			},
			description: "Validation error",
		},
	},
});

export const deletePhaseRoute = createRoute({
	method: "delete",
	path: "/api/rooms/{roomId}/phases/{phaseId}",
	tags: ["Phases"],
	summary: "Delete a phase",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: PhaseParamsSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ success: z.boolean() }) },
			},
			description: "Phase deleted",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Phase not found",
		},
	},
});

export const reorderPhasesRoute = createRoute({
	method: "put",
	path: "/api/rooms/{roomId}/phases/reorder",
	tags: ["Phases"],
	summary: "Reorder phases in a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomIdParamsSchema,
		body: {
			content: { "application/json": { schema: ReorderPhasesSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.array(PhaseSchema) } },
			description: "Phases reordered",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
		},
		422: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), details: z.any() }),
				},
			},
			description: "Validation error",
		},
	},
});
