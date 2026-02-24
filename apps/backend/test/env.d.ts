declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
		ADMIN_API_KEY: string;
		LIVEKIT_URL: string;
		LIVEKIT_API_KEY: string;
		LIVEKIT_API_SECRET: string;
		RECORDINGS_BUCKET: R2Bucket;
	}
}
