import { env, fetchMock, SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	cleanDatabase,
	createTestParticipant,
	createTestPhase,
	createTestRoom,
	createTestSessionParticipation,
} from "./helpers/database";

const ADMIN_KEY = "test-admin-key";
const LIVEKIT_HOST = "https://test.livekit.example";

function setupLiveKitFetchMocks() {
	const mockLivekit = fetchMock.get(LIVEKIT_HOST);
	mockLivekit
		.intercept({
			method: "POST",
			path: /^\/twirp\/livekit\.RoomService\/UpdateRoomMetadata/,
		})
		.reply(200, JSON.stringify({ name: "mock-room", metadata: "" }), {
			headers: { "Content-Type": "application/json" },
		})
		.persist();
}

async function createTestPhaseActivation(
	db: D1Database,
	roomId: string,
	phaseId: string,
	overrides: { startedAt?: number; endedAt?: number | null } = {},
): Promise<string> {
	const id = `activation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const startedAt = overrides.startedAt ?? Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO phase_activations (id, room_id, phase_id, started_by, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(id, roomId, phaseId, "admin", startedAt, overrides.endedAt ?? null)
		.run();
	return id;
}

async function createTestProposal(
	db: D1Database,
	roomId: string,
	fromPhaseId: string,
	overrides: { status?: string; threshold?: number } = {},
): Promise<string> {
	const id = `proposal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO phase_transition_proposals (id, room_id, from_phase_id, proposed_by, proposed_by_role, status, required_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			roomId,
			fromPhaseId,
			"admin",
			"admin",
			overrides.status ?? "open",
			overrides.threshold ?? 0.5,
			now,
		)
		.run();
	return id;
}

/**
 * Helper: create a participant + session_participation and return the participant UUID (token).
 */
async function createParticipantWithSession(
	db: D1Database,
	roomId: string,
	overrides: { displayName?: string } = {},
): Promise<string> {
	const participantId = await createTestParticipant(db, {
		displayName: overrides.displayName ?? "Test Participant",
	});
	await createTestSessionParticipation(db, participantId, roomId);
	return participantId;
}

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

describe("POST /api/rooms/:roomId/transition-proposals", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		setupLiveKitFetchMocks();
	});

	it("should allow admin to create a proposal", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "admin-propose",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
			featureFlags: { participantCanProposeTransition: true },
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(201);
		const data = (await response.json()) as {
			id: string;
			status: string;
			yesCount: number;
		};
		expect(data.id).toBeDefined();
		expect(data.status).toBe("open");
		expect(data.yesCount).toBe(0);
	});

	it("should allow participant when participantCanProposeTransition=true", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "participant-propose-ok",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
			featureFlags: { participantCanProposeTransition: true },
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "Alice",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(201);
	});

	it("should reject participant when participantCanProposeTransition=false", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "participant-propose-denied",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
			featureFlags: { participantCanProposeTransition: false },
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "Bob",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(403);
	});

	it("should return 409 when an open proposal already exists", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "duplicate-propose",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
			featureFlags: { participantCanProposeTransition: true },
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		await createTestProposal(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(409);
	});

	it("should return 425 when transitionMinDurationSec not elapsed", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "min-duration",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
			featureFlags: {
				participantCanProposeTransition: true,
				transitionMinDurationSec: 3600,
			},
		});
		// Started just now, so 3600s has not elapsed
		await createTestPhaseActivation(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(425);
		const data = (await response.json()) as {
			error: string;
			remainingSec: number;
		};
		expect(data.remainingSec).toBeGreaterThan(0);
	});

	it("should return 404 when no active phase exists", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "no-active-phase",
			status: "active",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(404);
	});

	it("should return 404 when room does not exist", async () => {
		const response = await SELF.fetch(
			"http://example.com/api/rooms/nonexistent/transition-proposals",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(404);
	});

	it("should return 401 without any auth header", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "unauth-propose",
			status: "active",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			},
		);

		expect(response.status).toBe(401);
	});
});

describe("GET /api/rooms/:roomId/transition-proposals/active", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		setupLiveKitFetchMocks();
	});

	it("should return the active proposal with vote counts", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "active-proposal",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestProposal(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/active`,
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			yesCount: number;
			noCount: number;
		};
		expect(data.yesCount).toBe(0);
		expect(data.noCount).toBe(0);
	});

	it("should return 404 when no open proposal exists", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "no-proposal",
			status: "active",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/active`,
		);

		expect(response.status).toBe(404);
	});
});

describe("POST /api/rooms/:roomId/transition-proposals/:proposalId/votes", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		setupLiveKitFetchMocks();
	});

	it("should cast a yes vote", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "vote-yes",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "Voter1",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "yes" }),
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { yesCount: number };
		expect(data.yesCount).toBe(1);
	});

	it("should cast a no vote", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "vote-no",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "Voter2",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "no" }),
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { noCount: number };
		expect(data.noCount).toBe(1);
	});

	it("should return 409 when same participant votes twice", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "vote-dup",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "DupVoter",
		});

		// First vote
		await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "yes" }),
			},
		);

		// Second vote
		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "no" }),
			},
		);

		expect(response.status).toBe(409);
	});

	it("should return 409 when voting on a closed proposal", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "vote-closed",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId, {
			status: "approved",
		});
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "LateVoter",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "yes" }),
			},
		);

		expect(response.status).toBe(409);
	});

	it("should approve proposal when threshold is met", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "vote-approve",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId, {
			threshold: 1.0,
		});
		const token = await createParticipantWithSession(env.DB, roomId, {
			displayName: "ApproveVoter",
		});

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": token,
				},
				body: JSON.stringify({ choice: "yes" }),
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { status: string };
		expect(data.status).toBe("approved");
	});

	it("should return 401 without participant token", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "unauth-vote",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ choice: "yes" }),
			},
		);

		expect(response.status).toBe(401);
	});
});

describe("DELETE /api/rooms/:roomId/transition-proposals/:proposalId", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
		setupLiveKitFetchMocks();
	});

	it("should allow admin to reject a proposal", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "admin-reject",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}`,
			{
				method: "DELETE",
				headers: { "X-Admin-Key": ADMIN_KEY },
			},
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as { success: boolean };
		expect(data.success).toBe(true);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, {
			slug: "unauth-reject",
			status: "active",
		});
		const phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion",
		});
		await createTestPhaseActivation(env.DB, roomId, phaseId);
		const proposalId = await createTestProposal(env.DB, roomId, phaseId);

		const response = await SELF.fetch(
			`http://example.com/api/rooms/${roomId}/transition-proposals/${proposalId}`,
			{
				method: "DELETE",
			},
		);

		expect(response.status).toBe(401);
	});
});
