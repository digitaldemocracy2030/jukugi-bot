import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable("rooms", {
	id: text("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	description: text("description"),
	status: text("status", { enum: ["draft", "active", "completed", "archived"] })
		.notNull()
		.default("draft"),
	maxParticipants: integer("max_participants").notNull().default(10),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const phases = sqliteTable("phases", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["video", "discussion", "voting", "survey"] }).notNull(),
	title: text("title").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	config: text("config", { mode: "json" }).$type<Record<string, unknown>>().default({}),
	featureFlags: text("feature_flags", { mode: "json" })
		.$type<{
			canSpeak?: boolean;
			canInterrupt?: boolean;
			canVote?: boolean;
			speakingTimeSec?: number;
			interruptionTimeSec?: number;
			interruptionCooldownSec?: number;
			maxInterruptions?: number;
			participantCanProposeTransition?: boolean;
			transitionMinDurationSec?: number;
			transitionThreshold?: number;
			transitionVoteDurationSec?: number;
		}>()
		.default({}),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

/** Identity master — one record per human, persisted across sessions */
export const participants = sqliteTable("participants", {
	id: text("id").primaryKey(), // UUID = participantToken stored in localStorage
	displayName: text("display_name").notNull(),
	recoveryCode: text("recovery_code").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

/** Per-room participation records (formerly `participants`) */
export const sessionParticipations = sqliteTable("session_participations", {
	id: text("id").primaryKey(),
	participantId: text("participant_id")
		.notNull()
		.references(() => participants.id, { onDelete: "cascade" }),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["participant", "facilitator", "admin"] })
		.notNull()
		.default("participant"),
	joinedAt: integer("joined_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	leftAt: integer("left_at", { mode: "timestamp" }),
});

export const recordings = sqliteTable("recordings", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	egressId: text("egress_id").notNull().unique(),
	status: text("status", { enum: ["recording", "completed", "failed"] })
		.notNull()
		.default("recording"),
	storageKey: text("storage_key"),
	storageUrl: text("storage_url"),
	startedAt: integer("started_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	endedAt: integer("ended_at", { mode: "timestamp" }),
	durationSec: integer("duration_sec"),
	fileSize: integer("file_size"),
});

export const transcripts = sqliteTable("transcripts", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	participantId: text("participant_id").references(() => sessionParticipations.id, {
		onDelete: "set null",
	}),
	phaseId: text("phase_id").references(() => phases.id, { onDelete: "set null" }),
	content: text("content").notNull(),
	language: text("language").notNull().default("ja"),
	confidence: real("confidence"),
	isFinal: integer("is_final", { mode: "boolean" }).notNull().default(false),
	startOffsetMs: integer("start_offset_ms"),
	endOffsetMs: integer("end_offset_ms"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const speakingLog = sqliteTable("speaking_log", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	phaseId: text("phase_id")
		.notNull()
		.references(() => phases.id, { onDelete: "cascade" }),
	participantId: text("participant_id")
		.notNull()
		.references(() => sessionParticipations.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["normal", "interruption"] })
		.notNull()
		.default("normal"),
	startedAt: integer("started_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	endedAt: integer("ended_at", { mode: "timestamp" }),
	durationSec: integer("duration_sec"),
});

export const phaseActivations = sqliteTable("phase_activations", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	phaseId: text("phase_id")
		.notNull()
		.references(() => phases.id, { onDelete: "cascade" }),
	startedBy: text("started_by").notNull(),
	startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
	endedAt: integer("ended_at", { mode: "timestamp" }),
});

export const phaseTransitionProposals = sqliteTable("phase_transition_proposals", {
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	fromPhaseId: text("from_phase_id")
		.notNull()
		.references(() => phases.id, { onDelete: "cascade" }),
	toPhaseId: text("to_phase_id"),
	proposedBy: text("proposed_by").notNull(),
	proposedByRole: text("proposed_by_role", { enum: ["admin", "participant"] }).notNull(),
	status: text("status", {
		enum: ["open", "approved", "rejected_by_admin", "expired", "cancelled"],
	})
		.notNull()
		.default("open"),
	requiredThreshold: real("required_threshold").notNull().default(0.5),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	resolvedAt: integer("resolved_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const phaseTransitionVotes = sqliteTable(
	"phase_transition_votes",
	{
		id: text("id").primaryKey(),
		proposalId: text("proposal_id")
			.notNull()
			.references(() => phaseTransitionProposals.id, { onDelete: "cascade" }),
		participantId: text("participant_id").notNull(),
		choice: text("choice", { enum: ["yes", "no"] }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		uniqueIndex("phase_transition_votes_proposal_participant_uniq").on(
			table.proposalId,
			table.participantId,
		),
	],
);
