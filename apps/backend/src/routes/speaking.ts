import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { phases, rooms, sessionParticipations, speakingLog } from "../db/schema";
import { generateId } from "../lib/id";
import { deserializeMetadata, serializeMetadata, updateSpeakerQueue } from "../livekit/metadata";
import {
	createRoomServiceClient,
	setParticipantMicPermission,
	updateRoomMetadata,
} from "../livekit/room-service";
import type { RoomMetadata, SpeakerQueue } from "../livekit/types";
import { adminAuth } from "../middleware/admin-auth";
import {
	interruptEndRoute,
	interruptRequestRoute,
	queueJoinRoute,
	queueLeaveRoute,
	queueNextRoute,
	queueSkipRoute,
	speakingCheckRoute,
} from "../schemas/speaking.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	ENVIRONMENT: string;
	LIVEKIT_URL: string;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const DEFAULT_SPEAKING_TIME_SEC = 60;
const DEFAULT_INTERRUPTION_TIME_SEC = 15;
const MAX_SIMULTANEOUS_INTERRUPTIONS = 2;

function livekitRoomName(roomId: string): string {
	return `room-${roomId}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the current LiveKit room metadata. Returns null if room has no metadata yet.
 */
async function fetchRoomMetadata(
	client: ReturnType<typeof createRoomServiceClient>,
	roomName: string,
): Promise<RoomMetadata | null> {
	try {
		const lkRooms = await client.listRooms([roomName]);
		if (!lkRooms.length) return null;
		return deserializeMetadata(lkRooms[0].metadata);
	} catch {
		return null;
	}
}

/**
 * Resolve a LiveKit identity (participants.id UUID) to its session_participations.id
 * for a given room. Returns null if no active participation exists.
 */
async function resolveSessionParticipationId(
	db: ReturnType<typeof drizzle>,
	participantId: string,
	roomId: string,
): Promise<string | null> {
	const sp = await db
		.select({ id: sessionParticipations.id })
		.from(sessionParticipations)
		.where(
			and(
				eq(sessionParticipations.participantId, participantId),
				eq(sessionParticipations.roomId, roomId),
				isNull(sessionParticipations.leftAt),
			),
		)
		.get();
	return sp?.id ?? null;
}

/**
 * Log the start of a speaking turn to D1.
 * participantId here is the LiveKit identity (participants.id UUID).
 */
async function logSpeakingStart(
	db: ReturnType<typeof drizzle>,
	roomId: string,
	phaseId: string,
	participantId: string,
	type: "normal" | "interruption",
): Promise<string> {
	const sessionParticipationId = await resolveSessionParticipationId(db, participantId, roomId);
	if (!sessionParticipationId) return generateId(); // no-op if not found
	const id = generateId();
	await db.insert(speakingLog).values({
		id,
		roomId,
		phaseId,
		participantId: sessionParticipationId,
		type,
		startedAt: new Date(),
	});
	return id;
}

/**
 * Close an open speaking log entry with duration.
 * participantId here is the LiveKit identity (participants.id UUID).
 */
async function logSpeakingEnd(
	db: ReturnType<typeof drizzle>,
	participantId: string,
	roomId: string,
): Promise<void> {
	const sessionParticipationId = await resolveSessionParticipationId(db, participantId, roomId);
	if (!sessionParticipationId) return;

	const open = await db
		.select()
		.from(speakingLog)
		.where(
			and(
				eq(speakingLog.participantId, sessionParticipationId),
				eq(speakingLog.roomId, roomId),
				isNull(speakingLog.endedAt),
			),
		)
		.get();

	if (!open) return;

	const now = new Date();
	const durationSec = Math.round((now.getTime() - open.startedAt.getTime()) / 1000);

	await db
		.update(speakingLog)
		.set({ endedAt: now, durationSec })
		.where(eq(speakingLog.id, open.id));
}

/**
 * Advance to the next speaker: mute previous, unmute next, update metadata + D1 log.
 * Returns the updated SpeakerQueue.
 */
async function advanceToNextSpeaker(
	client: ReturnType<typeof createRoomServiceClient>,
	db: ReturnType<typeof drizzle>,
	roomName: string,
	meta: RoomMetadata,
	speakingTimeSec: number,
): Promise<SpeakerQueue> {
	const { speakerQueue } = meta;
	const prev = speakerQueue.currentSpeaker;
	const next = speakerQueue.queue[0] ?? null;

	// Close previous speaker log
	if (prev) {
		await logSpeakingEnd(db, prev.participantId, meta.roomId);
		// Revoke publish permission (mute)
		try {
			await setParticipantMicPermission(client, roomName, prev.participantId, false);
		} catch {
			// participant may have left — ignore
		}
	}

	const now = Date.now();
	let newCurrentSpeaker: RoomMetadata["speakerQueue"]["currentSpeaker"] = null;
	const newQueue = speakerQueue.queue.slice(1); // remove next from queue head

	if (next) {
		newCurrentSpeaker = {
			participantId: next.participantId,
			speakingUntil: now + speakingTimeSec * 1000,
		};

		// Grant publish permission (unmute)
		try {
			await setParticipantMicPermission(client, roomName, next.participantId, true);
		} catch {
			// participant may have left — move on
			newCurrentSpeaker = null;
		}

		// Log speaking start if we actually unmuted someone
		if (newCurrentSpeaker && meta.currentPhaseId) {
			await logSpeakingStart(db, meta.roomId, meta.currentPhaseId, next.participantId, "normal");
		}
	}

	// Keep interruptions intact across speaker advance
	const newQueue2: SpeakerQueue = {
		currentSpeaker: newCurrentSpeaker,
		queue: newQueue,
		interruptions: speakerQueue.interruptions,
	};

	return newQueue2;
}

// ─── POST /api/rooms/:roomId/queue/join ───────────────────────────────────────

app.openapi(queueJoinRoute, async (c) => {
	const { roomId } = c.req.valid("param");
	const { participantId, displayName } = c.req.valid("json");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	if (!meta.featureFlags.canSpeak) {
		return c.json({ error: "Speaking is not allowed in the current phase" }, 403);
	}

	const { speakerQueue } = meta;
	const alreadyQueued =
		speakerQueue.queue.some((e) => e.participantId === participantId) ||
		speakerQueue.currentSpeaker?.participantId === participantId;

	if (alreadyQueued) return c.json({ error: "Already in queue or currently speaking" }, 409);

	const newQueue: SpeakerQueue = {
		...speakerQueue,
		queue: [...speakerQueue.queue, { participantId, displayName, requestedAt: Date.now() }],
	};

	// If nobody is currently speaking, immediately advance
	if (!newQueue.currentSpeaker) {
		const phase = meta.currentPhaseId
			? await db.select().from(phases).where(eq(phases.id, meta.currentPhaseId)).get()
			: null;
		const speakingTimeSec = phase?.featureFlags?.speakingTimeSec ?? DEFAULT_SPEAKING_TIME_SEC;

		const advancedQueue = await advanceToNextSpeaker(
			client,
			db,
			livekitRoomName(roomId),
			{ ...meta, speakerQueue: newQueue },
			speakingTimeSec,
		);
		const updated = updateSpeakerQueue(meta, advancedQueue);
		await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
		return c.json({ success: true, speakerQueue: advancedQueue }, 200);
	}

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── DELETE /api/rooms/:roomId/queue/leave ────────────────────────────────────

app.openapi(queueLeaveRoute, async (c) => {
	const { roomId } = c.req.valid("param");
	const { participantId } = c.req.valid("json");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	const newQueue: SpeakerQueue = {
		...meta.speakerQueue,
		queue: meta.speakerQueue.queue.filter((e) => e.participantId !== participantId),
	};

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── POST /api/rooms/:roomId/queue/next (admin/facilitator) ──────────────────

app.use("/api/rooms/:roomId/queue/next", adminAuth);
app.openapi(queueNextRoute, async (c) => {
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	const phase = meta.currentPhaseId
		? await db.select().from(phases).where(eq(phases.id, meta.currentPhaseId)).get()
		: null;

	const speakingTimeSec =
		body.speakingTimeSec ?? phase?.featureFlags?.speakingTimeSec ?? DEFAULT_SPEAKING_TIME_SEC;

	const newQueue = await advanceToNextSpeaker(
		client,
		db,
		livekitRoomName(roomId),
		meta,
		speakingTimeSec,
	);

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── POST /api/rooms/:roomId/queue/skip (admin/facilitator) ──────────────────

app.use("/api/rooms/:roomId/queue/skip", adminAuth);
app.openapi(queueSkipRoute, async (c) => {
	const { roomId } = c.req.valid("param");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	const phase = meta.currentPhaseId
		? await db.select().from(phases).where(eq(phases.id, meta.currentPhaseId)).get()
		: null;

	const speakingTimeSec = phase?.featureFlags?.speakingTimeSec ?? DEFAULT_SPEAKING_TIME_SEC;

	// Skip = advance without giving credit for speaking time
	const { speakerQueue } = meta;
	if (speakerQueue.currentSpeaker) {
		await logSpeakingEnd(db, speakerQueue.currentSpeaker.participantId, roomId);
		try {
			await setParticipantMicPermission(
				client,
				livekitRoomName(roomId),
				speakerQueue.currentSpeaker.participantId,
				false,
			);
		} catch {
			// ignore
		}
	}

	// Remove current speaker and advance
	const metaWithoutCurrent: RoomMetadata = {
		...meta,
		speakerQueue: { ...speakerQueue, currentSpeaker: null },
	};

	const newQueue = await advanceToNextSpeaker(
		client,
		db,
		livekitRoomName(roomId),
		metaWithoutCurrent,
		speakingTimeSec,
	);

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── POST /api/rooms/:roomId/interrupt ───────────────────────────────────────

app.openapi(interruptRequestRoute, async (c) => {
	const { roomId } = c.req.valid("param");
	const { participantId, displayName } = c.req.valid("json");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	if (!meta.featureFlags.canInterrupt) {
		return c.json({ error: "Interruptions are not allowed in the current phase" }, 403);
	}

	const { speakerQueue } = meta;

	// Max simultaneous interruptions
	if (speakerQueue.interruptions.length >= MAX_SIMULTANEOUS_INTERRUPTIONS) {
		return c.json({ error: "Maximum simultaneous interruptions reached" }, 403);
	}

	// Already interrupting?
	if (speakerQueue.interruptions.some((i) => i.participantId === participantId)) {
		return c.json({ error: "Already interrupting" }, 403);
	}

	// Cooldown: check recent speaking log for this participant
	const phase = meta.currentPhaseId
		? await db.select().from(phases).where(eq(phases.id, meta.currentPhaseId)).get()
		: null;

	const cooldownSec = phase?.featureFlags?.interruptionCooldownSec ?? 0;
	if (cooldownSec > 0) {
		const spId = await resolveSessionParticipationId(db, participantId, roomId);
		if (spId) {
			const recentLog = await db
				.select()
				.from(speakingLog)
				.where(and(eq(speakingLog.participantId, spId), eq(speakingLog.roomId, roomId)))
				.all();

			const lastEnd = recentLog
				.filter((l) => l.endedAt !== null)
				.sort((a, b) => (b.endedAt?.getTime() ?? 0) - (a.endedAt?.getTime() ?? 0))[0];

			if (lastEnd?.endedAt) {
				const secSinceEnd = (Date.now() - lastEnd.endedAt.getTime()) / 1000;
				if (secSinceEnd < cooldownSec) {
					return c.json(
						{ error: `Cooldown in effect. Wait ${Math.ceil(cooldownSec - secSinceEnd)}s.` },
						403,
					);
				}
			}
		}
	}

	// Max interruptions per participant in this phase
	const maxInterruptions = phase?.featureFlags?.maxInterruptions;
	if (maxInterruptions !== undefined) {
		const spId = await resolveSessionParticipationId(db, participantId, roomId);
		if (spId) {
			const phaseInterruptions = await db
				.select()
				.from(speakingLog)
				.where(
					and(
						eq(speakingLog.participantId, spId),
						eq(speakingLog.roomId, roomId),
						eq(speakingLog.type, "interruption"),
						meta.currentPhaseId ? eq(speakingLog.phaseId, meta.currentPhaseId) : undefined,
					),
				)
				.all();

			if (phaseInterruptions.length >= maxInterruptions) {
				return c.json({ error: "Maximum interruptions per phase reached" }, 403);
			}
		}
	}

	const interruptionTimeSec =
		phase?.featureFlags?.interruptionTimeSec ?? DEFAULT_INTERRUPTION_TIME_SEC;

	const expiresAt = Date.now() + interruptionTimeSec * 1000;

	const newInterruptions = [
		...speakerQueue.interruptions,
		{ participantId, displayName, expiresAt },
	];

	const newQueue: SpeakerQueue = { ...speakerQueue, interruptions: newInterruptions };

	// Unmute the interrupter
	try {
		await setParticipantMicPermission(client, livekitRoomName(roomId), participantId, true);
	} catch {
		return c.json({ error: "Failed to unmute participant" }, 403);
	}

	// Log interruption start
	if (meta.currentPhaseId) {
		await logSpeakingStart(db, roomId, meta.currentPhaseId, participantId, "interruption");
	}

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── POST /api/rooms/:roomId/interrupt/:participantId/end ────────────────────

app.use("/api/rooms/:roomId/interrupt/:participantId/end", adminAuth);
app.openapi(interruptEndRoute, async (c) => {
	const { roomId, participantId } = c.req.valid("param");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	const { speakerQueue } = meta;
	const interruption = speakerQueue.interruptions.find((i) => i.participantId === participantId);
	if (!interruption) return c.json({ error: "Interruption not found" }, 404);

	// Close speaking log
	await logSpeakingEnd(db, participantId, roomId);

	// Mute the interrupter
	try {
		await setParticipantMicPermission(client, livekitRoomName(roomId), participantId, false);
	} catch {
		// ignore if participant left
	}

	const newQueue: SpeakerQueue = {
		...speakerQueue,
		interruptions: speakerQueue.interruptions.filter((i) => i.participantId !== participantId),
	};

	const updated = updateSpeakerQueue(meta, newQueue);
	await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	return c.json({ success: true, speakerQueue: newQueue }, 200);
});

// ─── POST /api/rooms/:roomId/speaking/check ──────────────────────────────────
// Called by poll leader every ~5 seconds

app.openapi(speakingCheckRoute, async (c) => {
	const { roomId } = c.req.valid("param");

	const db = drizzle(c.env.DB);
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) return c.json({ error: "Room not found" }, 404);
	if (room.status !== "active") return c.json({ error: "Room is not active" }, 403);

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const meta = await fetchRoomMetadata(client, livekitRoomName(roomId));
	if (!meta) return c.json({ error: "Room metadata not found" }, 404);

	const now = Date.now();
	let { speakerQueue } = meta;
	let changed = false;

	// 1. Check expired interruptions
	const activeInterruptions = speakerQueue.interruptions.filter((i) => i.expiresAt > now);
	const expiredInterruptions = speakerQueue.interruptions.filter((i) => i.expiresAt <= now);

	if (expiredInterruptions.length > 0) {
		changed = true;
		for (const interruption of expiredInterruptions) {
			await logSpeakingEnd(db, interruption.participantId, roomId);
			try {
				await setParticipantMicPermission(
					client,
					livekitRoomName(roomId),
					interruption.participantId,
					false,
				);
			} catch {
				// ignore if left
			}
		}
		speakerQueue = { ...speakerQueue, interruptions: activeInterruptions };
	}

	// 2. Check if current speaker's time has expired
	const { currentSpeaker } = speakerQueue;
	if (currentSpeaker && currentSpeaker.speakingUntil <= now) {
		changed = true;
		const phase = meta.currentPhaseId
			? await db.select().from(phases).where(eq(phases.id, meta.currentPhaseId)).get()
			: null;
		const speakingTimeSec = phase?.featureFlags?.speakingTimeSec ?? DEFAULT_SPEAKING_TIME_SEC;

		speakerQueue = await advanceToNextSpeaker(
			client,
			db,
			livekitRoomName(roomId),
			{ ...meta, speakerQueue },
			speakingTimeSec,
		);
	}

	if (changed) {
		const updated = updateSpeakerQueue(meta, speakerQueue);
		await updateRoomMetadata(client, livekitRoomName(roomId), serializeMetadata(updated));
	}

	return c.json({ success: true, speakerQueue }, 200);
});

export default app;
