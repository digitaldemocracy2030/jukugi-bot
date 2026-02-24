import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanDatabase } from "./helpers/database";

describe("POST /api/participants", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should create a participant and return id, displayName, recoveryCode", async () => {
		const response = await SELF.fetch("http://example.com/api/participants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Alice" }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			id: string;
			displayName: string;
			recoveryCode: string;
		};
		expect(data.id).toBeDefined();
		expect(data.displayName).toBe("Alice");
		expect(data.recoveryCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
	});

	it("should return 422 for empty displayName", async () => {
		const response = await SELF.fetch("http://example.com/api/participants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "" }),
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});

	it("should return 422 for displayName longer than 50 chars", async () => {
		const response = await SELF.fetch("http://example.com/api/participants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "A".repeat(51) }),
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});
});

describe("GET /api/participants/me", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should return participant data when valid token provided", async () => {
		// Create a participant via the API first
		const createResponse = await SELF.fetch("http://example.com/api/participants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Bob" }),
		});
		const created = (await createResponse.json()) as {
			id: string;
			displayName: string;
			recoveryCode: string;
		};

		const response = await SELF.fetch("http://example.com/api/participants/me", {
			method: "GET",
			headers: { "X-Participant-Token": created.id },
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			id: string;
			displayName: string;
			recoveryCode: string;
		};
		expect(data.id).toBe(created.id);
		expect(data.displayName).toBe("Bob");
		expect(data.recoveryCode).toBe(created.recoveryCode);
	});

	it("should return 401 when token not found", async () => {
		const response = await SELF.fetch("http://example.com/api/participants/me", {
			method: "GET",
			headers: { "X-Participant-Token": "nonexistent-token" },
		});

		expect(response.status).toBe(401);
		const data = (await response.json()) as { error: string };
		expect(data.error).toBeDefined();
	});

	it("should return 4xx when header is missing", async () => {
		const response = await SELF.fetch("http://example.com/api/participants/me", {
			method: "GET",
		});

		expect(response.status).toBeGreaterThanOrEqual(400);
		expect(response.status).toBeLessThan(500);
	});
});

describe("POST /api/participants/recover", () => {
	beforeEach(async () => {
		await cleanDatabase(env.DB);
	});

	it("should return participant data for valid recovery code", async () => {
		// Create a participant via the API first
		const createResponse = await SELF.fetch("http://example.com/api/participants", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ displayName: "Charlie" }),
		});
		const created = (await createResponse.json()) as {
			id: string;
			displayName: string;
			recoveryCode: string;
		};

		const response = await SELF.fetch("http://example.com/api/participants/recover", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ recoveryCode: created.recoveryCode }),
		});

		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			id: string;
			displayName: string;
			recoveryCode: string;
		};
		expect(data.id).toBe(created.id);
		expect(data.displayName).toBe("Charlie");
		expect(data.recoveryCode).toBe(created.recoveryCode);
	});

	it("should return 404 for invalid recovery code", async () => {
		const response = await SELF.fetch("http://example.com/api/participants/recover", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ recoveryCode: "ZZZ-ZZZ" }),
		});

		expect(response.status).toBe(404);
		const data = (await response.json()) as { error: string };
		expect(data.error).toBeDefined();
	});
});
