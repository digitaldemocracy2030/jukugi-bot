import path from "node:path";
import { readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
	const migrationsPath = path.join(__dirname, "../migrations");
	const migrations = await readD1Migrations(migrationsPath);
	provide("migrations", migrations);
}
