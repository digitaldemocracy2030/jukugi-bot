import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
	cleanDatabase,
	createTestParticipant,
	createTestPhase,
	createTestRoom,
	createTestSessionParticipation,
} from "./helpers/database";

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

describe("Voting API", () => {
	let roomId: string;
	let phaseId: string;
	let participantToken: string;

	beforeEach(async () => {
		await cleanDatabase(env.DB);
		roomId = await createTestRoom(env.DB, { status: "active" });
		phaseId = await createTestPhase(env.DB, roomId, {
			type: "voting",
			title: "Test Vote",
			config: { question: "好きな色は？", options: ["赤", "青", "緑"] },
			featureFlags: { canVote: true },
		});
		participantToken = await createParticipantWithSession(env.DB, roomId);
	});

	describe("POST /api/rooms/:roomId/phases/:phaseId/votes", () => {
		it("should submit a vote successfully", async () => {
			const res = await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": participantToken,
				},
				body: JSON.stringify({ selectedOption: "赤" }),
			});
			expect(res.status).toBe(201);
			const data = (await res.json()) as {
				id: string;
				selectedOption: string;
				participantId: string;
			};
			expect(data).toHaveProperty("id");
			expect(data.selectedOption).toBe("赤");
			expect(data.participantId).toBe(participantToken);
		});

		it("should return 409 for duplicate vote", async () => {
			// First vote
			await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": participantToken,
				},
				body: JSON.stringify({ selectedOption: "赤" }),
			});

			// Duplicate vote
			const res = await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": participantToken,
				},
				body: JSON.stringify({ selectedOption: "青" }),
			});
			expect(res.status).toBe(409);
		});

		it("should return 400 for invalid option", async () => {
			const res = await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": participantToken,
				},
				body: JSON.stringify({ selectedOption: "黄" }),
			});
			expect(res.status).toBe(400);
		});

		it("should return 401 without participant token", async () => {
			const res = await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ selectedOption: "赤" }),
			});
			expect(res.status).toBe(401);
		});

		it("should return 404 for non-voting phase", async () => {
			const discussionPhaseId = await createTestPhase(env.DB, roomId, {
				type: "discussion",
				title: "Discussion",
			});
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${discussionPhaseId}/votes`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body: JSON.stringify({ selectedOption: "test" }),
				},
			);
			expect(res.status).toBe(404);
		});
	});

	describe("GET /api/rooms/:roomId/phases/:phaseId/votes/results", () => {
		it("should return empty results when no votes", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes/results`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { totalVotes: number; results: Record<string, number> };
			expect(data.totalVotes).toBe(0);
			expect(data.results).toEqual({ 赤: 0, 青: 0, 緑: 0 });
		});

		it("should return aggregated results after votes", async () => {
			// Create two participants and vote
			const p1 = participantToken;
			const p2 = await createParticipantWithSession(env.DB, roomId, {
				displayName: "P2",
			});
			const p3 = await createParticipantWithSession(env.DB, roomId, {
				displayName: "P3",
			});

			// Vote
			for (const [token, option] of [
				[p1, "赤"],
				[p2, "赤"],
				[p3, "青"],
			] as const) {
				await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": token,
					},
					body: JSON.stringify({ selectedOption: option }),
				});
			}

			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/votes/results`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { totalVotes: number; results: Record<string, number> };
			expect(data.totalVotes).toBe(3);
			expect(data.results.赤).toBe(2);
			expect(data.results.青).toBe(1);
			expect(data.results.緑).toBe(0);
		});
	});
});
