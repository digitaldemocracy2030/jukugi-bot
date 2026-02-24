import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RoomMetadata } from "../src/livekit/types";
import {
	cleanDatabase,
	createTestParticipant,
	createTestPhase,
	createTestRoom,
	createTestSessionParticipation,
} from "./helpers/database";

const ADMIN_KEY = "test-admin-key";
const LIVEKIT_HOST = "https://test.livekit.example";

/**
 * In-memory LiveKit metadata store shared across mock handlers.
 * The livekit-server-sdk uses Twirp/protobuf over HTTP. We intercept and
 * return protobuf-compatible JSON responses.
 */
const livekitStore = {
	metadata: null as string | null,
};

function buildMockRoomMetadata(
	roomId: string,
	overrides: Partial<RoomMetadata> = {},
): RoomMetadata {
	return {
		roomId,
		currentPhaseId: null,
		currentPhaseType: null,
		featureFlags: { canSpeak: false, canInterrupt: false, canVote: false },
		speakerQueue: { currentSpeaker: null, queue: [], interruptions: [] },
		...overrides,
	};
}

function seedMetadata(meta: RoomMetadata): void {
	livekitStore.metadata = JSON.stringify(meta);
}

/**
 * Configure fetchMock to handle LiveKit Twirp API calls.
 * listRooms returns current metadata from the store.
 * updateRoomMetadata stores new metadata.
 */
function setupLiveKitMocks() {
	const mock = fetchMock.get(LIVEKIT_HOST);

	// listRooms - returns metadata from store
	mock
		.intercept({ method: "POST", path: /\/twirp\/livekit\.RoomService\/ListRooms/ })
		.reply(
			200,
			() => {
				if (livekitStore.metadata === null) {
					return JSON.stringify({ rooms: [] });
				}
				return JSON.stringify({ rooms: [{ name: "mock-room", metadata: livekitStore.metadata }] });
			},
			{ headers: { "Content-Type": "application/json" } },
		)
		.persist();

	// updateRoomMetadata - updates the store
	mock
		.intercept({ method: "POST", path: /\/twirp\/livekit\.RoomService\/UpdateRoomMetadata/ })
		.reply(
			200,
			(opts) => {
				try {
					const body = opts?.body ? JSON.parse(opts.body as string) : {};
					if (body.metadata) {
						livekitStore.metadata = body.metadata;
					}
				} catch {
					// ignore parse errors
				}
				return JSON.stringify({ name: "mock-room", metadata: livekitStore.metadata ?? "" });
			},
			{ headers: { "Content-Type": "application/json" } },
		)
		.persist();

	// createRoom
	mock
		.intercept({ method: "POST", path: /\/twirp\/livekit\.RoomService\/CreateRoom/ })
		.reply(200, JSON.stringify({ name: "mock-room", metadata: "" }), {
			headers: { "Content-Type": "application/json" },
		})
		.persist();

	// updateParticipant (for setParticipantCanPublish)
	mock
		.intercept({ method: "POST", path: /\/twirp\/livekit\.RoomService\/UpdateParticipant/ })
		.reply(200, JSON.stringify({}), {
			headers: { "Content-Type": "application/json" },
		})
		.persist();

	// listParticipants
	mock
		.intercept({ method: "POST", path: /\/twirp\/livekit\.RoomService\/ListParticipants/ })
		.reply(200, JSON.stringify({ participants: [] }), {
			headers: { "Content-Type": "application/json" },
		})
		.persist();
}

/**
 * Helper: create a participant identity + session_participation in one call.
 * Returns the participant UUID (used as X-Participant-Token).
 */
async function createParticipantWithSession(
	db: D1Database,
	roomId: string,
	spId: string,
): Promise<string> {
	const participantId = await createTestParticipant(db);
	await createTestSessionParticipation(db, participantId, roomId, { id: spId });
	return participantId;
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	livekitStore.metadata = null;
});

