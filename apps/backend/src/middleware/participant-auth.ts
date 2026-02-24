import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createMiddleware } from "hono/factory";
import { participants, sessionParticipations } from "../db/schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
};

export type ParticipantVar = {
	id: string;
	displayName: string;
	recoveryCode: string;
};

export type SessionParticipationVar = {
	id: string;
	participantId: string;
	roomId: string;
	role: string;
};

export type ParticipantVariables = {
	participant: ParticipantVar;
};

export type ParticipantRoomVariables = ParticipantVariables & {
	sessionParticipation: SessionParticipationVar;
};

/**
 * Middleware: validate X-Participant-Token header and inject `c.var.participant`.
 */
export const participantAuth = createMiddleware<{
	Bindings: Bindings;
	Variables: ParticipantVariables;
}>(async (c, next) => {
	const token = c.req.header("x-participant-token");
	if (!token) {
		return c.json({ error: "Missing X-Participant-Token header" }, 401);
	}

	const db = drizzle(c.env.DB);
	const participant = await db.select().from(participants).where(eq(participants.id, token)).get();

	if (!participant) {
		return c.json({ error: "Invalid participant token" }, 401);
	}

	c.set("participant", {
		id: participant.id,
		displayName: participant.displayName,
		recoveryCode: participant.recoveryCode,
	});

	await next();
});

/**
 * Middleware: participantAuth + verify active session participation for the room.
 * Requires `:roomId` path param. Injects both `c.var.participant` and `c.var.sessionParticipation`.
 */
export const participantRoomAuth = createMiddleware<{
	Bindings: Bindings;
	Variables: ParticipantRoomVariables;
}>(async (c, next) => {
	const token = c.req.header("x-participant-token");
	if (!token) {
		return c.json({ error: "Missing X-Participant-Token header" }, 401);
	}

	const db = drizzle(c.env.DB);
	const participant = await db.select().from(participants).where(eq(participants.id, token)).get();

	if (!participant) {
		return c.json({ error: "Invalid participant token" }, 401);
	}

	c.set("participant", {
		id: participant.id,
		displayName: participant.displayName,
		recoveryCode: participant.recoveryCode,
	});

	const roomId = c.req.param("roomId");
	if (!roomId) {
		return c.json({ error: "Missing roomId parameter" }, 400);
	}

	const sp = await db
		.select()
		.from(sessionParticipations)
		.where(
			and(
				eq(sessionParticipations.participantId, participant.id),
				eq(sessionParticipations.roomId, roomId),
				isNull(sessionParticipations.leftAt),
			),
		)
		.get();

	if (!sp) {
		return c.json({ error: "Not a member of this room" }, 403);
	}

	c.set("sessionParticipation", {
		id: sp.id,
		participantId: sp.participantId,
		roomId: sp.roomId,
		role: sp.role,
	});

	await next();
});

/**
 * Middleware: allows either X-Admin-Key (admin) or X-Participant-Token (participant with room membership).
 * If admin key is valid, skips participant validation.
 * Otherwise falls through to participantRoomAuth logic.
 */
export const participantOrAdminAuth = createMiddleware<{
	Bindings: Bindings;
	Variables: ParticipantRoomVariables;
}>(async (c, next) => {
	// Check admin key first
	const adminKey = c.req.header("X-Admin-Key");
	if (adminKey && adminKey === c.env.ADMIN_API_KEY) {
		await next();
		return;
	}

	// Fall through to participant auth
	const token = c.req.header("x-participant-token");
	if (!token) {
		return c.json({ error: "Missing X-Participant-Token or X-Admin-Key header" }, 401);
	}

	const db = drizzle(c.env.DB);
	const participant = await db.select().from(participants).where(eq(participants.id, token)).get();

	if (!participant) {
		return c.json({ error: "Invalid participant token" }, 401);
	}

	c.set("participant", {
		id: participant.id,
		displayName: participant.displayName,
		recoveryCode: participant.recoveryCode,
	});

	const roomId = c.req.param("roomId");
	if (!roomId) {
		return c.json({ error: "Missing roomId parameter" }, 400);
	}

	const sp = await db
		.select()
		.from(sessionParticipations)
		.where(
			and(
				eq(sessionParticipations.participantId, participant.id),
				eq(sessionParticipations.roomId, roomId),
				isNull(sessionParticipations.leftAt),
			),
		)
		.get();

	if (!sp) {
		return c.json({ error: "Not a member of this room" }, 403);
	}

	c.set("sessionParticipation", {
		id: sp.id,
		participantId: sp.participantId,
		roomId: sp.roomId,
		role: sp.role,
	});

	await next();
});
