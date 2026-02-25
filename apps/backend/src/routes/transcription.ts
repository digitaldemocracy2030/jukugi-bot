import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { participants, phaseActivations, rooms, sessionParticipations, transcripts } from "../db/schema";
import { isAiConfigured } from "../lib/ai";
import { generateId } from "../lib/id";
import { adminAuth } from "../middleware/admin-auth";
import { createTranscriptRoute, listTranscriptsRoute } from "../schemas/transcription.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	SUMMARY_QUEUE?: Queue<{ roomId: string; phaseId: string }>;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

function formatTranscript(
	t: typeof transcripts.$inferSelect,
	extra?: { participantIdentity?: string | null; displayName?: string | null },
) {
	return {
		id: t.id,
		roomId: t.roomId,
		participantId: extra?.participantIdentity ?? t.participantId ?? null,
		displayName: extra?.displayName ?? null,
		phaseId: t.phaseId ?? null,
		content: t.content,
		language: t.language,
		confidence: t.confidence ?? null,
		isFinal: t.isFinal,
		startOffsetMs: t.startOffsetMs ?? null,
		endOffsetMs: t.endOffsetMs ?? null,
		createdAt: t.createdAt.toISOString(),
	};
}

// ─── POST /api/rooms/:roomId/transcripts (admin / Agent) ─────────────────────

app.use("/api/rooms/:roomId/transcripts", async (c, next) => {
	if (c.req.method !== "POST") return next();
	const key = c.req.header("X-Admin-Key");
	if (!key || key !== c.env.ADMIN_API_KEY) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	return next();
});

app.openapi(createTranscriptRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Resolve participantId: agent sends participants.id (LiveKit identity),
	// but transcripts.participantId references sessionParticipations.id
	let sessionParticipationId: string | null = null;
	if (body.participantId) {
		const sp = await db
			.select({ id: sessionParticipations.id })
			.from(sessionParticipations)
			.where(
				and(
					eq(sessionParticipations.participantId, body.participantId),
					eq(sessionParticipations.roomId, roomId),
				),
			)
			.get();
		sessionParticipationId = sp?.id ?? null;
		if (!sessionParticipationId) {
			console.warn(`[transcription] Could not resolve sessionParticipation for participant=${body.participantId}, room=${roomId}`);
		}
	}

	// Resolve phaseId: if not provided, use the current active phase
	let resolvedPhaseId = body.phaseId ?? null;
	if (!resolvedPhaseId) {
		const activePhase = await db
			.select({ phaseId: phaseActivations.phaseId })
			.from(phaseActivations)
			.where(
				and(
					eq(phaseActivations.roomId, roomId),
					isNull(phaseActivations.endedAt),
				),
			)
			.get();
		resolvedPhaseId = activePhase?.phaseId ?? null;
	}

	console.log("[transcription] Resolved:", JSON.stringify({
		sessionParticipationId,
		resolvedPhaseId,
		isFinal: body.isFinal,
		contentLength: body.content.length,
	}));

	const transcriptId = generateId();
	await db.insert(transcripts).values({
		id: transcriptId,
		roomId,
		participantId: sessionParticipationId,
		phaseId: resolvedPhaseId,
		content: body.content,
		language: body.language,
		confidence: body.confidence ?? null,
		isFinal: body.isFinal,
		startOffsetMs: body.startOffsetMs ?? null,
		endOffsetMs: body.endOffsetMs ?? null,
		createdAt: new Date(),
	});

	// Enqueue summary generation if configured
	if (body.isFinal && resolvedPhaseId && isAiConfigured() && c.env.SUMMARY_QUEUE) {
		console.log("[transcription] Enqueueing summary generation for phase:", resolvedPhaseId);
		c.executionCtx.waitUntil(c.env.SUMMARY_QUEUE.send({ roomId, phaseId: resolvedPhaseId }));
	} else {
		console.log("[transcription] Summary queue skip:", JSON.stringify({
			isFinal: body.isFinal,
			hasPhaseId: !!resolvedPhaseId,
			aiConfigured: isAiConfigured(),
			queueAvailable: !!c.env.SUMMARY_QUEUE,
		}));
	}

	return c.json({ transcriptId }, 201);
});

// ─── GET /api/rooms/:roomId/transcripts (public) ────────────────────────────

app.openapi(listTranscriptsRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const query = c.req.valid("query");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const conditions = [eq(transcripts.roomId, roomId)];

	if (query.phaseId) {
		conditions.push(eq(transcripts.phaseId, query.phaseId));
	}
	if (query.participantId) {
		conditions.push(eq(transcripts.participantId, query.participantId));
	}
	if (query.finalOnly) {
		conditions.push(eq(transcripts.isFinal, true));
	}

	const rows = await db
		.select({
			transcript: transcripts,
			participantIdentity: sessionParticipations.participantId,
			displayName: participants.displayName,
		})
		.from(transcripts)
		.leftJoin(sessionParticipations, eq(transcripts.participantId, sessionParticipations.id))
		.leftJoin(participants, eq(sessionParticipations.participantId, participants.id))
		.where(and(...conditions))
		.all();

	return c.json({
		transcripts: rows.map((r) => formatTranscript(r.transcript, {
			participantIdentity: r.participantIdentity,
			displayName: r.displayName,
		})),
	}, 200);
});

export default app;
