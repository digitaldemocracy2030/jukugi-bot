import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { rooms, transcripts } from "../db/schema";
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

function formatTranscript(t: typeof transcripts.$inferSelect) {
	return {
		id: t.id,
		roomId: t.roomId,
		participantId: t.participantId ?? null,
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

app.use("/api/rooms/:roomId/transcripts", adminAuth);
app.openapi(createTranscriptRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const transcriptId = generateId();
	await db.insert(transcripts).values({
		id: transcriptId,
		roomId,
		participantId: body.participantId ?? null,
		phaseId: body.phaseId ?? null,
		content: body.content,
		language: body.language,
		confidence: body.confidence ?? null,
		isFinal: body.isFinal,
		startOffsetMs: body.startOffsetMs ?? null,
		endOffsetMs: body.endOffsetMs ?? null,
		createdAt: new Date(),
	});

	// Enqueue summary generation if configured
	if (body.isFinal && body.phaseId && isAiConfigured() && c.env.SUMMARY_QUEUE) {
		c.executionCtx.waitUntil(c.env.SUMMARY_QUEUE.send({ roomId, phaseId: body.phaseId }));
	}

	return c.json({ transcriptId }, 201);
});

// ─── GET /api/rooms/:roomId/transcripts (admin) ───────────────────────────────

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
		.select()
		.from(transcripts)
		.where(and(...conditions))
		.all();

	return c.json({ transcripts: rows.map(formatTranscript) }, 200);
});

export default app;
