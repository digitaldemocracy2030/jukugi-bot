import { createRoute, z } from "@hono/zod-openapi";

export const RoomStatusEnum = z.enum(["draft", "active", "completed", "archived"]);

export const RoomSchema = z
	.object({
		id: z.string(),
		slug: z.string(),
		title: z.string(),
		description: z.string().nullable(),
		status: RoomStatusEnum,
		maxParticipants: z.number().int(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("Room");

export const CreateRoomSchema = z
	.object({
		slug: z
			.string()
			.min(1)
			.max(100)
			.regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
		title: z.string().min(1).max(200),
		description: z.string().max(2000).optional(),
		status: RoomStatusEnum.optional().default("draft"),
		maxParticipants: z.number().int().min(2).max(100).optional().default(10),
	})
	.openapi("CreateRoom");

export const UpdateRoomSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		description: z.string().max(2000).nullable().optional(),
		status: RoomStatusEnum.optional(),
		maxParticipants: z.number().int().min(2).max(100).optional(),
	})
	.openapi("UpdateRoom");

export const RoomParamsSchema = z
	.object({
		roomId: z.string(),
	})
	.openapi("RoomParams");

export const RoomSlugParamsSchema = z
	.object({
		slug: z.string(),
	})
	.openapi("RoomSlugParams");

export const RoomListQuerySchema = z
	.object({
		status: RoomStatusEnum.optional(),
	})
	.openapi("RoomListQuery");

// Route definitions
export const listRoomsRoute = createRoute({
	method: "get",
	path: "/api/rooms",
	tags: ["Rooms"],
	summary: "List all rooms",
	security: [{ AdminKeyAuth: [] }],
	request: {
		query: RoomListQuerySchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.array(RoomSchema) } },
			description: "Room list",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
	},
});

export const createRoomRoute = createRoute({
	method: "post",
	path: "/api/rooms",
	tags: ["Rooms"],
	summary: "Create a new room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateRoomSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: RoomSchema } },
			description: "Room created",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		409: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Slug already taken",
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

export const getRoomBySlugRoute = createRoute({
	method: "get",
	path: "/api/rooms/{slug}",
	tags: ["Rooms"],
	summary: "Get room by slug",
	request: {
		params: RoomSlugParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: RoomSchema } },
			description: "Room found",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
		},
	},
});

export const updateRoomRoute = createRoute({
	method: "patch",
	path: "/api/rooms/{roomId}",
	tags: ["Rooms"],
	summary: "Update a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomParamsSchema,
		body: {
			content: { "application/json": { schema: UpdateRoomSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: RoomSchema } },
			description: "Room updated",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
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

export const deleteRoomRoute = createRoute({
	method: "delete",
	path: "/api/rooms/{roomId}",
	tags: ["Rooms"],
	summary: "Delete a room",
	security: [{ AdminKeyAuth: [] }],
	request: {
		params: RoomParamsSchema,
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: z.object({ success: z.boolean() }) },
			},
			description: "Room deleted",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Unauthorized",
		},
		404: {
			content: {
				"application/json": { schema: z.object({ error: z.string() }) },
			},
			description: "Room not found",
		},
	},
});
