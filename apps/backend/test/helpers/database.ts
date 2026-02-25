/**
 * Test database helpers
 */

/** Delete all table data in dependency order */
export async function cleanDatabase(db: D1Database) {
	await db.batch([
		db.prepare("DELETE FROM discussion_summaries"),
		db.prepare("DELETE FROM voting_answers"),
		db.prepare("DELETE FROM survey_responses"),
		db.prepare("DELETE FROM phase_transition_votes"),
		db.prepare("DELETE FROM phase_transition_proposals"),
		db.prepare("DELETE FROM phase_activations"),
		db.prepare("DELETE FROM transcripts"),
		db.prepare("DELETE FROM speaking_log"),
		db.prepare("DELETE FROM session_participations"),
		db.prepare("DELETE FROM participants"),
		db.prepare("DELETE FROM phases"),
		db.prepare("DELETE FROM rooms"),
	]);
}

/** Create a test room and return its id */
export async function createTestRoom(
	db: D1Database,
	overrides: {
		id?: string;
		slug?: string;
		title?: string;
		status?: string;
		maxParticipants?: number;
	} = {},
): Promise<string> {
	const id = overrides.id ?? `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const slug = overrides.slug ?? `test-room-${id}`;
	const title = overrides.title ?? "Test Room";
	const status = overrides.status ?? "draft";
	const maxParticipants = overrides.maxParticipants ?? 10;
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			"INSERT INTO rooms (id, slug, title, status, max_participants, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(id, slug, title, status, maxParticipants, now, now)
		.run();

	return id;
}

/** Create a test phase and return its id */
export async function createTestPhase(
	db: D1Database,
	roomId: string,
	overrides: {
		id?: string;
		type?: string;
		title?: string;
		sortOrder?: number;
		featureFlags?: Record<string, unknown>;
		config?: Record<string, unknown>;
	} = {},
): Promise<string> {
	const id = overrides.id ?? `phase-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const type = overrides.type ?? "discussion";
	const title = overrides.title ?? "Test Phase";
	const sortOrder = overrides.sortOrder ?? 0;
	const featureFlags = JSON.stringify(overrides.featureFlags ?? {});
	const config = JSON.stringify(overrides.config ?? {});
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			"INSERT INTO phases (id, room_id, type, title, sort_order, feature_flags, config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(id, roomId, type, title, sortOrder, featureFlags, config, now)
		.run();

	return id;
}

/** Create a test participant (identity master) and return its id */
export async function createTestParticipant(
	db: D1Database,
	overrides: {
		id?: string;
		displayName?: string;
		recoveryCode?: string;
	} = {},
): Promise<string> {
	const id = overrides.id ?? `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const displayName = overrides.displayName ?? "Test Participant";
	const recoveryCode =
		overrides.recoveryCode ?? `TST-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			"INSERT INTO participants (id, display_name, recovery_code, created_at) VALUES (?, ?, ?, ?)",
		)
		.bind(id, displayName, recoveryCode, now)
		.run();

	return id;
}

/** Create a test session participation and return its id */
export async function createTestSessionParticipation(
	db: D1Database,
	participantId: string,
	roomId: string,
	overrides: {
		id?: string;
		role?: string;
	} = {},
): Promise<string> {
	const id = overrides.id ?? `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const role = overrides.role ?? "participant";
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			"INSERT INTO session_participations (id, participant_id, room_id, role, joined_at) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(id, participantId, roomId, role, now)
		.run();

	return id;
}
