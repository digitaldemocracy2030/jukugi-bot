import { createRoute, z } from "@hono/zod-openapi";

export const PhaseTypeEnum = z.enum(["video", "discussion", "voting", "survey"]);

// --- Transition feature flags (common to all phase types) ---
export const TransitionFeatureFlagsSchema = z.object({
	participantCanProposeTransition: z.boolean().optional(),
	transitionMinDurationSec: z.number().int().nonnegative().optional(),
	transitionThreshold: z.number().min(0).max(1).optional(),
	transitionVoteDurationSec: z.number().int().positive().optional(),
});

// --- Per-type FeatureFlags schemas ---
export const VideoPhaseFeatureFlagsSchema =
	TransitionFeatureFlagsSchema.strict().openapi("VideoPhaseFeatureFlags");

export const DiscussionPhaseFeatureFlagsSchema = TransitionFeatureFlagsSchema.extend({
	canSpeak: z.boolean().optional(),
	speakingTimeSec: z.number().int().positive().optional(),
	canInterrupt: z.boolean().optional(),
	interruptionTimeSec: z.number().int().positive().optional(),
	interruptionCooldownSec: z.number().int().positive().optional(),
	maxInterruptions: z.number().int().positive().optional(),
})
	.strict()
	.openapi("DiscussionPhaseFeatureFlags");

export const VotingPhaseFeatureFlagsSchema = TransitionFeatureFlagsSchema.extend({
	canVote: z.boolean().optional(),
})
	.strict()
	.openapi("VotingPhaseFeatureFlags");

export const SurveyPhaseFeatureFlagsSchema =
	TransitionFeatureFlagsSchema.strict().openapi("SurveyPhaseFeatureFlags");

// --- Per-type Config schemas ---
export const VideoPhaseConfigSchema = z
	.object({
		videoUrl: z.string().optional(),
		autoAdvance: z.boolean().optional(),
	})
	.openapi("VideoPhaseConfig");

export const DiscussionPhaseConfigSchema = z
	.object({
		topic: z.string().optional(),
		summaryModel: z.string().optional(),
		summaryPromptTemplateId: z.string().optional(),
		summaryGraphEnabled: z.boolean().optional(),
	})
	.openapi("DiscussionPhaseConfig");

export const VotingPhaseConfigSchema = z
	.object({
		question: z.string().optional(),
		options: z.array(z.string()).optional(),
	})
	.openapi("VotingPhaseConfig");

export const SurveyPhaseConfigSchema = z
	.object({
		questions: z
			.array(
				z.object({
					id: z.string(),
					text: z.string(),
					type: z.enum(["text", "scale", "choice"]),
					options: z.array(z.string()).optional(),
				}),
			)
			.optional(),
	})
	.openapi("SurveyPhaseConfig");

// --- Flat FeatureFlags schema kept for UpdatePhaseSchema (partial update convenience) ---
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

// --- Base fields shared by all phase response schemas ---
const BasePhaseFields = {
	id: z.string(),
	roomId: z.string(),
	title: z.string(),
	sortOrder: z.number().int(),
	createdAt: z.string().datetime(),
};

// --- Per-type Phase response schemas ---
const VideoPhaseSchema = z
	.object({
		...BasePhaseFields,
		type: z.literal("video"),
		config: VideoPhaseConfigSchema,
		featureFlags: VideoPhaseFeatureFlagsSchema,
	})
	.openapi("VideoPhase");

const DiscussionPhaseSchema = z
	.object({
		...BasePhaseFields,
		type: z.literal("discussion"),
		config: DiscussionPhaseConfigSchema,
		featureFlags: DiscussionPhaseFeatureFlagsSchema,
	})
	.openapi("DiscussionPhase");

const VotingPhaseSchema = z
	.object({
		...BasePhaseFields,
		type: z.literal("voting"),
		config: VotingPhaseConfigSchema,
		featureFlags: VotingPhaseFeatureFlagsSchema,
	})
	.openapi("VotingPhase");

const SurveyPhaseSchema = z
	.object({
		...BasePhaseFields,
		type: z.literal("survey"),
		config: SurveyPhaseConfigSchema,
		featureFlags: SurveyPhaseFeatureFlagsSchema,
	})
	.openapi("SurveyPhase");

export const PhaseSchema = z
	.discriminatedUnion("type", [
		VideoPhaseSchema,
		DiscussionPhaseSchema,
		VotingPhaseSchema,
		SurveyPhaseSchema,
	])
	.openapi("Phase");

export const CreatePhaseSchema = z
	.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("video"),
				title: z.string().min(1).max(200),
				sortOrder: z.number().int().min(0).optional(),
				config: VideoPhaseConfigSchema.optional().default({}),
				featureFlags: VideoPhaseFeatureFlagsSchema.optional().default({}),
			})
			.openapi("CreateVideoPhase"),
		z
			.object({
				type: z.literal("discussion"),
				title: z.string().min(1).max(200),
				sortOrder: z.number().int().min(0).optional(),
				config: DiscussionPhaseConfigSchema.optional().default({}),
				featureFlags: DiscussionPhaseFeatureFlagsSchema.optional().default({}),
			})
			.openapi("CreateDiscussionPhase"),
		z
			.object({
				type: z.literal("voting"),
				title: z.string().min(1).max(200),
				sortOrder: z.number().int().min(0).optional(),
				config: VotingPhaseConfigSchema.optional().default({}),
				featureFlags: VotingPhaseFeatureFlagsSchema.optional().default({}),
			})
			.openapi("CreateVotingPhase"),
		z
			.object({
				type: z.literal("survey"),
				title: z.string().min(1).max(200),
				sortOrder: z.number().int().min(0).optional(),
				config: SurveyPhaseConfigSchema.optional().default({}),
				featureFlags: SurveyPhaseFeatureFlagsSchema.optional().default({}),
			})
			.openapi("CreateSurveyPhase"),
	])
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

// --- TypeScript inferred types ---
export type VideoPhaseFeatureFlags = z.infer<typeof VideoPhaseFeatureFlagsSchema>;
export type DiscussionPhaseFeatureFlags = z.infer<typeof DiscussionPhaseFeatureFlagsSchema>;
export type VotingPhaseFeatureFlags = z.infer<typeof VotingPhaseFeatureFlagsSchema>;
export type SurveyPhaseFeatureFlags = z.infer<typeof SurveyPhaseFeatureFlagsSchema>;
export type PhaseFeatureFlags =
	| VideoPhaseFeatureFlags
	| DiscussionPhaseFeatureFlags
	| VotingPhaseFeatureFlags
	| SurveyPhaseFeatureFlags;

export type VideoPhaseConfig = z.infer<typeof VideoPhaseConfigSchema>;
export type DiscussionPhaseConfig = z.infer<typeof DiscussionPhaseConfigSchema>;
export type VotingPhaseConfig = z.infer<typeof VotingPhaseConfigSchema>;
export type SurveyPhaseConfig = z.infer<typeof SurveyPhaseConfigSchema>;
export type PhaseConfig =
	| VideoPhaseConfig
	| DiscussionPhaseConfig
	| VotingPhaseConfig
	| SurveyPhaseConfig;

/**
 * Flat featureFlags type for DB storage — all fields optional regardless of phase type.
 * Used as the Drizzle $type<> annotation so other routes (speaking, transition, session)
 * can access any flag without discriminant narrowing.
 */
export type DbPhaseFeatureFlags = z.infer<typeof PhaseFeatureFlagsSchema>;

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
