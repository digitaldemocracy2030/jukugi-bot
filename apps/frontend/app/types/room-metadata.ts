export type RoomMetadata = {
	roomId: string;
	currentPhaseId: string | null;
	currentPhaseType: "video" | "discussion" | "voting" | "survey" | null;
	featureFlags: { canSpeak: boolean; canInterrupt: boolean; canVote: boolean };
	speakerQueue: {
		currentSpeaker: { participantId: string; speakingUntil: number } | null;
		queue: Array<{ participantId: string; displayName: string; requestedAt: number }>;
		interruptions: Array<{ participantId: string; displayName: string; expiresAt: number }>;
	};
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
	videoPhase?: {
		videoId: string;
		/** Start position in seconds */
		startAt: number;
		/** Whether playback is active */
		playing: boolean;
		/** Server epoch ms when playing began (used to compute current position) */
		playStartedAt: number | null;
		/** Whether the phase auto-advances when the video ends */
		autoAdvance: boolean;
	};
};

/** Data channel message types for video sync */
export type VideoSyncMessage =
	| { type: "play"; currentTime: number; serverTime: number }
	| { type: "pause"; currentTime: number }
	| { type: "seek"; currentTime: number }
	| { type: "end" };
