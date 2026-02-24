import { createRoute, z } from "@hono/zod-openapi";

export const CreateParticipantSchema = z
	.object({
		displayName: z.string().min(1).max(50),
	})
	.openapi("CreateParticipant");

export const ParticipantResponseSchema = z
	.object({
		id: z.string(),
		displayName: z.string(),
		recoveryCode: z.string(),
	})
	.openapi("ParticipantResponse");

export const RecoverParticipantSchema = z
	.object({
		recoveryCode: z.string().min(1),
	})
	.openapi("RecoverParticipant");

export const createParticipantRoute = createRoute({
	method: "post",
	path: "/api/participants",
	tags: ["Participants"],
	summary: "Create a new participant identity (persisted in localStorage)",
	request: {
		body: {
			content: { "application/json": { schema: CreateParticipantSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: ParticipantResponseSchema } },
			description: "Participant created",
		},
		422: {
			content: {
				"application/json": { schema: z.object({ error: z.string(), details: z.any() }) },
			},
			description: "Validation error",
		},
	},
});

export const getParticipantMeRoute = createRoute({
	method: "get",
	path: "/api/participants/me",
	tags: ["Participants"],
	summary: "Get the current participant by token from X-Participant-Token header",
	request: {
		headers: z.object({
			"x-participant-token": z.string().min(1),
		}),
	},
	responses: {
		200: {
			content: { "application/json": { schema: ParticipantResponseSchema } },
			description: "Participant found",
		},
		401: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Invalid or missing token",
		},
	},
});

export const recoverParticipantRoute = createRoute({
	method: "post",
	path: "/api/participants/recover",
	tags: ["Participants"],
	summary: "Recover a participant identity by recovery code",
	request: {
		body: {
			content: { "application/json": { schema: RecoverParticipantSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: ParticipantResponseSchema } },
			description: "Participant recovered",
		},
		404: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Recovery code not found",
		},
		422: {
			content: {
				"application/json": { schema: z.object({ error: z.string(), details: z.any() }) },
			},
			description: "Validation error",
		},
	},
});