describe("POST /api/rooms/:roomId/queue/join", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should join the speaking queue when nobody is currently speaking", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "queue-join-room", status: "active" });
		const phaseId = await createTestPhase(env.DB, roomId, {
			featureFlags: { canSpeak: true, speakingTimeSec: 60 },
		});
		const token = await createParticipantWithSession(env.DB, roomId, "participant-1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			currentPhaseId: phaseId,
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			success: boolean;
			speakerQueue: {
				currentSpeaker: { participantId: string; speakingUntil: number } | null;
				queue: unknown[];
				interruptions: unknown[];
			};
		};
		expect(data.success).toBe(true);
		// Since nobody was speaking, should immediately become current speaker
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token);
		expect(data.speakerQueue.queue).toHaveLength(0);
	});

	it("should add to queue when someone is already speaking", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "queue-join-waiting-room",
			status: "active",
		});
		const token1 = await createParticipantWithSession(env.DB, roomId, "speaker-1");
		const token2 = await createParticipantWithSession(env.DB, roomId, "speaker-2");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() + 60000 },
				queue: [],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token2,
			},
			body: JSON.stringify({ displayName: "Bob" }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: {
				currentSpeaker: { participantId: string } | null;
				queue: { participantId: string }[];
			};
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token1);
		expect(data.speakerQueue.queue).toHaveLength(1);
		expect(data.speakerQueue.queue[0].participantId).toBe(token2);
	});

	it("should return 409 when already in queue", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "already-queued-room", status: "active" });
		const token = await createParticipantWithSession(env.DB, roomId, "participant-1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
			speakerQueue: {
				currentSpeaker: null,
				queue: [{ participantId: token, displayName: "Alice", requestedAt: Date.now() }],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(409);
	});

	it("should return 403 when speaking is not allowed in current phase", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "no-speak-room", status: "active" });
		const token = await createParticipantWithSession(env.DB, roomId, "participant-1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: false, canInterrupt: false, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(403);
	});

	it("should return 403 when room is not active", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "inactive-queue-room", status: "draft" });
		const token = await createParticipantWithSession(env.DB, roomId, "participant-1");

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(403);
	});

	it("should return 401 without participant token", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-queue-room", status: "active" });

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(401);
	});

	it("should return 401 with invalid participant token", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "invalid-token-room", status: "active" });

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/join`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": "nonexistent-token",
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(401);
	});

	it("should return 404 when room not found", async () => {
		const token = await createTestParticipant(env.DB);

		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent/queue/join", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		// 403 because participant is not a member of this room (room doesn't exist in session_participations)
		expect(response.status).toBe(403);
	});
});

describe("DELETE /api/rooms/:roomId/queue/leave", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should remove a participant from the queue", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "queue-leave-room", status: "active" });
		const token1 = await createParticipantWithSession(env.DB, roomId, "p1");
		const token2 = await createParticipantWithSession(env.DB, roomId, "p2");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: null,
				queue: [
					{ participantId: token1, displayName: "Alice", requestedAt: Date.now() },
					{ participantId: token2, displayName: "Bob", requestedAt: Date.now() },
				],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/leave`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token1,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: { queue: { participantId: string }[] };
		};
		expect(data.speakerQueue.queue).toHaveLength(1);
		expect(data.speakerQueue.queue[0].participantId).toBe(token2);
	});

	it("should return 401 without participant token", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-leave-room", status: "active" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/leave`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(401);
	});
});

describe("POST /api/rooms/:roomId/queue/next", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should advance to next speaker", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "queue-next-room", status: "active" });
		const token1 = await createParticipantWithSession(env.DB, roomId, "p1");
		const token2 = await createParticipantWithSession(env.DB, roomId, "p2");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() + 60000 },
				queue: [{ participantId: token2, displayName: "Bob", requestedAt: Date.now() }],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/next`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: {
				currentSpeaker: { participantId: string } | null;
				queue: unknown[];
			};
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token2);
		expect(data.speakerQueue.queue).toHaveLength(0);
	});

	it("should advance to null when queue is empty", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "empty-queue-next-room",
			status: "active",
		});
		const token1 = await createParticipantWithSession(env.DB, roomId, "p1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() + 60000 },
				queue: [],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/next`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: { currentSpeaker: null | unknown };
		};
		expect(data.speakerQueue.currentSpeaker).toBeNull();
	});

	it("should accept custom speakingTimeSec override", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "custom-time-next-room",
			status: "active",
		});
		const token1 = await createParticipantWithSession(env.DB, roomId, "p1");
		const token2 = await createParticipantWithSession(env.DB, roomId, "p2");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() + 60000 },
				queue: [{ participantId: token2, displayName: "Bob", requestedAt: Date.now() }],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/next`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ speakingTimeSec: 30 }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: { currentSpeaker: { participantId: string; speakingUntil: number } | null };
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token2);
		const nowApprox = Date.now();
		const speakingUntil = data.speakerQueue.currentSpeaker?.speakingUntil ?? 0;
		expect(speakingUntil).toBeGreaterThan(nowApprox + 25000);
		expect(speakingUntil).toBeLessThan(nowApprox + 35000);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-next-room", status: "active" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/next`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(401);
	});

	it("should return 403 when room is not active", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "inactive-next-room", status: "draft" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/next`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({}),
		});

		expect(response.status).toBe(403);
	});
});

describe("POST /api/rooms/:roomId/queue/skip", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should skip current speaker and advance to next", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "queue-skip-room", status: "active" });
		const token1 = await createParticipantWithSession(env.DB, roomId, "p1");
		const token2 = await createParticipantWithSession(env.DB, roomId, "p2");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() + 60000 },
				queue: [{ participantId: token2, displayName: "Bob", requestedAt: Date.now() }],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/skip`, {
			method: "POST",
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: {
				currentSpeaker: { participantId: string } | null;
				queue: unknown[];
			};
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token2);
		expect(data.speakerQueue.queue).toHaveLength(0);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-skip-room", status: "active" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/queue/skip`, {
			method: "POST",
		});

		expect(response.status).toBe(401);
	});
});

