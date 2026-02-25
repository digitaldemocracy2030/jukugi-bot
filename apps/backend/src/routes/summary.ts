import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { discussionSummaries, phases, rooms } from "../db/schema";
import { isAiConfigured } from "../lib/ai";
import { formatSummary, generateAndSaveSummary } from "../lib/summary-trigger";
import { adminAuth } from "../middleware/admin-auth";
import { generateSummaryRoute, getLatestSummaryRoute } from "../schemas/summary.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// ─── POST /api/rooms/:roomId/phases/:phaseId/summaries/generate (admin) ──────

app.use("/api/rooms/:roomId/phases/:phaseId/summaries/generate", adminAuth);
app.openapi(generateSummaryRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");

	// Verify room exists
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Verify phase exists
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase) {
		return c.json({ error: "Phase not found" }, 404);
	}

	if (!isAiConfigured()) {
		return c.json({ error: "LLM not configured" }, 503);
	}

	const result = await generateAndSaveSummary(c.env.DB, roomId, phaseId);

	if (result.result === "created") {
		return c.json(result.summary, 201);
	}

	return c.json({ skipped: true as const, reason: result.result }, 200);
});

// ─── GET /api/rooms/:roomId/phases/:phaseId/summaries/latest ─────────────────

app.openapi(getLatestSummaryRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");

	// Verify room exists
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Verify phase exists
	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase) {
		return c.json({ error: "Phase not found" }, 404);
	}

	const summary = await db
		.select()
		.from(discussionSummaries)
		.where(and(eq(discussionSummaries.roomId, roomId), eq(discussionSummaries.phaseId, phaseId)))
		.get();

	return c.json({ summary: summary ? formatSummary(summary) : null }, 200);
});

export default app;
