import { createRoute, z } from "@hono/zod-openapi";

// --- Survey answer validation ---

export const SurveyAnswerItemSchema = z
	.object({
		questionId: z.string(),
		value: z.union([z.string(), z.number()]),
	})
	.openapi("SurveyAnswerItem");

export type SurveyAnswerItem = z.infer<typeof SurveyAnswerItemSchema>;

// --- Request / Response schemas ---

export const SubmitSurveyResponseSchema = z
	.object({
		answers: z.array(SurveyAnswerItemSchema).min(1),
	})
	.openapi("SubmitSurveyResponse");

export const SurveyResponseResultSchema = z
	.object({
		id: z.string(),
		participantId: z.string(),
		answers: z.array(SurveyAnswerItemSchema),
		createdAt: z.string().datetime(),
	})
	.openapi("SurveyResponseResult");

export const SurveyResponseSummarySchema = z
	.object({
		totalResponses: z.number().int(),
	})
	.openapi("SurveyResponseSummary");

// --- Route params ---

const PhaseParamsSchema = z
	.object({
		roomId: z.string(),
		phaseId: z.string(),
	})
	.openapi("SurveyPhaseParams");

// --- Route definitions ---

export const submitSurveyResponseRoute = createRoute({
	method: "post",
	path: "/api/rooms/{roomId}/phases/{phaseId}/survey-responses",
	tags: ["Survey"],
	summary: "Submit survey response",
	request: {
		params: PhaseParamsSchema,
		body: {
			content: { "application/json": { schema: SubmitSurveyResponseSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: SurveyResponseResultSchema } },
			description: "Survey response submitted",
		},
		400: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Validation error",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room or phase not found",
		},
		409: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Already responded",
		},
	},
});

export const getSurveyResponseSummaryRoute = createRoute({
	method: "get",
	path: "/api/rooms/{roomId}/phases/{phaseId}/survey-responses/summary",
	tags: ["Survey"],
	summary: "Get survey response summary (response count)",
	request: {
		params: PhaseParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: SurveyResponseSummarySchema } },
			description: "Survey response summary",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Room or phase not found",
		},
	},
});
