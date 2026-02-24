import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
	phaseActivations,
	phases,
	phaseTransitionProposals,
	phaseTransitionVotes,
	rooms,
} from "../db/schema";
import {
	buildInitialMetadata,
	buildPhaseMetadata,
	phaseFeatureFlagsToRoom,
	serializeMetadata,
	updateTransitionProposal,
} from "../livekit/metadata";
import { updateRoomMetadata } from "../livekit/room-service";
import { adminAuth } from "../middleware/admin-auth";
import {
	CastTransitionVoteSchema,
	CreateTransitionProposalSchema,
	TransitionProposalResponseSchema,
} from "../schemas/transition.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	ENVIRONMENT: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

function livekitRoomName(roomId: string): string {
	return `room-${roomId}`;
}

// ─── Route definitions ───────────────────────────────────────────────────────

const RoomIdParams = z.object({ roomId: z.string() }).openapi("TransitionRoomIdParams");
const ProposalParams = z
	.object({ roomId: z.string(), proposalId: z.string() })
	.openapi("TransitionProposalParams");

const createProposalRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/transition-proposals",
	tags: ["Transition"],
	summary: "Create a phase transition proposal",
	request: {
		params: RoomIdParams,
		body: {
			content: { "application/json": { schema: CreateTransitionProposalSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: TransitionProposalResponseSchema } },
			description: "Proposal created",
		},
		400: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Bad request",
		},
		403: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Not found",
		},
		409: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Conflict",
		},
		425: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), remainingSec: z.number() }),
				},
			},
			description: "Too early",
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

const getActiveProposalRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/transition-proposals/active",
	tags: ["Transition"],
	summary: "Get active transition proposal",
	request: { params: RoomIdParams },
	responses: {
		200: {
			content: { "application/json": { schema: TransitionProposalResponseSchema } },
			description: "Active proposal",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Not found",
		},
	},
});

const castVoteRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/transition-proposals/{proposalId}/votes",
	tags: ["Transition"],
	summary: "Cast a vote on a transition proposal",
	request: {
		params: ProposalParams,
		body: {
			content: { "application/json": { schema: CastTransitionVoteSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: TransitionProposalResponseSchema } },
			description: "Vote cast",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Not found",
		},
		409: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Conflict",
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

const rejectProposalRoute = createRoute({
	method: "delete",
	path: "/api/rooms/{roomId}/transition-proposals/{proposalId}",
	tags: ["Transition"],
	summary: "Reject a transition proposal (admin)",
	security: [{ AdminKeyAuth: [] }],
	request: { params: ProposalParams },
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ success: z.boolean() }) },
			},
			description: "Proposal rejected",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Not found",
		},
	},
});

// ─── Handlers ────────────────────────────────────────────────────────────────

app.openapi(createProposalRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const adminKey = c.req.header("X-Admin-Key");
	const isAdmin = !!adminKey && adminKey === c.env.ADMIN_API_KEY;
	const role = isAdmin ? ("admin" as const) : ("participant" as const);

	if (!isAdmin && !body.participantId) {
		return c.json({ error: "participantId is required for participants" }, 400);
	}

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}
	if (room.status !== "active") {
		return c.json({ error: "Room is not active" }, 400);
	}

	// Get current active phase activation
	const activation = await db
		.select()
		.from(phaseActivations)
		.where(and(eq(phaseActivations.roomId, roomId), isNull(phaseActivations.endedAt)))
		.get();
	if (!activation) {
		return c.json({ error: "No active phase" }, 404);
	}

	// Check for existing open proposal
	const existingProposal = await db
		.select()
		.from(phaseTransitionProposals)
		.where(
			and(eq(phaseTransitionProposals.roomId, roomId), eq(phaseTransitionProposals.status, "open")),
		)
		.get();
	if (existingProposal) {
		return c.json({ error: "An open proposal already exists" }, 409);
	}

	// Get phase for feature flags
	const phase = await db.select().from(phases).where(eq(phases.id, activation.phaseId)).get();
	if (!phase) {
		return c.json({ error: "Phase not found" }, 404);
	}

	const flags = phase.featureFlags ?? {};

	// Participant permission check
	if (role === "participant" && !flags.participantCanProposeTransition) {
		return c.json({ error: "Participants cannot propose transitions in this phase" }, 403);
	}

	// Min duration check
	if (flags.transitionMinDurationSec != null && flags.transitionMinDurationSec > 0) {
		const elapsed = (Date.now() - activation.startedAt.getTime()) / 1000;
		if (elapsed < flags.transitionMinDurationSec) {
			const remainingSec = Math.ceil(flags.transitionMinDurationSec - elapsed);
			return c.json({ error: "Too early", remainingSec }, 425);
		}
	}

	const now = new Date();
	const proposalId = crypto.randomUUID();
	const threshold = flags.transitionThreshold ?? 0.5;
	const expiresAt =
		flags.transitionVoteDurationSec != null
			? new Date(now.getTime() + flags.transitionVoteDurationSec * 1000)
			: null;

	await db.insert(phaseTransitionProposals).values({
		id: proposalId,
		roomId,
		fromPhaseId: activation.phaseId,
		toPhaseId: body.toPhaseId ?? null,
		proposedBy: isAdmin ? "admin" : body.participantId,
		proposedByRole: role,
		status: "open",
		requiredThreshold: threshold,
		expiresAt,
		createdAt: now,
	});

	// Update LiveKit metadata
	try {
		const roomName = livekitRoomName(roomId);
		const baseMetadata = buildInitialMetadata(roomId);
		const currentFlags = phaseFeatureFlagsToRoom(flags);
		const metadata = buildPhaseMetadata(baseMetadata, activation.phaseId, phase.type, currentFlags);
		const updatedMetadata = updateTransitionProposal(metadata, {
			id: proposalId,
			proposedByRole: role,
			status: "open",
			yesCount: 0,
			noCount: 0,
			totalVoted: 0,
			requiredThreshold: threshold,
			expiresAt: expiresAt ? expiresAt.toISOString() : null,
		});
		await updateRoomMetadata(roomName, serializeMetadata(updatedMetadata));
	} catch {
		// Non-fatal
	}

	return c.json(
		{
			id: proposalId,
			fromPhaseId: activation.phaseId,
			toPhaseId: body.toPhaseId ?? null,
			proposedByRole: role,
			status: "open" as const,
			yesCount: 0,
			noCount: 0,
			totalVoted: 0,
			requiredThreshold: threshold,
			expiresAt: expiresAt ? expiresAt.toISOString() : null,
			createdAt: now.toISOString(),
		},
		201,
	);
});

