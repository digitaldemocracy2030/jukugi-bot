import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanDatabase, createTestPhase, createTestRoom } from "./helpers/database";

const ADMIN_KEY = "test-admin-key";

/** Helper to insert a summary directly into DB */
async function insertTestSummary(
	db: D1Database,
	roomId: string,
	phaseId: string,
	overrides: {
		id?: string;
		content?: string;
		model?: string;
		transcriptCount?: number;
		createdAt?: number;
		updatedAt?: number;
	} = {},
) {
	const id = overrides.id ?? `summary-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			"INSERT INTO discussion_summaries (id, room_id, phase_id, content, model, prompt_tokens, completion_tokens, transcript_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(
			id,
			roomId,
			phaseId,
			overrides.content ?? "テスト要約",
			overrides.model ?? "gpt-4o-mini",
			100,
			50,
			overrides.transcriptCount ?? 5,
			overrides.createdAt ?? now,
			overrides.updatedAt ?? now,
		)
		.run();
	return id;
}

describe("Summary API", () => {
	let roomId: string;
	let phaseId: string;

	beforeEach(async () => {
		await cleanDatabase(env.DB);
		roomId = await createTestRoom(env.DB, { status: "active" });
		phaseId = await createTestPhase(env.DB, roomId, {
			type: "discussion",
			title: "Discussion Phase",
		});
	});

	describe("GET /api/rooms/:roomId/phases/:phaseId/summaries/latest", () => {
		it("should return null when no summary exists", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/latest`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { summary: null | Record<string, unknown> };
			expect(data.summary).toBeNull();
		});

		it("should return the summary when one exists", async () => {
			await insertTestSummary(env.DB, roomId, phaseId, {
				content: "議論の要約テスト",
				transcriptCount: 10,
			});

			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/latest`,
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { summary: Record<string, unknown> };
			expect(data.summary).not.toBeNull();
			expect(data.summary.content).toBe("議論の要約テスト");
			expect(data.summary.transcriptCount).toBe(10);
			expect(data.summary.model).toBe("gpt-4o-mini");
			expect(data.summary).toHaveProperty("createdAt");
			expect(data.summary).toHaveProperty("updatedAt");
		});

		it("should return 404 for non-existent room", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/non-existent/phases/${phaseId}/summaries/latest`,
			);
			expect(res.status).toBe(404);
		});

		it("should return 404 for non-existent phase", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/non-existent/summaries/latest`,
			);
			expect(res.status).toBe(404);
		});
	});

	describe("POST /api/rooms/:roomId/phases/:phaseId/summaries/generate", () => {
		it("should return 401 without admin key", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{ method: "POST" },
			);
			expect(res.status).toBe(401);
		});

		it("should return 404 for non-existent room", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/non-existent/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(404);
		});

		it("should return 404 for non-existent phase", async () => {
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/non-existent/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(404);
		});

		it("should skip generation when summary was updated less than 30 seconds ago", async () => {
			// Insert a summary with a recent updatedAt
			const now = Math.floor(Date.now() / 1000);
			await insertTestSummary(env.DB, roomId, phaseId, {
				content: "既存の要約",
				updatedAt: now,
			});

			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { skipped: boolean; reason: string };
			expect(data.skipped).toBe(true);
			expect(data.reason).toBe("too_recent");
		});

		it("should skip generation when no new transcripts exist", async () => {
			// Insert a summary with an old updatedAt (> 30 seconds ago)
			const oldTimestamp = Math.floor(Date.now() / 1000) - 60;
			await insertTestSummary(env.DB, roomId, phaseId, {
				content: "古い要約",
				updatedAt: oldTimestamp,
			});

			// No transcripts inserted → no_new_transcripts
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { skipped: boolean; reason: string };
			expect(data.skipped).toBe(true);
			expect(data.reason).toBe("no_new_transcripts");
		});

		it("should skip generation when no summary and no transcripts exist", async () => {
			// No summary, no transcripts → no_new_transcripts
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { skipped: boolean; reason: string };
			expect(data.skipped).toBe(true);
			expect(data.reason).toBe("no_new_transcripts");
		});
	});

	describe("Summary trigger - debounce logic", () => {
		it("should correctly detect old summaries as eligible for regeneration", async () => {
			// Insert summary updated 60 seconds ago
			const oldTimestamp = Math.floor(Date.now() / 1000) - 60;
			await insertTestSummary(env.DB, roomId, phaseId, {
				content: "古い要約",
				updatedAt: oldTimestamp,
			});

			// Insert a transcript after the summary
			const transcriptTime = Math.floor(Date.now() / 1000);
			await env.DB.prepare(
				"INSERT INTO transcripts (id, room_id, phase_id, content, language, is_final, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
				.bind("transcript-1", roomId, phaseId, "テスト発言です", "ja", 1, transcriptTime)
				.run();

			// This should attempt generation (past debounce, has transcripts),
			// but fail on LLM call with test API key → 500
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			// The request should NOT be skipped (it should attempt LLM generation)
			// Since the OpenAI key is fake, it will fail with a 500
			expect(res.status).toBe(500);
		});

		it("should pass debounce check when no previous summary exists and transcripts are available", async () => {
			// Insert a transcript (no existing summary)
			const transcriptTime = Math.floor(Date.now() / 1000);
			await env.DB.prepare(
				"INSERT INTO transcripts (id, room_id, phase_id, content, language, is_final, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
				.bind("transcript-new-1", roomId, phaseId, "新しい発言です", "ja", 1, transcriptTime)
				.run();

			// Should attempt generation (no debounce on first run)
			// Fails with 500 due to fake API key
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(500);
		});

		it("should only use isFinal transcripts", async () => {
			// Insert a summary updated 60 seconds ago
			const oldTimestamp = Math.floor(Date.now() / 1000) - 60;
			await insertTestSummary(env.DB, roomId, phaseId, {
				content: "古い要約",
				updatedAt: oldTimestamp,
			});

			// Insert a non-final transcript
			const transcriptTime = Math.floor(Date.now() / 1000);
			await env.DB.prepare(
				"INSERT INTO transcripts (id, room_id, phase_id, content, language, is_final, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
				.bind("transcript-partial", roomId, phaseId, "途中の発言", "ja", 0, transcriptTime)
				.run();

			// Should skip because no *final* transcripts exist
			const res = await SELF.fetch(
				`http://localhost/api/rooms/${roomId}/phases/${phaseId}/summaries/generate`,
				{
					method: "POST",
					headers: { "X-Admin-Key": ADMIN_KEY },
				},
			);
			expect(res.status).toBe(200);
			const data = (await res.json()) as { skipped: boolean; reason: string };
			expect(data.skipped).toBe(true);
			expect(data.reason).toBe("no_new_transcripts");
		});
	});
});
