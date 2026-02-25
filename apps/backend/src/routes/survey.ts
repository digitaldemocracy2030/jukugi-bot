import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { phases, rooms, surveyResponses } from "../db/schema";
import { generateId } from "../lib/id";
import type { ParticipantRoomVariables } from "../middleware/participant-auth";
import { participantRoomAuth } from "../middleware/participant-auth";
import type { SurveyPhaseConfig } from "../schemas/phase.schema";
import {
	getSurveyResponseSummaryRoute,
	SurveyAnswerItemSchema,
	submitSurveyResponseRoute,
} from "../schemas/survey.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
};

const app = new OpenAPIHono<{
	Bindings: Bindings;
	Variables: ParticipantRoomVariables;
}>();

// ─── POST /api/rooms/:roomId/phases/:phaseId/survey-responses ───────────────

app.use("/api/rooms/:roomId/phases/:phaseId/survey-responses", participantRoomAuth);
app.openapi(submitSurveyResponseRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");
	const { answers } = c.req.valid("json");
	const participant = c.var.participant;

	// Validate room exists and is active
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room || room.status !== "active") {
		return c.json({ error: "Room not found or not active" }, 404);
	}

	// Validate phase exists, belongs to room, and is a survey phase
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase || phase.roomId !== roomId || phase.type !== "survey") {
		return c.json({ error: "Survey phase not found" }, 404);
	}

	// Validate each answer with Zod
	for (const answer of answers) {
		const parseResult = SurveyAnswerItemSchema.safeParse(answer);
		if (!parseResult.success) {
			return c.json({ error: `Invalid answer format: ${parseResult.error.message}` }, 400);
		}
	}

	// Validate answers against phase config questions
	const config = (phase.config ?? {}) as SurveyPhaseConfig;
	if (config.questions && config.questions.length > 0) {
		const questionIds = new Set(config.questions.map((q) => q.id));
		const answeredIds = new Set(answers.map((a) => a.questionId));

		// Check all questions are answered
		for (const qId of questionIds) {
			if (!answeredIds.has(qId)) {
				return c.json({ error: `Missing answer for question: ${qId}` }, 400);
			}
		}

		// Validate answer values by question type
		for (const answer of answers) {
			const question = config.questions.find((q) => q.id === answer.questionId);
			if (!question) {
				return c.json({ error: `Unknown question: ${answer.questionId}` }, 400);
			}

			if (question.type === "scale") {
				const num = typeof answer.value === "number" ? answer.value : Number(answer.value);
				if (!Number.isInteger(num) || num < 1 || num > 5) {
					return c.json({ error: `Scale answer for ${answer.questionId} must be 1-5` }, 400);
				}
			} else if (question.type === "choice" && question.options) {
				if (!question.options.includes(String(answer.value))) {
					return c.json({ error: `Invalid choice for ${answer.questionId}` }, 400);
				}
			} else if (question.type === "text") {
				if (typeof answer.value !== "string" || answer.value.trim().length === 0) {
					return c.json({ error: `Text answer for ${answer.questionId} must be non-empty` }, 400);
				}
			}
		}
	}

	// Check for duplicate response
	const existing = await db
		.select()
		.from(surveyResponses)
		.where(
			and(eq(surveyResponses.phaseId, phaseId), eq(surveyResponses.participantId, participant.id)),
		)
		.get();

	if (existing) {
		return c.json({ error: "Already responded" }, 409);
	}

	const id = generateId();
	const now = new Date();

	await db.insert(surveyResponses).values({
		id,
		roomId,
		phaseId,
		participantId: participant.id,
		answers,
		createdAt: now,
	});

	return c.json(
		{
			id,
			participantId: participant.id,
			answers,
			createdAt: now.toISOString(),
		},
		201,
	);
});

// ─── GET /api/rooms/:roomId/phases/:phaseId/survey-responses/summary ────────

app.openapi(getSurveyResponseSummaryRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");

	// Validate phase exists and belongs to room
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase || phase.roomId !== roomId || phase.type !== "survey") {
		return c.json({ error: "Survey phase not found" }, 404);
	}

	const result = await db
		.select({ count: sql<number>`count(*)`.as("count") })
		.from(surveyResponses)
		.where(eq(surveyResponses.phaseId, phaseId))
		.get();

	return c.json({ totalResponses: result?.count ?? 0 }, 200);
});

export default app;