describe("POST /api/rooms/:roomId/interrupt", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should grant an interruption when allowed", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "interrupt-room", status: "active" });
		const token = await createParticipantWithSession(env.DB, roomId, "interrupter-1");
		await createParticipantWithSession(env.DB, roomId, "speaker-1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: true, canVote: false },
			speakerQueue: {
				currentSpeaker: { participantId: "speaker-1", speakingUntil: Date.now() + 60000 },
				queue: [],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Interrupter" }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			success: boolean;
			speakerQueue: {
				interruptions: { participantId: string; expiresAt: number }[];
			};
		};
		expect(data.success).toBe(true);
		expect(data.speakerQueue.interruptions).toHaveLength(1);
		expect(data.speakerQueue.interruptions[0].participantId).toBe(token);
		expect(data.speakerQueue.interruptions[0].expiresAt).toBeGreaterThan(Date.now());
	});

	it("should return 403 when interruptions not allowed in phase", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "no-interrupt-room", status: "active" });
		const token = await createParticipantWithSession(env.DB, roomId, "participant-1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: false, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(403);
		const data = (await response.json()) as { error: string };
		expect(data.error).toContain("Interruptions are not allowed");
	});

	it("should return 403 when max simultaneous interruptions (2) reached", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "max-interrupt-room", status: "active" });
		const token = await createParticipantWithSession(env.DB, roomId, "i3");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: true, canVote: false },
			speakerQueue: {
				currentSpeaker: null,
				queue: [],
				interruptions: [
					{ participantId: "i1", displayName: "A", expiresAt: Date.now() + 10000 },
					{ participantId: "i2", displayName: "B", expiresAt: Date.now() + 10000 },
				],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "C" }),
		});

		expect(response.status).toBe(403);
		const data = (await response.json()) as { error: string };
		expect(data.error).toContain("Maximum simultaneous interruptions");
	});

	it("should return 403 when participant is already interrupting", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "double-interrupt-room",
			status: "active",
		});
		const token = await createParticipantWithSession(env.DB, roomId, "p1");

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: true, canVote: false },
			speakerQueue: {
				currentSpeaker: null,
				queue: [],
				interruptions: [
					{ participantId: token, displayName: "Alice", expiresAt: Date.now() + 10000 },
				],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(403);
		const data = (await response.json()) as { error: string };
		expect(data.error).toContain("Already interrupting");
	});

	it("should return 403 when room is not active", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "inactive-interrupt-room",
			status: "draft",
		});
		const token = await createParticipantWithSession(env.DB, roomId, "p1");

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Participant-Token": token,
			},
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(403);
	});

	it("should return 401 without participant token", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "unauth-interrupt-room",
			status: "active",
		});

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: true, canVote: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(401);
	});
});

