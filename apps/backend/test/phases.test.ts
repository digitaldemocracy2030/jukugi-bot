import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanDatabase, createTestPhase, createTestRoom } from "./helpers/database";

const ADMIN_KEY = "test-admin-key";

describe("POST /api/rooms/:roomId/phases", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should create a phase in a room", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "phase-room", title: "Phase Room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({
				type: "discussion",
				title: "Discussion Phase",
				sortOrder: 0,
				featureFlags: { canSpeak: true, canInterrupt: false, speakingTimeSec: 60 },
				config: { topic: "Climate change" },
			}),
		});

		expect(response.status).toBe(201);
		const data = (await response.json()) as {
			id: string;
			roomId: string;
			type: string;
			title: string;
			sortOrder: number;
			featureFlags: Record<string, unknown>;
			config: Record<string, unknown>;
			createdAt: string;
		};
		expect(data.roomId).toBe(roomId);
		expect(data.type).toBe("discussion");
		expect(data.title).toBe("Discussion Phase");
		expect(data.sortOrder).toBe(0);
		expect(data.featureFlags).toMatchObject({ canSpeak: true, speakingTimeSec: 60 });
		expect(data.config).toMatchObject({ topic: "Climate change" });
		expect(data.id).toBeDefined();
		expect(data.createdAt).toBeDefined();
	});

	it("should auto-assign sortOrder at end when not provided", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "auto-order-room" });
		await createTestPhase(env.DB, roomId, { sortOrder: 0, title: "First" });
		await createTestPhase(env.DB, roomId, { sortOrder: 1, title: "Second" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ type: "voting", title: "Third Phase" }),
		});

		expect(response.status).toBe(201);
		const data = (await response.json()) as { sortOrder: number };
		expect(data.sortOrder).toBe(2);
	});

	it("should accept all valid phase types", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "type-test-room" });

		for (const type of ["video", "discussion", "voting", "survey"]) {
			const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Key": ADMIN_KEY,
				},
				body: JSON.stringify({ type, title: `${type} phase` }),
			});
			expect(response.status).toBe(201);
		}
	});

	it("should return 404 when room not found", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent/phases", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ type: "discussion", title: "Phase" }),
		});

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-phases-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "discussion", title: "Phase" }),
		});

		expect(response.status).toBe(401);
	});

	it("should return 4xx for invalid phase type", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "invalid-type-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ type: "invalid-type", title: "Phase" }),
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});
});

describe("GET /api/rooms/:roomId/phases", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should list phases in sortOrder", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "list-phases-room" });
		await createTestPhase(env.DB, roomId, { sortOrder: 2, title: "Third" });
		await createTestPhase(env.DB, roomId, { sortOrder: 0, title: "First" });
		await createTestPhase(env.DB, roomId, { sortOrder: 1, title: "Second" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { title: string; sortOrder: number }[];
		expect(data).toHaveLength(3);
		expect(data[0].title).toBe("First");
		expect(data[1].title).toBe("Second");
		expect(data[2].title).toBe("Third");
	});

	it("should return empty array when room has no phases", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "empty-phases-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as unknown[];
		expect(data).toHaveLength(0);
	});

	it("should return 404 when room not found", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent/phases", {
			headers: { "X-Admin-Key": ADMIN_KEY },
		});
		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "public-phases-room" });
		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`);
		expect(response.status).toBe(401);
	});
});

describe("PATCH /api/rooms/:roomId/phases/:phaseId", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should update phase title and featureFlags", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "update-phase-room" });
		const phaseId = await createTestPhase(env.DB, roomId, {
			title: "Old Title",
			featureFlags: { canSpeak: false },
		});

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/${phaseId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({
				title: "New Title",
				featureFlags: { canSpeak: true, canInterrupt: true, speakingTimeSec: 90 },
			}),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			title: string;
			featureFlags: Record<string, unknown>;
		};
		expect(data.title).toBe("New Title");
		expect(data.featureFlags).toMatchObject({
			canSpeak: true,
			canInterrupt: true,
			speakingTimeSec: 90,
		});
	});

	it("should return 404 when phase not found", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "missing-phase-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/nonexistent`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ title: "New Title" }),
		});

		expect(response.status).toBe(404);
	});

	it("should return 404 when phase belongs to a different room", async () => {
		const room1Id = await createTestRoom(env.DB, { slug: "room-1" });
		const room2Id = await createTestRoom(env.DB, { slug: "room-2" });
		const phaseId = await createTestPhase(env.DB, room1Id, { title: "Phase in Room1" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${room2Id}/phases/${phaseId}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ title: "New Title" }),
		});

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-update-phase-room" });
		const phaseId = await createTestPhase(env.DB, roomId, { title: "Phase" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/${phaseId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "New Title" }),
		});

		expect(response.status).toBe(401);
	});
});

describe("DELETE /api/rooms/:roomId/phases/:phaseId", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should delete a phase", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "delete-phase-room" });
		const phaseId = await createTestPhase(env.DB, roomId, { title: "Phase to Delete" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/${phaseId}`, {
			method: "DELETE",
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { success: boolean };
		expect(data.success).toBe(true);

		// Confirm it's gone
		const listResponse = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases`, {
			headers: { "X-Admin-Key": ADMIN_KEY },
		});
		const phases = (await listResponse.json()) as unknown[];
		expect(phases).toHaveLength(0);
	});

	it("should return 404 for non-existent phase", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "missing-delete-phase-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/nonexistent`, {
			method: "DELETE",
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-delete-phase-room" });
		const phaseId = await createTestPhase(env.DB, roomId, { title: "Phase" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/${phaseId}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(401);
	});
});

describe("PUT /api/rooms/:roomId/phases/reorder", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should reorder phases", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "reorder-room" });
		const phase1Id = await createTestPhase(env.DB, roomId, { sortOrder: 0, title: "Phase A" });
		const phase2Id = await createTestPhase(env.DB, roomId, { sortOrder: 1, title: "Phase B" });
		const phase3Id = await createTestPhase(env.DB, roomId, { sortOrder: 2, title: "Phase C" });

		// Reverse order: C, A, B
		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/reorder`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ orderedIds: [phase3Id, phase1Id, phase2Id] }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { title: string; sortOrder: number }[];
		expect(data).toHaveLength(3);
		expect(data[0].title).toBe("Phase C");
		expect(data[1].title).toBe("Phase A");
		expect(data[2].title).toBe("Phase B");
	});

	it("should return 404 when room not found", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent/phases/reorder", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ orderedIds: ["id1", "id2"] }),
		});

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const roomId = await createTestRoom(env.DB, { slug: "unauth-reorder-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${roomId}/phases/reorder`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ orderedIds: [] }),
		});

		expect(response.status).toBe(401);
	});
});
