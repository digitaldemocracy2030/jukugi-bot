import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanDatabase, createTestRoom } from "./helpers/database";

const ADMIN_KEY = "test-admin-key";

describe("POST /api/rooms", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should create a room with valid data", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({
				slug: "test-room",
				title: "Test Room",
				description: "A test room",
				status: "draft",
				maxParticipants: 20,
			}),
		});

		expect(response.status).toBe(201);
		const data = (await response.json()) as {
			id: string;
			slug: string;
			title: string;
			description: string | null;
			status: string;
			maxParticipants: number;
			createdAt: string;
			updatedAt: string;
		};
		expect(data.slug).toBe("test-room");
		expect(data.title).toBe("Test Room");
		expect(data.description).toBe("A test room");
		expect(data.status).toBe("draft");
		expect(data.maxParticipants).toBe(20);
		expect(data.id).toBeDefined();
		expect(data.createdAt).toBeDefined();
		expect(data.updatedAt).toBeDefined();
	});

	it("should create a room with defaults when optional fields are omitted", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ slug: "minimal-room", title: "Minimal Room" }),
		});

		expect(response.status).toBe(201);
		const data = (await response.json()) as { status: string; maxParticipants: number };
		expect(data.status).toBe("draft");
		expect(data.maxParticipants).toBe(10);
	});

	it("should return 409 when slug is already taken", async () => {
		await createTestRoom(env.DB, { slug: "duplicate-slug", title: "First Room" });

		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ slug: "duplicate-slug", title: "Second Room" }),
		});

		expect(response.status).toBe(409);
		const data = (await response.json()) as { error: string };
		expect(data.error).toBe("Slug already taken");
	});

	it("should return 401 without X-Admin-Key header", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ slug: "no-auth-room", title: "No Auth Room" }),
		});

		expect(response.status).toBe(401);
	});

	it("should return 401 with wrong X-Admin-Key", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": "wrong-key",
			},
			body: JSON.stringify({ slug: "wrong-key-room", title: "Wrong Key Room" }),
		});

		expect(response.status).toBe(401);
	});

	it("should return 4xx for invalid body", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ slug: "" }), // missing title, empty slug
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});
});

describe("GET /api/rooms/:slug", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should get a room by slug", async () => {
		const id = await createTestRoom(env.DB, {
			slug: "my-room",
			title: "My Room",
			status: "active",
		});

		const response = await SELF.fetch("http://example.com/api/rooms/my-room");

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			id: string;
			slug: string;
			title: string;
			status: string;
		};
		expect(data.id).toBe(id);
		expect(data.slug).toBe("my-room");
		expect(data.title).toBe("My Room");
		expect(data.status).toBe("active");
	});

	it("should return 404 when room not found", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent");

		expect(response.status).toBe(404);
		const data = (await response.json()) as { error: string };
		expect(data.error).toBe("Room not found");
	});

	it("should be accessible without auth (public endpoint)", async () => {
		await createTestRoom(env.DB, { slug: "public-room", title: "Public Room" });

		const response = await SELF.fetch("http://example.com/api/rooms/public-room");
		expect(response.status).toBe(200);
	});
});

describe("PATCH /api/rooms/:roomId", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should update a room", async () => {
		const id = await createTestRoom(env.DB, { slug: "update-room", title: "Old Title" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				"X-Admin-Key": ADMIN_KEY,
			},
			body: JSON.stringify({ title: "New Title", status: "active" }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { title: string; status: string };
		expect(data.title).toBe("New Title");
		expect(data.status).toBe("active");
	});

	it("should return 404 when updating non-existent room", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent-id", {
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
		const id = await createTestRoom(env.DB, { slug: "auth-test-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "New Title" }),
		});

		expect(response.status).toBe(401);
	});
});

describe("DELETE /api/rooms/:roomId", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should delete a room", async () => {
		const id = await createTestRoom(env.DB, { slug: "delete-room", title: "Room to Delete" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${id}`, {
			method: "DELETE",
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as { success: boolean };
		expect(data.success).toBe(true);

		// Confirm it's gone
		const getResponse = await SELF.fetch("http://example.com/api/rooms/delete-room");
		expect(getResponse.status).toBe(404);
	});

	it("should return 404 when deleting non-existent room", async () => {
		const response = await SELF.fetch("http://example.com/api/rooms/nonexistent-id", {
			method: "DELETE",
			headers: { "X-Admin-Key": ADMIN_KEY },
		});

		expect(response.status).toBe(404);
	});

	it("should return 401 without admin key", async () => {
		const id = await createTestRoom(env.DB, { slug: "delete-auth-room" });

		const response = await SELF.fetch(`http://example.com/api/rooms/${id}`, {
			method: "DELETE",
		});

		expect(response.status).toBe(401);
	});
});
