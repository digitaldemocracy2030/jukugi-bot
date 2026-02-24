import { z } from "@hono/zod-openapi";

export const CreateTransitionProposalSchema = z.object({
	participantId: z.string().min(1),
	toPhaseId: z.string().optional(),
});

export const CastTransitionVoteSchema = z.object({
	participantId: z.string().min(1),
	choice: z.enum(["yes", "no"]),
});

export const TransitionProposalResponseSchema = z.object({
	id: z.string(),
	fromPhaseId: z.string(),
	toPhaseId: z.string().nullable(),
	proposedByRole: z.enum(["admin", "participant"]),
	status: z.enum(["open", "approved", "rejected_by_admin", "expired", "cancelled"]),
	yesCount: z.number(),
	noCount: z.number(),
	totalVoted: z.number(),
	requiredThreshold: z.number(),
	expiresAt: z.string().nullable(),
	createdAt: z.string(),
});
