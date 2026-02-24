import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { WebhookReceiver } from "livekit-server-sdk";
import { recordings } from "../db/schema";

type Bindings = {
	DB: D1Database;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
	LIVEKIT_WEBHOOK_SECRET?: string;
	STORAGE_PUBLIC_URL?: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const webhookRoute = createRoute({
	method: "post",
	path: "/api/webhooks/livekit",
	tags: ["Webhooks"],
	summary: "Receive LiveKit webhook events (egress_ended, etc.)",
	request: {
		body: {
			content: { "application/json": { schema: z.any() } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
			description: "Event received",
		},
		400: {
			content: { "application/json": { schema: z.object({ error: z.string() }) } },
			description: "Invalid webhook payload or signature",
		},
	},
});

app.openapi(webhookRoute, async (c) => {
	const apiSecret = c.env.LIVEKIT_WEBHOOK_SECRET ?? c.env.LIVEKIT_API_SECRET;
	const receiver = new WebhookReceiver(c.env.LIVEKIT_API_KEY, apiSecret);

	const authHeader = c.req.header("Authorization") ?? "";
	const rawBody = await c.req.text();

	let event: Awaited<ReturnType<typeof receiver.receive>>;
	try {
		event = await receiver.receive(rawBody, authHeader);
	} catch {
		return c.json({ error: "Invalid webhook signature or payload" }, 400);
	}

	if (event.event === "egress_ended") {
		const egressInfo = event.egressInfo;
		if (egressInfo?.egressId) {
			const db = drizzle(c.env.DB);

			const recording = await db
				.select()
				.from(recordings)
				.where(eq(recordings.egressId, egressInfo.egressId))
				.get();

			if (recording) {
				const endedAt = new Date();
				const startedMs = recording.startedAt.getTime();
				const durationSec = Math.round((endedAt.getTime() - startedMs) / 1000);

				// Build public URL from storage key if a public URL base is configured
				let storageUrl: string | null = recording.storageUrl ?? null;
				if (!storageUrl && recording.storageKey && c.env.STORAGE_PUBLIC_URL) {
					storageUrl = `${c.env.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${recording.storageKey}`;
				}

				// egressInfo.fileResults may contain size info
				const fileSize =
					egressInfo.fileResults?.[0]?.size !== undefined
						? Number(egressInfo.fileResults[0].size)
						: null;

				const newStatus =
					egressInfo.status === 3 // EgressStatus.EGRESS_FAILED = 3
						? "failed"
						: "completed";

				await db
					.update(recordings)
					.set({
						status: newStatus,
						endedAt,
						durationSec,
						storageUrl,
						fileSize,
					})
					.where(eq(recordings.id, recording.id));
			}
		}
	}

	return c.json({ ok: true }, 200);
});

export default app;