app.openapi(getActiveProposalRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const proposal = await db
		.select()
		.from(phaseTransitionProposals)
		.where(
			and(eq(phaseTransitionProposals.roomId, roomId), eq(phaseTransitionProposals.status, "open")),
		)
		.get();
	if (!proposal) {
		return c.json({ error: "No active proposal" }, 404);
	}

	// Count votes
	const votes = await db
		.select()
		.from(phaseTransitionVotes)
		.where(eq(phaseTransitionVotes.proposalId, proposal.id))
		.all();

	const yesCount = votes.filter((v) => v.choice === "yes").length;
	const noCount = votes.filter((v) => v.choice === "no").length;

	return c.json(
		{
			id: proposal.id,
			fromPhaseId: proposal.fromPhaseId,
			toPhaseId: proposal.toPhaseId ?? null,
			proposedByRole: proposal.proposedByRole,
			status: proposal.status,
			yesCount,
			noCount,
			totalVoted: yesCount + noCount,
			requiredThreshold: proposal.requiredThreshold,
			expiresAt: proposal.expiresAt ? proposal.expiresAt.toISOString() : null,
			createdAt: proposal.createdAt.toISOString(),
		},
		200,
	);
});

app.openapi(castVoteRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, proposalId } = c.req.valid("param");
	const body = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const proposal = await db
		.select()
		.from(phaseTransitionProposals)
		.where(eq(phaseTransitionProposals.id, proposalId))
		.get();
	if (!proposal) {
		return c.json({ error: "Proposal not found" }, 404);
	}
	if (proposal.status !== "open") {
		return c.json({ error: "Proposal is not open" }, 409);
	}

	// Check duplicate vote
	const existingVote = await db
		.select()
		.from(phaseTransitionVotes)
		.where(
			and(
				eq(phaseTransitionVotes.proposalId, proposalId),
				eq(phaseTransitionVotes.participantId, body.participantId),
			),
		)
		.get();
	if (existingVote) {
		return c.json({ error: "Already voted" }, 409);
	}

	const now = new Date();
	await db.insert(phaseTransitionVotes).values({
		id: crypto.randomUUID(),
		proposalId,
		participantId: body.participantId,
		choice: body.choice,
		createdAt: now,
	});

	// Get all votes
	const allVotes = await db
		.select()
		.from(phaseTransitionVotes)
		.where(eq(phaseTransitionVotes.proposalId, proposalId))
		.all();

	const yesCount = allVotes.filter((v) => v.choice === "yes").length;
	const noCount = allVotes.filter((v) => v.choice === "no").length;
	const totalVoted = yesCount + noCount;

	// Check threshold
	let currentStatus: string = proposal.status;
	if (totalVoted > 0 && yesCount / totalVoted >= proposal.requiredThreshold) {
		// Approved - transition phase
		currentStatus = "approved";
		await db
			.update(phaseTransitionProposals)
			.set({ status: "approved", resolvedAt: now })
			.where(eq(phaseTransitionProposals.id, proposalId));

		// Determine target phase
		let targetPhaseId = proposal.toPhaseId;
		if (!targetPhaseId) {
			// Auto-determine next phase by sortOrder
			const currentPhase = await db
				.select()
				.from(phases)
				.where(eq(phases.id, proposal.fromPhaseId))
				.get();
			if (currentPhase) {
				const nextPhase = await db
					.select()
					.from(phases)
					.where(and(eq(phases.roomId, roomId), gt(phases.sortOrder, currentPhase.sortOrder)))
					.orderBy(phases.sortOrder)
					.get();
				if (nextPhase) {
					targetPhaseId = nextPhase.id;
				}
			}
		}

		if (targetPhaseId) {
			// Close current activation
			await db
				.update(phaseActivations)
				.set({ endedAt: now })
				.where(and(eq(phaseActivations.roomId, roomId), isNull(phaseActivations.endedAt)));

			// Create new activation
			await db.insert(phaseActivations).values({
				id: crypto.randomUUID(),
				roomId,
				phaseId: targetPhaseId,
				startedBy: "vote",
				startedAt: now,
			});

			// Update LiveKit metadata
			try {
				const targetPhase = await db
					.select()
					.from(phases)
					.where(eq(phases.id, targetPhaseId))
					.get();
				if (targetPhase) {
					const roomName = livekitRoomName(roomId);
					const flags = phaseFeatureFlagsToRoom(targetPhase.featureFlags ?? {});
					const baseMetadata = buildInitialMetadata(roomId);
					const newMetadata = buildPhaseMetadata(
						baseMetadata,
						targetPhaseId,
						targetPhase.type,
						flags,
					);
					await updateRoomMetadata(roomName, serializeMetadata(newMetadata));
				}
			} catch {
				// Non-fatal
			}
		}
	} else {
		// Update metadata with new vote counts
		try {
			const phase = await db.select().from(phases).where(eq(phases.id, proposal.fromPhaseId)).get();
			if (phase) {
				const roomName = livekitRoomName(roomId);
				const flags = phaseFeatureFlagsToRoom(phase.featureFlags ?? {});
				const baseMetadata = buildInitialMetadata(roomId);
				const metadata = buildPhaseMetadata(baseMetadata, proposal.fromPhaseId, phase.type, flags);
				const updatedMetadata = updateTransitionProposal(metadata, {
					id: proposalId,
					proposedByRole: proposal.proposedByRole,
					status: "open",
					yesCount,
					noCount,
					totalVoted,
					requiredThreshold: proposal.requiredThreshold,
					expiresAt: proposal.expiresAt ? proposal.expiresAt.toISOString() : null,
				});
				await updateRoomMetadata(roomName, serializeMetadata(updatedMetadata));
			}
		} catch {
			// Non-fatal
		}
	}

	return c.json(
		{
			id: proposal.id,
			fromPhaseId: proposal.fromPhaseId,
			toPhaseId: proposal.toPhaseId ?? null,
			proposedByRole: proposal.proposedByRole,
			status: currentStatus as "open" | "approved",
			yesCount,
			noCount,
			totalVoted,
			requiredThreshold: proposal.requiredThreshold,
			expiresAt: proposal.expiresAt ? proposal.expiresAt.toISOString() : null,
			createdAt: proposal.createdAt.toISOString(),
		},
		200,
	);
});

