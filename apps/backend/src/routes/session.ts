import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { AgentDispatchClient } from "livekit-server-sdk";
import {
	participants,
	phaseActivations,
	phases,
	phaseTransitionProposals,
	recordings,
	rooms,
	sessionParticipations,
} from "../db/schema";
import { generateId } from "../lib/id";
import { createEgressClient, startRoomRecording } from "../livekit/egress";
import {
	buildInitialMetadata,
	buildPhaseMetadata,
	phaseFeatureFlagsToRoom,
	serializeMetadata,
} from "../livekit/metadata";
import {
	createRoomServiceClient,
	ensureLiveKitRoom,
	updateRoomMetadata,
} from "../livekit/room-service";
import { generateParticipantToken } from "../livekit/token";
import { adminAuth } from "../middleware/admin-auth";
import { activateRoomRoute, joinRoomRoute, phaseTransitionRoute } from "../schemas/session.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	ENVIRONMENT: string;
	LIVEKIT_URL: string;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
	RECORDINGS_BUCKET: R2Bucket;
	STORAGE_ENDPOINT?: string;
	STORAGE_ACCESS_KEY?: string;
	STORAGE_SECRET_KEY?: string;
	TRANSCRIPTION_AGENT_NAME?: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

/** Derive a stable LiveKit room name from a DB room ID */
function livekitRoomName(roomId: string): string {
	return `room-${roomId}`;
}

// ─── POST /api/rooms/:roomId/join (public) ────────────────────────────────────

app.openapi(joinRoomRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const body = c.req.valid("json");

	// 1. Resolve identity from participantToken
	const participant = await db
		.select()
		.from(participants)
		.where(eq(participants.id, body.participantToken))
		.get();

	if (!participant) {
		return c.json({ error: "Participant not found" }, 404);
	}

	// 2. Validate room
	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	if (room.status !== "active") {
		return c.json({ error: "Room is not active" }, 403);
	}

	// 3. Upsert session participation
	const existing = await db
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

	const sessionParticipationId = existing?.id ?? generateId();

	if (!existing) {
		await db.insert(sessionParticipations).values({
			id: sessionParticipationId,
			participantId: participant.id,
			roomId,
			role: body.role ?? "participant",
			joinedAt: new Date(),
		});
	}

	// 4. Generate LiveKit token with participant UUID as identity
	const token = await generateParticipantToken({
		livekitApiKey: c.env.LIVEKIT_API_KEY,
		livekitApiSecret: c.env.LIVEKIT_API_SECRET,
		roomName: livekitRoomName(roomId),
		participantId: participant.id,
		displayName: participant.displayName,
		role: body.role ?? "participant",
	});

	return c.json(
		{
			token,
			livekitUrl: c.env.LIVEKIT_URL,
			participantId: participant.id,
			roomId,
		},
		200,
	);
});

// ─── POST /api/rooms/:roomId/activate (admin) ─────────────────────────────────

app.use("/api/rooms/:roomId/activate", adminAuth);
app.openapi(activateRoomRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	if (room.status === "active") {
		return c.json({ error: "Room is already active" }, 409);
	}

	const roomName = livekitRoomName(roomId);
	const initialMetadata = buildInitialMetadata(roomId);

	// Create LiveKit room with initial metadata
	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	await ensureLiveKitRoom(client, roomName, {
		maxParticipants: room.maxParticipants,
		metadata: serializeMetadata(initialMetadata),
	});

	// Explicitly update metadata in case the LiveKit room already existed
	// (createRoom does not overwrite metadata on an existing room)
	await updateRoomMetadata(client, roomName, serializeMetadata(initialMetadata));

	// Update room status to active
	await db
		.update(rooms)
		.set({ status: "active", updatedAt: new Date() })
		.where(eq(rooms.id, roomId));

	const db2 = drizzle(c.env.DB);

	// Auto-start recording if R2 storage is configured
	if (c.env.STORAGE_ENDPOINT && c.env.STORAGE_ACCESS_KEY && c.env.STORAGE_SECRET_KEY) {
		try {
			const egressClient = createEgressClient({
				url: c.env.LIVEKIT_URL,
				apiKey: c.env.LIVEKIT_API_KEY,
				apiSecret: c.env.LIVEKIT_API_SECRET,
			});
			const { egressId, storageKey } = await startRoomRecording(
				egressClient,
				roomName,
				{
					endpoint: c.env.STORAGE_ENDPOINT,
					bucket: "recordings",
					region: "auto",
					accessKey: c.env.STORAGE_ACCESS_KEY,
					secretKey: c.env.STORAGE_SECRET_KEY,
				},
				roomId,
			);
			await db2.insert(recordings).values({
				id: generateId(),
				roomId,
				egressId,
				storageKey,
				status: "recording",
				startedAt: new Date(),
			});
		} catch {
			// Non-fatal: log but don't block activation
		}
	}

	// Dispatch transcription agent if configured
	if (c.env.TRANSCRIPTION_AGENT_NAME) {
		try {
			const dispatchClient = new AgentDispatchClient(
				c.env.LIVEKIT_URL,
				c.env.LIVEKIT_API_KEY,
				c.env.LIVEKIT_API_SECRET,
			);
			await dispatchClient.createDispatch(roomName, c.env.TRANSCRIPTION_AGENT_NAME, {
				metadata: roomId,
			});
		} catch {
			// Non-fatal: log but don't block activation
		}
	}

	return c.json(
		{
			success: true,
			roomId,
			livekitRoomName: roomName,
		},
		200,
	);
});

// ─── POST /api/rooms/:roomId/phase/transition (admin) ─────────────────────────

app.use("/api/rooms/:roomId/phase/transition", adminAuth);
app.openapi(phaseTransitionRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");
	const { phaseId } = c.req.valid("json");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	if (room.status !== "active") {
		return c.json({ error: "Room is not active" }, 403);
	}

	const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
	if (!phase || phase.roomId !== roomId) {
		return c.json({ error: "Phase not found" }, 404);
	}

	// Close current phase activation
	const now = new Date();
	await db
		.update(phaseActivations)
		.set({ endedAt: now })
		.where(and(eq(phaseActivations.roomId, roomId), isNull(phaseActivations.endedAt)));

	// Cancel any open transition proposals
	await db
		.update(phaseTransitionProposals)
		.set({ status: "cancelled", resolvedAt: now })
		.where(
			and(eq(phaseTransitionProposals.roomId, roomId), eq(phaseTransitionProposals.status, "open")),
		);

	// Create new phase activation
	await db.insert(phaseActivations).values({
		id: crypto.randomUUID(),
		roomId,
		phaseId,
		startedBy: "admin",
		startedAt: now,
	});

	const client = createRoomServiceClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	const roomName = livekitRoomName(roomId);

	// Build updated metadata for the new phase (transitionProposal cleared by buildPhaseMetadata)
	const flags = phaseFeatureFlagsToRoom(phase.featureFlags ?? {});
	const baseMetadata = buildInitialMetadata(roomId);
	const newMetadata = buildPhaseMetadata(baseMetadata, phaseId, phase.type, flags);

	await updateRoomMetadata(client, roomName, serializeMetadata(newMetadata));

	return c.json(
		{
			success: true,
			phaseId,
			phaseType: phase.type,
		},
		200,
	);
});

export default app;
