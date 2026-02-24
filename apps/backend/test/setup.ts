import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll } from "vitest";

// Migrations are injected by globalSetup via vitest's `provide` API
declare module "vitest" {
	export interface ProvidedContext {
		migrations: { name: string; queries: string[] }[];
	}
}

beforeAll(async () => {
	const { inject } = await import("vitest");
	const migrations = inject("migrations");
	if (migrations && migrations.length > 0) {
		await applyD1Migrations(env.DB, migrations);
	}
});
