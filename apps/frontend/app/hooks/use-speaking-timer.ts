import { useEffect, useRef, useState } from "react";

export type SpeakingTimerState = {
	/** Remaining seconds until speaking time ends. null if not speaking. */
	remainingSeconds: number | null;
	/** Whether the current user is the active speaker. */
	isActiveSpeaker: boolean;
	/** Whether time has elapsed. */
	isExpired: boolean;
};

export function useSpeakingTimer(
	speakingUntil: number | null,
	participantId: string | null,
	currentSpeakerParticipantId: string | null,
): SpeakingTimerState {
	const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const isActiveSpeaker = participantId !== null && participantId === currentSpeakerParticipantId;

	useEffect(() => {
		if (!isActiveSpeaker || speakingUntil === null) {
			setRemainingSeconds(null);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		const updateRemaining = () => {
			const now = Date.now();
			const remaining = Math.max(0, Math.ceil((speakingUntil - now) / 1000));
			setRemainingSeconds(remaining);
		};

		updateRemaining();
		intervalRef.current = setInterval(updateRemaining, 500);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [isActiveSpeaker, speakingUntil]);

	const isExpired = isActiveSpeaker && speakingUntil !== null && Date.now() >= speakingUntil;

	return { remainingSeconds, isActiveSpeaker, isExpired };
}
