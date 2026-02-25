import type {
	PhaseType,
	RoomFeatureFlags,
	RoomMetadata,
	SpeakerQueue,
	VideoPhaseMetadata,
} from "./types";

const defaultFeatureFlags: RoomFeatureFlags = {
	canSpeak: false,
	canInterrupt: false,
	canVote: false,
};

const defaultSpeakerQueue: SpeakerQueue = {
	currentSpeaker: null,
	queue: [],
	interruptions: [],
};

/**
 * Build the initial RoomMetadata for a newly activated room.
 */
export function buildInitialMetadata(roomId: string): RoomMetadata {
	return {
		roomId,
		currentPhaseId: null,
		currentPhaseType: null,
		featureFlags: { ...defaultFeatureFlags },
		speakerQueue: {
			currentSpeaker: null,
			queue: [],
			interruptions: [],
		},
	};
}

/**
 * Build VideoPhaseMetadata from a video phase's config.
 * Returns undefined for non-video phases or when videoUrl is missing.
 */
export function buildVideoPhaseMetadata(
	phaseType: PhaseType,
	config: Record<string, unknown> | null | undefined,
): VideoPhaseMetadata | undefined {
	if (phaseType !== "video" || !config) return undefined;
	const videoUrl = typeof config.videoUrl === "string" ? config.videoUrl : "";
	if (!videoUrl) return undefined;
	return {
		videoId: videoUrl,
		startAt: 0,
		playing: false,
		playStartedAt: null,
		autoAdvance: config.autoAdvance === true,
	};
}

/**
 * Build RoomMetadata for a specific phase transition.
 */
export function buildPhaseMetadata(
	current: RoomMetadata,
	phaseId: string,
	phaseType: PhaseType,
	featureFlags: Partial<RoomFeatureFlags> = {},
	phaseConfig?: Record<string, unknown> | null,
): RoomMetadata {
	return {
		...current,
		currentPhaseId: phaseId,
		currentPhaseType: phaseType,
		featureFlags: {
			...defaultFeatureFlags,
			...featureFlags,
		},
		// Reset speaker queue on phase transition
		speakerQueue: { ...defaultSpeakerQueue },
		// Clear any active transition proposal
		transitionProposal: undefined,
		// Set video phase metadata when transitioning to a video phase
		videoPhase: buildVideoPhaseMetadata(phaseType, phaseConfig),
	};
}

/**
 * Serialize RoomMetadata to a JSON string for LiveKit.
 */
export function serializeMetadata(metadata: RoomMetadata): string {
	return JSON.stringify(metadata);
}

/**
 * Deserialize RoomMetadata from a LiveKit room metadata string.
 * Returns null if parsing fails or the string is empty.
 */
export function deserializeMetadata(raw: string | undefined | null): RoomMetadata | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!isRoomMetadata(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Update the speaker queue portion of existing metadata.
 */
export function updateSpeakerQueue(
	current: RoomMetadata,
	speakerQueue: SpeakerQueue,
): RoomMetadata {
	return { ...current, speakerQueue };
}

/**
 * Runtime type guard for RoomMetadata.
 */
function isRoomMetadata(val: unknown): val is RoomMetadata {
	if (typeof val !== "object" || val === null) return false;
	const m = val as Record<string, unknown>;
	return (
		typeof m.roomId === "string" &&
		(m.currentPhaseId === null || typeof m.currentPhaseId === "string") &&
		typeof m.featureFlags === "object" &&
		m.featureFlags !== null &&
		typeof m.speakerQueue === "object" &&
		m.speakerQueue !== null
	);
}

/**
 * Update the transition proposal portion of existing metadata.
 */
export function updateTransitionProposal(
	current: RoomMetadata,
	proposal: RoomMetadata["transitionProposal"] | undefined,
): RoomMetadata {
	return { ...current, transitionProposal: proposal };
}

/**
 * Derive LiveKit feature flags from a phase's featureFlags config.
 */
export function phaseFeatureFlagsToRoom(flags: {
	canSpeak?: boolean;
	canInterrupt?: boolean;
	canVote?: boolean;
}): RoomFeatureFlags {
	return {
		canSpeak: flags.canSpeak ?? false,
		canInterrupt: flags.canInterrupt ?? false,
		canVote: flags.canVote ?? false,
	};
}