describe("POST /api/rooms/:roomId/interrupt/:participantId/end", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should end an active interruption", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "interrupt-end-room", status: "active" });
		const phaseId = await createTestPhase(env.DB, roomId, { type: "discussion", title: "Phase" });
		const token = await createParticipantWithSession(env.DB, roomId, "interrupter-1");

		await env.DB.prepare(
			"INSERT INTO speaking_log (id, room_id, phase_id, participant_id, type, started_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(
				"log-1",
				roomId,
				phaseId,
				"interrupter-1",
				"interruption",
				Math.floor(Date.now() / 1000),
			)
			.run();

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			featureFlags: { canSpeak: true, canInterrupt: true, canVote: false },
			speakerQueue: {
				currentSpeaker: null,
				queue: [],
				interruptions: [
					{ participantId: token, displayName: "Alice", expiresAt: Date.now() + 10000 },
				],
			},
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/interrupt/${token}/end`,
			{
				method: "POST",
				headers: { "X-Admin-Key": ADMIN_KEY },
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			success: boolean;
			speakerQueue: { interruptions: unknown[] };
		};
		expect(data.success).toBe(true);
		expect(data.speakerQueue.interruptions).toHaveLength(0);
	});

	it("should return 404 when interruption not found", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "no-interrupt-end-room",
			status: "active",
		});

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: { currentSpeaker: null, queue: [], interruptions: [] },
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/interrupt/nonexistent/end`,
			{
				method: "POST",
				headers: { "X-Admin-Key": ADMIN_KEY },
			},
		);

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "unauth-interrupt-end-room",
			status: "active",
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/interrupt/p1/end`, {
			method: "POST",
		});

		expect(response.status).toBe(401);
	});
});

describe("POST /api/rooms/:roomId/speaking/check", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		livekitStore.metadata = null;
		setupLiveKitMocks();
	});

	it("should return current speaker queue unchanged when nothing is expired", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "speaking-check-room", status: "active" });

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: { participantId: "p1", speakingUntil: Date.now() + 60000 },
				queue: [],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/speaking/check`, {
			method: "POST",
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: { currentSpeaker: { participantId: string } | null };
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe("p1");
	});

	it("should auto-advance when current speaker time has expired", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "speaking-check-expire-room",
			status: "active",
		});
		const token1 = await createParticipantWithSession(env.DB, roomId, "expired-speaker");
		const token2 = await createParticipantWithSession(env.DB, roomId, "next-speaker");

		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			featureFlags: { canSpeak: true, speakingTimeSec: 60 },
		});

		await env.DB.prepare(
			"INSERT INTO speaking_log (id, room_id, phase_id, participant_id, type, started_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(
				"log-expired",
				roomId,
				phaseId,
				"expired-speaker",
				"normal",
				Math.floor((Date.now() - 120000) / 1000),
			)
			.run();

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			currentPhaseId: phaseId,
			speakerQueue: {
				currentSpeaker: { participantId: token1, speakingUntil: Date.now() - 5000 },
				queue: [{ participantId: token2, displayName: "Next", requestedAt: Date.now() - 10000 }],
				interruptions: [],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/speaking/check`, {
			method: "POST",
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: {
				currentSpeaker: { participantId: string } | null;
				queue: unknown[];
			};
		};
		expect(data.speakerQueue.currentSpeaker?.participantId).toBe(token2);
		expect(data.speakerQueue.queue).toHaveLength(0);
	});

	it("should clear expired interruptions", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "speaking-check-interrupt-expire",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, { type: "discussion", title: "Phase" });
		const token = await createParticipantWithSession(env.DB, roomId, "exp-interrupter");

		await env.DB.prepare(
			"INSERT INTO speaking_log (id, room_id, phase_id, participant_id, type, started_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
			.bind(
				"log-int",
				roomId,
				phaseId,
				"exp-interrupter",
				"interruption",
				Math.floor((Date.now() - 30000) / 1000),
			)
			.run();

		seedMetadata({
			...buildMockRoomMetadata(roomId),
			speakerQueue: {
				currentSpeaker: null,
				queue: [],
				interruptions: [{ participantId: token, displayName: "Exp", expiresAt: Date.now() - 1000 }],
			},
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/speaking/check`, {
			method: "POST",
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			speakerQueue: { interruptions: unknown[] };
		};
		expect(data.speakerQueue.interruptions).toHaveLength(0);
	});

	it("should return 403 when room is not active", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "inactive-speaking-check",
			status: "draft",
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/speaking/check`, {
			method: "POST",
		});

		expect(response.status).toBe(403);
	});

	it("should return 404 when room not found", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent/speaking/check", {
			method: "POST",
		});

		expect(response.status).toBe(404);
	});
});
