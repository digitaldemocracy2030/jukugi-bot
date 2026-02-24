import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("/ endpoint", () => {
	it("should return hello message", async () => {
		const response = await SELF.fetch("http://example.com/");
		expect(response.status).toBe(200);

		const data = (await response.json()) as { message: string };
		expect(data).toHaveProperty("message", "Hello Hono!");
	});
});

describe("Database connection", () => {
	it("should connect to D1 database", async () => {
		expect(env.DB).toBeDefined();

		const result = await env.DB.prepare("SELECT 1 as test").first();
		expect(result).toEqual({ test: 1 });
	});
});
