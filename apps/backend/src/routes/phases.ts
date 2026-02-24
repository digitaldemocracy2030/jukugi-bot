import { OpenAPIHono } from "@hono/zod-openapi";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { phases, rooms } from "../db/schema";
import { generateId } from "../lib/id";
import { adminAuth } from "../middleware/admin-auth";
import {
	addPhaseRoute,
	DiscussionPhaseConfigSchema,
	DiscussionPhaseFeatureFlagsSchema,
	deletePhaseRoute,
	listPhasesRoute,
	reorderPhasesRoute,
	SurveyPhaseConfigSchema,
	SurveyPhaseFeatureFlagsSchema,
	updatePhaseRoute,
	VideoPhaseConfigSchema,
	VideoPhaseFeatureFlagsSchema,
	VotingPhaseConfigSchema,
	VotingPhaseFeatureFlagsSchema,
} from "../schemas/phase.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	ENVIRONMENT: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>({
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json({ error: "Validation Error", details: result.error.flatten() }, 422);
		}
	},
});

function formatPhase(phase: typeof phases.$inferSelect) {
	const base = {
		id: phase.id,
		roomId: phase.roomId,
		title: phase.title,
		sortOrder: phase.sortOrder,
		createdAt: phase.createdAt.toISOString(),
	};
	switch (phase.type) {
		case "video":
			return {
				...base,
				type: "video" as const,
				config: VideoPhaseConfigSchema.catch({}).parse(phase.config ?? {}),
				featureFlags: VideoPhaseFeatureFlagsSchema.catch({}).parse(phase.featureFlags ?? {}),
			};
		case "discussion":
			return {
				...base,
				type: "discussion" as const,
				config: DiscussionPhaseConfigSchema.catch({}).parse(phase.config ?? {}),
				featureFlags: DiscussionPhaseFeatureFlagsSchema.catch({}).parse(phase.featureFlags ?? {}),
			};
		case "voting":
			return {
				...base,
				type: "voting" as const,
				config: VotingPhaseConfigSchema.catch({}).parse(phase.config ?? {}),
				featureFlags: VotingPhaseFeatureFlagsSchema.catch({}).parse(phase.featureFlags ?? {}),
			};
		case "survey":
			return {
				...base,
				type: "survey" as const,
				config: SurveyPhaseConfigSchema.catch({}).parse(phase.config ?? {}),
				featureFlags: SurveyPhaseFeatureFlagsSchema.catch({}).parse(phase.featureFlags ?? {}),
			};
	}
}

// POST /api/rooms/:roomId/phases (admin)
app.on("POST", "/api/rooms/:roomId/phases", adminAuth);
app.openapi(addPhaseRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Determine sortOrder: use provided or place at end
	let sortOrder = body.sortOrder;
	if (sortOrder === undefined) {
		const existing = await db
			.select()
			.from(phases)
			.where(eq(phases.roomId, roomId))
			.orderBy(asc(phases.sortOrder))
			.all();
		sortOrder = existing.length > 0 ? existing[existing.length - 1].sortOrder + 1 : 0;
	}

	const phase = await db
		.insert(phases)
		.values({
			id: generateId(),
			roomId,
			type: body.type,
			title: body.title,
			sortOrder,
			config: body.config ?? {},
			featureFlags: body.featureFlags ?? {},
			createdAt: new Date(),
		})
		.returning()
		.get();

	return c.json(formatPhase(phase), 201);
});

// GET /api/rooms/:roomId/phases (public)
app.openapi(listPhasesRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const phaseList = await db
		.select()
		.from(phases)
		.where(eq(phases.roomId, roomId))
		.orderBy(asc(phases.sortOrder))
		.all();

	return c.json(phaseList.map(formatPhase), 200);
});

// PATCH /api/rooms/:roomId/phases/:phaseId (admin)
app.use("/api/rooms/:roomId/phases/:phaseId", adminAuth);
app.openapi(updatePhaseRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");
	const body = c.req.valid("json");

	const existing = await db.select().from(phases).where(eq(phases.id, phaseId)).get();

	if (!existing || existing.roomId !== roomId) {
		return c.json({ error: "Phase not found" }, 404);
	}

	const updated = await db
		.update(phases)
		.set({
			...(body.type !== undefined ? { type: body.type } : {}),
			...(body.title !== undefined ? { title: body.title } : {}),
			...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
			...(body.config !== undefined ? { config: body.config } : {}),
			...(body.featureFlags !== undefined ? { featureFlags: body.featureFlags } : {}),
		})
		.where(eq(phases.id, phaseId))
		.returning()
		.get();

	return c.json(formatPhase(updated), 200);
});

// DELETE /api/rooms/:roomId/phases/:phaseId (admin)
app.openapi(deletePhaseRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId, phaseId } = c.req.valid("param");

	const existing = await db.select().from(phases).where(eq(phases.id, phaseId)).get();

	if (!existing || existing.roomId !== roomId) {
		return c.json({ error: "Phase not found" }, 404);
	}

	await db.delete(phases).where(eq(phases.id, phaseId));

	return c.json({ success: true }, 200);
});

// PUT /api/rooms/:roomId/phases/reorder (admin)
app.use("/api/rooms/:roomId/phases/reorder", adminAuth);
app.openapi(reorderPhasesRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const { orderedIds } = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Update sortOrder for each phase sequentially
	for (let i = 0; i < orderedIds.length; i++) {
		await db.update(phases).set({ sortOrder: i }).where(eq(phases.id, orderedIds[i]));
	}

	const phaseList = await db
		.select()
		.from(phases)
		.where(eq(phases.roomId, roomId))
		.orderBy(asc(phases.sortOrder))
		.all();

	return c.json(phaseList.map(formatPhase), 200);
});

export default app;
