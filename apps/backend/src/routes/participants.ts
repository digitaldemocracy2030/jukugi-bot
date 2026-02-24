import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { participants } from "../db/schema";
import {
	createParticipantRoute,
	getParticipantMeRoute,
	recoverParticipantRoute,
} from "../schemas/participants.schema";

type Bindings = {
	DB: D1Database;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

/** Generate a recovery code in "XXX-XXX" format using uppercase alphanumeric characters */
function generateRecoveryCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude ambiguous chars (0/O, 1/I)
	let code = "";
	for (let i = 0; i < 6; i++) {
		if (i === 3) code += "-";
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

// ─── POST /api/participants ────────────────────────────────────────────────────

app.openapi(createParticipantRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { displayName } = c.req.valid("json");

	const id = crypto.randomUUID();
	const recoveryCode = generateRecoveryCode();
	const now = new Date();

	await db.insert(participants).values({
		id,
		displayName,
		recoveryCode,
		createdAt: now,
	});

	return c.json({ id, displayName, recoveryCode }, 200);
});

// ─── GET /api/participants/me ──────────────────────────────────────────────────

app.openapi(getParticipantMeRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const token = c.req.header("x-participant-token");

	if (!token) {
		return c.json({ error: "Missing X-Participant-Token header" }, 401);
	}

	const participant = await db.select().from(participants).where(eq(participants.id, token)).get();

	if (!participant) {
		return c.json({ error: "Participant not found" }, 401);
	}

	return c.json(
		{
			id: participant.id,
			displayName: participant.displayName,
			recoveryCode: participant.recoveryCode,
		},
		200,
	);
});

// ─── POST /api/participants/recover ───────────────────────────────────────────

app.openapi(recoverParticipantRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { recoveryCode } = c.req.valid("json");

	const participant = await db
		.select()
		.from(participants)
		.where(eq(participants.recoveryCode, recoveryCode))
		.get();

	if (!participant) {
		return c.json({ error: "Recovery code not found" }, 404);
	}

	return c.json(
		{
			id: participant.id,
			displayName: participant.displayName,
			recoveryCode: participant.recoveryCode,
		},
		200,
	);
});

export default app;
