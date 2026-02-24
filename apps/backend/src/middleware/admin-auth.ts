import { createMiddleware } from "hono/factory";

type Bindings = {
	ADMIN_API_KEY: string;
};

export const adminAuth = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
	const key = c.req.header("X-Admin-Key");
	const expected = c.env.ADMIN_API_KEY;

	if (!expected) {
		return c.json({ error: "Server misconfiguration: ADMIN_API_KEY not set" }, 500);
	}

	if (!key || key !== expected) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
});
