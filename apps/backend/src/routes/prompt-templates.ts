import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, not } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { promptTemplates } from "../db/schema";
import { generateId } from "../lib/id";
import { adminAuth } from "../middleware/admin-auth";
import {
	createPromptTemplateRoute,
	deletePromptTemplateRoute,
	getPromptTemplateRoute,
	listPromptTemplatesRoute,
	updatePromptTemplateRoute,
} from "../schemas/prompt-template.schema";

type Bindings = {
	DB: D1Database;
	ADMIN_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

function formatTemplate(t: typeof promptTemplates.$inferSelect) {
	return {
		...t,
		description: t.description ?? null,
		createdAt: t.createdAt.toISOString(),
		updatedAt: t.updatedAt.toISOString(),
	};
}

// GET /api/prompt-templates (public)
app.openapi(listPromptTemplatesRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const all = await db.select().from(promptTemplates).all();
	return c.json(all.map(formatTemplate), 200);
});

// GET /api/prompt-templates/:templateId (public)
app.openapi(getPromptTemplateRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { templateId } = c.req.valid("param");
	const template = await db
		.select()
		.from(promptTemplates)
		.where(eq(promptTemplates.id, templateId))
		.get();
	if (!template) {
		return c.json({ error: "Prompt template not found" }, 404);
	}
	return c.json(formatTemplate(template), 200);
});

// POST /api/prompt-templates (admin)
app.use("/api/prompt-templates", adminAuth);
app.openapi(createPromptTemplateRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const body = c.req.valid("json");

	const now = new Date();
	const id = generateId();

	// If setting as default, reset other defaults
	if (body.isDefault) {
		await db
			.update(promptTemplates)
			.set({ isDefault: false, updatedAt: now })
			.where(eq(promptTemplates.isDefault, true));
	}

	const template = await db
		.insert(promptTemplates)
		.values({
			id,
			name: body.name,
			description: body.description ?? null,
			systemPrompt: body.systemPrompt,
			userPromptTemplate: body.userPromptTemplate,
			language: body.language ?? "ja",
			isDefault: body.isDefault ?? false,
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.get();

	return c.json(formatTemplate(template), 201);
});

// PATCH /api/prompt-templates/:templateId (admin)
app.use("/api/prompt-templates/:templateId", adminAuth);
app.openapi(updatePromptTemplateRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { templateId } = c.req.valid("param");
	const body = c.req.valid("json");

	const existing = await db
		.select()
		.from(promptTemplates)
		.where(eq(promptTemplates.id, templateId))
		.get();
	if (!existing) {
		return c.json({ error: "Prompt template not found" }, 404);
	}

	const now = new Date();

	// If setting as default, reset other defaults
	if (body.isDefault) {
		await db
			.update(promptTemplates)
			.set({ isDefault: false, updatedAt: now })
			.where(not(eq(promptTemplates.id, templateId)));
	}

	const updated = await db
		.update(promptTemplates)
		.set({
			...(body.name !== undefined ? { name: body.name } : {}),
			...(body.description !== undefined ? { description: body.description } : {}),
			...(body.systemPrompt !== undefined ? { systemPrompt: body.systemPrompt } : {}),
			...(body.userPromptTemplate !== undefined
				? { userPromptTemplate: body.userPromptTemplate }
				: {}),
			...(body.language !== undefined ? { language: body.language } : {}),
			...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
			updatedAt: now,
		})
		.where(eq(promptTemplates.id, templateId))
		.returning()
		.get();

	return c.json(formatTemplate(updated), 200);
});

// DELETE /api/prompt-templates/:templateId (admin)
app.openapi(deletePromptTemplateRoute, async (c) => {
	const db = drizzle(c.env.DB);
	const { templateId } = c.req.valid("param");

	const existing = await db
		.select()
		.from(promptTemplates)
		.where(eq(promptTemplates.id, templateId))
		.get();
	if (!existing) {
		return c.json({ error: "Prompt template not found" }, 404);
	}

	await db.delete(promptTemplates).where(eq(promptTemplates.id, templateId));

	return c.json({ success: true }, 200);
});

export default app;
