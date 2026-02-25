import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		globalSetup: ["./test/globalSetup.ts"],
		setupFiles: ["./test/setup.ts"],
		poolOptions: {
			workers: {
				main: "./src/index.ts",
				wrangler: { configPath: "./wrangler.toml" },
				miniflare: {
					bindings: {
						ADMIN_API_KEY: "test-admin-key",
						LIVEKIT_URL: "wss://test.livekit.example",
						LIVEKIT_API_KEY: "test-livekit-key",
						LIVEKIT_API_SECRET: "test-livekit-secret",
						OPENAI_API_KEY: "test-openai-key",
						AI_MODEL_LARGE: "gpt-4o",
						AI_MODEL_MEDIUM: "gpt-4o-mini",
						AI_MODEL_SMALL: "gpt-4o-mini",
					},
				},
			},
		},
	},
});
