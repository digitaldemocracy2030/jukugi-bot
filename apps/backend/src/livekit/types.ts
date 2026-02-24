// ─── Room Metadata ────────────────────────────────────────────────────────────

export type PhaseType = "video" | "discussion" | "voting" | "survey";

export interface RoomFeatureFlags {
	canSpeak: boolean;
	canInterrupt: boolean;
	canVote: boolean;
}

export interface SpeakerQueueEntry {
	participantId: string;
	displayName: string;
	requestedAt: number;
}

export interface InterruptionEntry {
	participantId: string;
	displayName: string;
	expiresAt: number;
}

export interface CurrentSpeaker {
	participantId: string;
	speakingUntil: number;
}

export interface SpeakerQueue {
	currentSpeaker: CurrentSpeaker | null;
	queue: SpeakerQueueEntry[];
	interruptions: InterruptionEntry[];
}

export interface RoomMetadata {
	roomId: string;
	currentPhaseId: string | null;
	currentPhaseType: PhaseType | null;
	featureFlags: RoomFeatureFlags;
	speakerQueue: SpeakerQueue;
	transitionProposal?: {
		id: string;
		proposedByRole: "admin" | "participant";
		status: "open" | "approved" | "rejected_by_admin" | "expired" | "cancelled";
		yesCount: number;
		noCount: number;
		totalVoted: number;
		requiredThreshold: number;
		expiresAt: string | null;
	};
}

// ─── Participant Metadata ─────────────────────────────────────────────────────

export interface ParticipantMetadata {
	participantId: string;
	role: "participant" | "facilitator" | "admin";
	displayName: string;
}

// ─── Data Messages ────────────────────────────────────────────────────────────

export type DataMessageType =
	| "TIMER_SYNC"
	| "VIDEO_ENDED"
	| "PHASE_CHANGED"
	| "SPEAKER_QUEUE_UPDATED"
	| "SPEAKING_STARTED"
	| "SPEAKING_ENDED"
	| "INTERRUPTION_REQUESTED"
	| "INTERRUPTION_GRANTED"
	| "INTERRUPTION_DENIED"
	| "TRANSITION_PROPOSAL_CREATED"
	| "TRANSITION_VOTE_CAST"
	| "TRANSITION_APPROVED"
	| "TRANSITION_REJECTED"
	| "TRANSITION_EXPIRED"
	| "FORCE_ADVANCED_BY_ADMIN";

export interface TimerSyncPayload {
	phaseId: string;
	remainingSec: number;
	totalSec: number;
}

export interface VideoEndedPayload {
	phaseId: string;
}

export interface PhaseChangedPayload {
	previousPhaseId: string | null;
	currentPhaseId: string;
	currentPhaseType: PhaseType;
	featureFlags: RoomFeatureFlags;
}

export interface SpeakerQueueUpdatedPayload {
	speakerQueue: SpeakerQueue;
}

export interface SpeakingStartedPayload {
	participantId: string;
	displayName: string;
	speakingUntil: number;
	type: "normal" | "interruption";
}

export interface SpeakingEndedPayload {
	participantId: string;
	durationSec: number;
}

export interface InterruptionRequestedPayload {
	participantId: string;
	displayName: string;
}

export interface InterruptionGrantedPayload {
	participantId: string;
	expiresAt: number;
}

export interface InterruptionDeniedPayload {
	participantId: string;
	reason: string;
}

export type DataMessagePayloadMap = {
	TIMER_SYNC: TimerSyncPayload;
	VIDEO_ENDED: VideoEndedPayload;
	PHASE_CHANGED: PhaseChangedPayload;
	SPEAKER_QUEUE_UPDATED: SpeakerQueueUpdatedPayload;
	SPEAKING_STARTED: SpeakingStartedPayload;
	SPEAKING_ENDED: SpeakingEndedPayload;
	INTERRUPTION_REQUESTED: InterruptionRequestedPayload;
	INTERRUPTION_GRANTED: InterruptionGrantedPayload;
	INTERRUPTION_DENIED: InterruptionDeniedPayload;
	TRANSITION_PROPOSAL_CREATED: Record<string, unknown>;
	TRANSITION_VOTE_CAST: Record<string, unknown>;
	TRANSITION_APPROVED: Record<string, unknown>;
	TRANSITION_REJECTED: Record<string, unknown>;
	TRANSITION_EXPIRED: Record<string, unknown>;
	FORCE_ADVANCED_BY_ADMIN: Record<string, unknown>;
};

export interface DataMessage<T extends DataMessageType = DataMessageType> {
	type: T;
	payload: DataMessagePayloadMap[T];
	timestamp: number;
}
