import { createRoute, z } from "@hono/zod-openapi";

// --- Request / Response schemas ---

export const SubmitVoteSchema = z
	.object({
		selectedOption: z.string().min(1),
	})
	.openapi("SubmitVote");

export const VoteResultSchema = z
	.object({
		id: z.string(),
		participantId: z.string(),
		selectedOption: z.string(),
		createdAt: z.string().datetime(),
	})
	.openapi("VoteResult");

export const VotingResultsSchema = z
	.object({
		totalVotes: z.number().int(),
		results: z.record(z.string(), z.number().int()),
	})
	.openapi("VotingResults");

// --- Route params ---

const PhaseParamsSchema = z
	.object({
		roomId: z.string(),
		phaseId: z.string(),
	})
	.openapi("VotingPhaseParams");

// --- Route definitions ---

export const submitVoteRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/phases/{phaseId}/votes",
	tags: ["Voting"],
	summary: "Submit a vote",
	request: {
		params: PhaseParamsSchema,
		body: {
			content: { "application/json": { schema: SubmitVoteSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: VoteResultSchema } },
			description: "Vote submitted",
		},
		400: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Invalid option",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room or phase not found",
		},
		409: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Already voted",
		},
	},
});

export const getVotingResultsRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/phases/{phaseId}/votes/results",
	tags: ["Voting"],
	summary: "Get voting results",
	request: {
		params: PhaseParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: VotingResultsSchema } },
			description: "Voting results",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room or phase not found",
		},
	},
});
