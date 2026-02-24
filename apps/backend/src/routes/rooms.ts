import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { rooms } from "../db/schema";
import { generateId } from "../lib/id";
import { adminAuth } from "../middleware/admin-auth";
import {
	createRoomRoute,
	deleteRoomRoute,
	getRoomBySlugRoute,
	updateRoomRoute,
} from "../schemas/room.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	ENVIRONMENT: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

function formatRoom(room: typeof rooms.$inferSelect) {
	return {
		...room,
		description: room.description ?? null,
		createdAt: room.createdAt.toISOString(),
		updatedAt: room.updatedAt.toISOString(),
	};
}

// POST /api/rooms (admin)
app.use("/api/rooms", adminAuth);
app.openapi(createRoomRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const body = c.req.valid("json");

	const existing = await db.select().from(rooms).where(eq(rooms.slug, body.slug)).get();
	if (existing) {
		return c.json({ error: "Slug already taken" }, 409);
	}

	const now = new Date();
	const room = await db
		.insert(rooms)
		.values({
			id: generateId(),
			slug: body.slug,
			title: body.title,
			description: body.description ?? null,
			status: body.status ?? "draft",
			maxParticipants: body.maxParticipants ?? 10,
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.get();

	return c.json(formatRoom(room), 201);
});

// GET /api/rooms/:slug (public)
app.openapi(getRoomBySlugRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { slug } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.slug, slug)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	return c.json(formatRoom(room), 200);
});

// PATCH /api/rooms/:roomId (admin)
app.use("/api/rooms/:roomId", adminAuth);
app.openapi(updateRoomRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const existing = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!existing) {
		return c.json({ error: "Room not found" }, 404);
	}

	const updated = await db
		.update(rooms)
		.set({
			...(body.title !== undefined ? { title: body.title } : {}),
			...(body.description !== undefined ? { description: body.description } : {}),
			...(body.status !== undefined ? { status: body.status } : {}),
			...(body.maxParticipants !== undefined ? { maxParticipants: body.maxParticipants } : {}),
			updatedAt: new Date(),
		})
		.where(eq(rooms.id, roomId))
		.returning()
		.get();

	return c.json(formatRoom(updated), 200);
});

// DELETE /api/rooms/:roomId (admin)
app.openapi(deleteRoomRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const existing = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!existing) {
		return c.json({ error: "Room not found" }, 404);
	}

	await db.delete(rooms).where(eq(rooms.id, roomId));

	return c.json({ success: true }, 200);
});

export default app;