// DELETE - admin reject
app.use("/api/rooms/:roomId/transition-proposals/:proposalId", adminAuth);
app.openapi(rejectProposalRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, proposalId } = c.req.valid("param");

	const proposal = await db
		.select()
		.from(phaseTransitionProposals)
		.where(eq(phaseTransitionProposals.id, proposalId))
		.get();
	if (!proposal) {
		return c.json({ error: "Proposal not found" }, 404);
	}

	const now = new Date();
	await db
		.update(phaseTransitionProposals)
		.set({ status: "rejected_by_admin", resolvedAt: now })
		.where(eq(phaseTransitionProposals.id, proposalId));

	// Clear LiveKit metadata
	try {
		const phase = await db.select().from(phases).where(eq(phases.id, proposal.fromPhaseId)).get();
		if (phase) {
			const roomName = livekitRoomName(roomId);
			const flags = phaseFeatureFlagsToRoom(phase.featureFlags ?? {});
			const baseMetadata = buildInitialMetadata(roomId);
			const metadata = buildPhaseMetadata(baseMetadata, proposal.fromPhaseId, phase.type, flags);
			await updateRoomMetadata(roomName, serializeMetadata(metadata));
		}
	} catch {
		// Non-fatal
	}

	return c.json({ success: true }, 200);
});

export default app;
