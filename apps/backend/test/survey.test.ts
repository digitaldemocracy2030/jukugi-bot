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

describe("Survey API", () => {
	let roomId: string;
	let phaseId: string;
	let participantToken: string;

	const surveyQuestions = [
		{ id: "q1", text: "感想を記入してください", type: "text" },
		{ id: "q2", text: "満足度を評価してください", type: "scale" },
		{ id: "q3", text: "参加したいテーマは？", type: "choice", options: ["環境", "教育", "経済"] },
	];

	beforeEach(async () => {
		await cleanDatabase(env.DB);
		roomId = await createTestRoom(env.DB, { status: "active" });
		phaseId = await createTestPhase(env.DB, roomId, {
			type: "survey",
			title: "Test Survey",
			config: { questions: surveyQuestions },
		});
		participantToken = await createParticipantWithSession(env.DB, roomId);
	});

	describe("POST /api/rooms/:roomId/phases/:phaseId/survey-responses", () => {
		it("should submit survey response successfully", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "とても良い議論でした" },
							{ questionId: "q2", value: 4 },
							{ questionId: "q3", value: "環境" },
						],
					}),
				},
			);
			expect(res.status).toBe(201);
			const data = (await res.json()) as { id: string; answers: unknown[] };
			expect(data).toHaveProperty("id");
			expect(data.answers).toHaveLength(3);
		});

		it("should return 409 for duplicate response", async () => {
			const body = JSON.stringify({
				answers: [
					{ questionId: "q1", value: "回答1" },
					{ questionId: "q2", value: 3 },
					{ questionId: "q3", value: "教育" },
				],
			});

			await SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Participant-Token": participantToken,
				},
				body,
			});

			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body,
				},
			);
			expect(res.status).toBe(409);
		});

		it("should return 400 for missing question answer", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "回答" },
							// missing q2 and q3
						],
					}),
				},
			);
			expect(res.status).toBe(400);
		});

		it("should return 400 for invalid scale value", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "回答" },
							{ questionId: "q2", value: 10 },
							{ questionId: "q3", value: "環境" },
						],
					}),
				},
			);
			expect(res.status).toBe(400);
		});

		it("should return 400 for invalid choice value", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": participantToken,
					},
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "回答" },
							{ questionId: "q2", value: 3 },
							{ questionId: "q3", value: "政治" },
						],
					}),
				},
			);
			expect(res.status).toBe(400);
		});

		it("should return 401 without participant token", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "回答" },
							{ questionId: "q2", value: 3 },
							{ questionId: "q3", value: "環境" },
						],
					}),
				},
			);
			expect(res.status).toBe(401);
		});
	});

	describe("GET /api/rooms/:roomId/phases/:phaseId/survey-responses/summary", () => {
		it("should return 0 when no responses", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses/summary`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { totalResponses: number };
			expect(data.totalResponses).toBe(0);
		});

		it("should return correct count after responses", async () => {
			const p1 = participantToken;
			const p2 = await createParticipantWithSession(env.DB, roomId, { displayName: "P2" });

			const body = (token: string) =>
				SELF.fetch(`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Participant-Token": token,
					},
					body: JSON.stringify({
						answers: [
							{ questionId: "q1", value: "回答" },
							{ questionId: "q2", value: 4 },
							{ questionId: "q3", value: "環境" },
						],
					}),
				});

			await body(p1);
			await body(p2);

			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/survey-responses/summary`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { totalResponses: number };
			expect(data.totalResponses).toBe(2);
		});
	});
});
