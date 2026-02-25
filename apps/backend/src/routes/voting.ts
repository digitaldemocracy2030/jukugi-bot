import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { phases, rooms, votingAnswers } from "../db/schema";
import { generateId } from "../lib/id";
import type { ParticipantRoomVariables } from "../middleware/participant-auth";
import { participantRoomAuth } from "../middleware/participant-auth";
import type { VotingPhaseConfig } from "../schemas/phase.schema";
import { getVotingResultsRoute, submitVoteRoute } from "../schemas/voting.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
};

const app = new OpenAPIHono<{
	Bindings: Bindings;
	Variables: ParticipantRoomVariables;
}>();

// ─── POST /api/rooms/:roomId/phases/:phaseId/votes ──────────────────────────

app.use("/api/rooms/:roomId/phases/:phaseId/votes", participantRoomAuth);
app.openapi(submitVoteRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");
	const { selectedOption } = c.req.valid("json");
	const participant = c.var.participant;

	// Validate room exists and is active
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room || room.status !== "active") {
		return c.json({ error: "Room not found or not active" }, 404);
	}

	// Validate phase exists, belongs to room, and is a voting phase
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase || phase.roomId !== roomId || phase.type !== "voting") {
		return c.json({ error: "Voting phase not found" }, 404);
	}

	// Validate selectedOption is one of the configured options
	const config = (phase.config ?? {}) as VotingPhaseConfig;
	if (config.options && config.options.length > 0) {
		if (!config.options.includes(selectedOption)) {
			return c.json({ error: "Invalid option" }, 400);
		}
	}

	// Check for canVote feature flag
	const featureFlags = phase.featureFlags ?? {};
	if ("canVote" in featureFlags && featureFlags.canVote === false) {
		return c.json({ error: "Voting is not enabled for this phase" }, 400);
	}

	// Check for duplicate vote
	const existing = await db
		.select()
		.from(votingAnswers)
		.where(and(eq(votingAnswers.phaseId, phaseId), eq(votingAnswers.participantId, participant.id)))
		.get();

	if (existing) {
		return c.json({ error: "Already voted" }, 409);
	}

	const id = generateId();
	const now = new Date();

	await db.insert(votingAnswers).values({
		id,
		roomId,
		phaseId,
		participantId: participant.id,
		selectedOption,
		createdAt: now,
	});

	return c.json(
		{
			id,
			participantId: participant.id,
			selectedOption,
			createdAt: now.toISOString(),
		},
		201,
	);
});

// ─── GET /api/rooms/:roomId/phases/:phaseId/votes/results ───────────────────

app.openapi(getVotingResultsRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");

	// Validate phase exists and belongs to room
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase || phase.roomId !== roomId || phase.type !== "voting") {
		return c.json({ error: "Voting phase not found" }, 404);
	}

	// Aggregate votes by option
	const rows = await db
		.select({
			selectedOption: votingAnswers.selectedOption,
			count: sql<number>`count(*)`.as("count"),
		})
		.from(votingAnswers)
		.where(eq(votingAnswers.phaseId, phaseId))
		.groupBy(votingAnswers.selectedOption)
		.all();

	const results: Record<string, number> = {};
	let totalVotes = 0;

	// Initialize all configured options to 0
	const config = (phase.config ?? {}) as VotingPhaseConfig;
	if (config.options) {
		for (const option of config.options) {
			results[option] = 0;
		}
	}

	// Fill in actual counts
	for (const row of rows) {
		results[row.selectedOption] = row.count;
		totalVotes += row.count;
	}

	return c.json({ totalVotes, results }, 200);
});

export default app;
