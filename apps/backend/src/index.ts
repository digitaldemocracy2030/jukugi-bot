import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initLiveKit } from "./livekit/room-service";
import participantsRoute from "./routes/participants";
import phasesRoute from "./routes/phases";
import recordingRoute from "./routes/recording";
import roomsRoute from "./routes/rooms";
import sessionRoute from "./routes/session";
import speakingRoute from "./routes/speaking";
import surveyRoute from "./routes/survey";
import transcriptionRoute from "./routes/transcription";
import transitionRoute from "./routes/transition";
import votingRoute from "./routes/voting";
import webhooksRoute from "./routes/webhooks";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ADMIN_API_KEY: string;
	LIVEKIT_URL: string;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
	// Cloudflare R2 — native binding (always present when configured in wrangler.toml)
	RECORDINGS_BUCKET: R2Bucket;
	// LiveKit Egress S3 credentials (recording disabled if STORAGE_ENDPOINT is absent)
	STORAGE_ENDPOINT?: string;
	STORAGE_ACCESS_KEY?: string;
	STORAGE_SECRET_KEY?: string;
	STORAGE_PUBLIC_URL?: string;
	// LiveKit webhook signature verification (falls back to LIVEKIT_API_SECRET)
	LIVEKIT_WEBHOOK_SECRET?: string;
	// Transcription agent name (optional — dispatch disabled if absent)
	TRANSCRIPTION_AGENT_NAME?: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>({
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json({ error: "Validation Error", details: result.error.flatten() }, 422);
		}
	},
});

app.use("/*", logger());
app.use("/*", cors({ origin: "http://localhost:5173" }));
app.use("/*", async (c, next) => {
	initLiveKit(c.env);
	await next();
});

app.get("/", (c) => c.json({ message: "Hello Hono!" }));

// Register routes
app.route("/", participantsRoute);
app.route("/", roomsRoute);
app.route("/", phasesRoute);
app.route("/", sessionRoute);
app.route("/", speakingRoute);
app.route("/", recordingRoute);
app.route("/", transitionRoute);
app.route("/", transcriptionRoute);
app.route("/", votingRoute);
app.route("/", surveyRoute);
app.route("/", webhooksRoute);

// Register X-Admin-Key security scheme
app.openAPIRegistry.registerComponent("securitySchemes", "AdminKeyAuth", {
	type: "apiKey",
	in: "header",
	name: "X-Admin-Key",
	description: "Admin API key (ADMIN_API_KEY env var)",
});

// Register X-Participant-Token security scheme
app.openAPIRegistry.registerComponent("securitySchemes", "ParticipantTokenAuth", {
	type: "apiKey",
	in: "header",
	name: "X-Participant-Token",
	description: "Participant identity token (participant UUID)",
});

// OpenAPI JSON エンドポイント
app.doc("/api/openapi.json", {
	openapi: "3.0.0",
	info: { title: "Breakout Deliberation OS API", version: "1.0.0" },
	servers: [{ url: "http://localhost:8787", description: "Local" }],
});

// Swagger UI
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

export default app;
