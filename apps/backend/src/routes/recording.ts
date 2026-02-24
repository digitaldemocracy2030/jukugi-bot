import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { recordings, rooms } from "../db/schema";
import { generateId } from "../lib/id";
import { createEgressClient, startRoomRecording, stopEgressRecording } from "../livekit/egress";
import { adminAuth } from "../middleware/admin-auth";
import {
	listRecordingsRoute,
	startRecordingRoute,
	stopRecordingRoute,
} from "../schemas/recording.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
	LIVEKIT_URL: string;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
	RECORDINGS_BUCKET: R2Bucket;
	STORAGE_ENDPOINT?: string;
	STORAGE_ACCESS_KEY?: string;
	STORAGE_SECRET_KEY?: string;
	STORAGE_PUBLIC_URL?: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

/** Derive a stable LiveKit room name from a DB room ID */
function livekitRoomName(roomId: string): string {
	return `room-${roomId}`;
}

function formatRecording(r: typeof recordings.$inferSelect) {
	return {
		id: r.id,
		roomId: r.roomId,
		egressId: r.egressId,
		status: r.status,
		storageKey: r.storageKey ?? null,
		storageUrl: r.storageUrl ?? null,
		startedAt: r.startedAt.toISOString(),
		endedAt: r.endedAt ? r.endedAt.toISOString() : null,
		durationSec: r.durationSec ?? null,
		fileSize: r.fileSize ?? null,
	};
}

// ─── POST /api/rooms/:roomId/recording/start (admin) ─────────────────────────

app.use("/api/rooms/:roomId/recording/start", adminAuth);
app.openapi(startRecordingRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	// Check for existing active recording
	const activeRecording = await db
		.select()
		.from(recordings)
		.where(and(eq(recordings.roomId, roomId), eq(recordings.status, "recording")))
		.get();

	if (activeRecording) {
		return c.json({ error: "Recording already in progress" }, 409);
	}

	const storageEndpoint = c.env.STORAGE_ENDPOINT;
	const storageAccessKey = c.env.STORAGE_ACCESS_KEY;
	const storageSecretKey = c.env.STORAGE_SECRET_KEY;

	if (!storageEndpoint || !storageAccessKey || !storageSecretKey) {
		return c.json({ error: "Storage not configured" }, 500);
	}

	const egressClient = createEgressClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	let egressId: string;
	let storageKey: string;
	try {
		const result = await startRoomRecording(
			egressClient,
			livekitRoomName(roomId),
			{
				endpoint: storageEndpoint,
				bucket: "recordings",
				region: "auto",
				accessKey: storageAccessKey,
				secretKey: storageSecretKey,
			},
			roomId,
		);
		egressId = result.egressId;
		storageKey = result.storageKey;
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: `Failed to start recording: ${message}` }, 500);
	}

	const recordingId = generateId();
	await db.insert(recordings).values({
		id: recordingId,
		roomId,
		egressId,
		storageKey,
		status: "recording",
		startedAt: new Date(),
	});

	return c.json({ recordingId, egressId }, 200);
});

// ─── POST /api/rooms/:roomId/recording/stop (admin) ──────────────────────────

app.use("/api/rooms/:roomId/recording/stop", adminAuth);
app.openapi(stopRecordingRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const activeRecording = await db
		.select()
		.from(recordings)
		.where(and(eq(recordings.roomId, roomId), eq(recordings.status, "recording")))
		.get();

	if (!activeRecording) {
		return c.json({ error: "No active recording found" }, 404);
	}

	const egressClient = createEgressClient({
		url: c.env.LIVEKIT_URL,
		apiKey: c.env.LIVEKIT_API_KEY,
		apiSecret: c.env.LIVEKIT_API_SECRET,
	});

	try {
		await stopEgressRecording(egressClient, activeRecording.egressId);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return c.json({ error: `Failed to stop recording: ${message}` }, 500);
	}

	await db
		.update(recordings)
		.set({ status: "completed", endedAt: new Date() })
		.where(eq(recordings.id, activeRecording.id));

	return c.json({ success: true, recordingId: activeRecording.id }, 200);
});

// ─── GET /api/rooms/:roomId/recordings (admin) ───────────────────────────────

app.use("/api/rooms/:roomId/recordings", adminAuth);
app.openapi(listRecordingsRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { roomId } = c.req.valid("param");

	const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();
	if (!room) {
		return c.json({ error: "Room not found" }, 404);
	}

	const rows = await db.select().from(recordings).where(eq(recordings.roomId, roomId)).all();

	return c.json({ recordings: rows.map(formatRecording) }, 200);
});

export default app;
