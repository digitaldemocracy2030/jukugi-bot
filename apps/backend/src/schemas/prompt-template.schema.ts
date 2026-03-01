import { createRoute, z } from "@hono/zod-openapi";

export const PromptTemplateSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		description: z.string().nullable(),
		systemPrompt: z.string(),
		userPromptTemplate: z.string(),
		language: z.string(),
		isDefault: z.boolean(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("PromptTemplate");

export const CreatePromptTemplateSchema = z
	.object({
		name: z.string().min(1).max(200),
		description: z.string().max(2000).optional(),
		systemPrompt: z.string().min(1),
		userPromptTemplate: z.string().min(1),
		language: z.string().min(1).max(10).optional().default("ja"),
		isDefault: z.boolean().optional().default(false),
	})
	.openapi("CreatePromptTemplate");

export const UpdatePromptTemplateSchema = z
	.object({
		name: z.string().min(1).max(200).optional(),
		description: z.string().max(2000).nullable().optional(),
		systemPrompt: z.string().min(1).optional(),
		userPromptTemplate: z.string().min(1).optional(),
		language: z.string().min(1).max(10).optional(),
		isDefault: z.boolean().optional(),
	})
	.openapi("UpdatePromptTemplate");

export const PromptTemplateParamsSchema = z
	.object({
		templateId: z.string(),
	})
	.openapi("PromptTemplateParams");

// Route definitions
export const listPromptTemplatesRoute = createRoute({
	method: "get",
	path: "/api/prompt-templates",
	tags: ["PromptTemplates"],
	summary: "List all prompt templates",
	security: [{ AdminKeyAuth: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: z.array(PromptTemplateSchema) } },
			description: "Prompt template list",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
	},
});

export const getPromptTemplateRoute = createRoute({
	method: "get",
	path: "/api/prompt-templates/{templateId}",
	tags: ["PromptTemplates"],
	summary: "Get a prompt template by ID",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: PromptTemplateParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: PromptTemplateSchema } },
			description: "Prompt template found",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Prompt template not found",
		},
	},
});

export const createPromptTemplateRoute = createRoute({
	method: "post",
	path: "/api/prompt-templates",
	tags: ["PromptTemplates"],
	summary: "Create a new prompt template",
	security: [{ AdminKeyAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreatePromptTemplateSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: PromptTemplateSchema } },
			description: "Prompt template created",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		422: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), details: z.any() }),
				},
			},
			description: "Validation error",
		},
	},
});

export const updatePromptTemplateRoute = createRoute({
	method: "patch",
	path: "/api/prompt-templates/{templateId}",
	tags: ["PromptTemplates"],
	summary: "Update a prompt template",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: PromptTemplateParamsSchema,
		body: {
			content: { "application/json": { schema: UpdatePromptTemplateSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PromptTemplateSchema } },
			description: "Prompt template updated",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Prompt template not found",
		},
		422: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string(), details: z.any() }),
				},
			},
			description: "Validation error",
		},
	},
});

export const deletePromptTemplateRoute = createRoute({
	method: "delete",
	path: "/api/prompt-templates/{templateId}",
	tags: ["PromptTemplates"],
	summary: "Delete a prompt template",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: PromptTemplateParamsSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ success: z.boolean() }) },
			},
			description: "Prompt template deleted",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Prompt template not found",
		},
	},
});
