declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
		ADMIN_API_KEY: string;
		LIVEKIT_URL: string;
		LIVEKIT_API_KEY: string;
		LIVEKIT_API_SECRET: string;
		RECORDINGS_BUCKET: R2Bucket;
		OPENAI_API_KEY: string;
		AI_MODEL_LARGE: string;
		AI_MODEL_MEDIUM: string;
		AI_MODEL_SMALL: string;
	}
}
