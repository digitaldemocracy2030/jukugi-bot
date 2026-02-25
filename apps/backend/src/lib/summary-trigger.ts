/**
 * Core logic for generating and saving discussion summaries.
 * Shared between the POST generate route and the Queue consumer.
 */

import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { discussionSummaries, phases, rooms, transcripts } from "../db/schema";
import { generateSummaryText } from "./ai";
import { generateId } from "./id";

const DEBOUNCE_SECONDS = 30;

export type SummaryTriggerResult = "created" | "too_recent" | "no_new_transcripts";

function formatSummary(s: typeof discussionSummaries.$inferSelect) {
	return {
		id: s.id,
		roomId: s.roomId,
		phaseId: s.phaseId,
		content: s.content,
		model: s.model,
		promptTokens: s.promptTokens ?? null,
		completionTokens: s.completionTokens ?? null,
		transcriptCount: s.transcriptCount,
		createdAt: s.createdAt.toISOString(),
		updatedAt: s.updatedAt.toISOString(),
	};
}

export { formatSummary };

export async function generateAndSaveSummary(
	d1: D1Database,
	roomId: string,
	phaseId: string,
): Promise<
	| { result: "too_recent" | "no_new_transcripts" }
	| { result: "created"; summary: ReturnType<typeof formatSummary> }
> {
	const db = drizzle(d1);

	// 1. Get existing summary for this room+phase
	const existing = await db
		.select()
		.from(discussionSummaries)
		.where(and(eq(discussionSummaries.roomId, roomId), eq(discussionSummaries.phaseId, phaseId)))
		.get();

	// 2. Debounce check: skip if updated less than 30 seconds ago
	if (existing) {
		const elapsed = (Date.now() - existing.updatedAt.getTime()) / 1000;
		if (elapsed < DEBOUNCE_SECONDS) {
			return { result: "too_recent" };
		}
	}

	// 3. Fetch new transcripts since last summary update
	const cutoff = existing ? existing.updatedAt : new Date(0);
	const conditions = [
		eq(transcripts.roomId, roomId),
		eq(transcripts.isFinal, true),
		gt(transcripts.createdAt, cutoff),
	];

	const newTranscriptRows = await db
		.select()
		.from(transcripts)
		.where(and(...conditions))
		.all();

	if (newTranscriptRows.length === 0) {
		return { result: "no_new_transcripts" };
	}

	// 4. Build transcript text
	const transcriptText = newTranscriptRows
		.map((t) => `[${t.participantId ?? "unknown"}]: ${t.content}`)
		.join("\n");

	// 5. Generate summary via LLM
	const llmResult = await generateSummaryText(existing?.content ?? null, transcriptText);

	// 6. UPSERT: update if exists, insert if not
	const now = new Date();
	if (existing) {
		await db
			.update(discussionSummaries)
			.set({
				content: llmResult.text,
				model: llmResult.model,
				promptTokens: llmResult.promptTokens,
				completionTokens: llmResult.completionTokens,
				transcriptCount: newTranscriptRows.length,
				updatedAt: now,
			})
			.where(eq(discussionSummaries.id, existing.id));

		// Re-read the updated row
		const updated = await db
			.select()
			.from(discussionSummaries)
			.where(eq(discussionSummaries.id, existing.id))
			.get();

		// updated is guaranteed to exist since we just wrote it
		if (!updated) throw new Error("Summary row disappeared after update");
		return { result: "created", summary: formatSummary(updated) };
	}

	const id = generateId();
	await db.insert(discussionSummaries).values({
		id,
		roomId,
		phaseId,
		content: llmResult.text,
		model: llmResult.model,
		promptTokens: llmResult.promptTokens,
		completionTokens: llmResult.completionTokens,
		transcriptCount: newTranscriptRows.length,
		createdAt: now,
		updatedAt: now,
	});

	const inserted = await db
		.select()
		.from(discussionSummaries)
		.where(eq(discussionSummaries.id, id))
		.get();

	if (!inserted) throw new Error("Summary row disappeared after insert");
	return { result: "created", summary: formatSummary(inserted) };
}
