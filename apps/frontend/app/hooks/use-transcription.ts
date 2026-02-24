import { useRoomContext } from "@livekit/components-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type TranscriptionEntry = {
	id: string;
	participantIdentity: string;
	text: string;
	isFinal: boolean;
	timestamp: number;
};

/**
 * Subscribe to the LiveKit `lk.transcription` text stream and accumulate entries.
 * The agent publishes interim and final transcriptions automatically via AgentSession.
 */
export function useTranscription(): TranscriptionEntry[] {
	const room = useRoomContext();
	const [entries, setEntries] = useState<TranscriptionEntry[]>([]);
	const registeredRef = useRef(false);

	const handleStream = useCallback(
		async (
			reader: {
				readAll: () => Promise<string>;
				info: { id: string; attributes?: Record<string, string> };
			},
			participantInfo: { identity: string },
		) => {
			const text = await reader.readAll();
			if (!text || text.trim() === "") return;

			const isFinal = reader.info.attributes?.["lk.transcription_final"] === "true";
			const streamId = reader.info.id;

			setEntries((prev) => {
				// If final, replace any interim entry with the same streamId prefix
				if (isFinal) {
					const filtered = prev.filter(
						(e) => !(e.participantIdentity === participantInfo.identity && !e.isFinal),
					);
					return [
						...filtered,
						{
							id: streamId,
							participantIdentity: participantInfo.identity,
							text,
							isFinal: true,
							timestamp: Date.now(),
						},
					];
				}

				// Interim: replace previous interim from same participant, or add new
				const idx = prev.findIndex(
					(e) => e.participantIdentity === participantInfo.identity && !e.isFinal,
				);
				const entry: TranscriptionEntry = {
					id: streamId,
					participantIdentity: participantInfo.identity,
					text,
					isFinal: false,
					timestamp: Date.now(),
				};
				if (idx >= 0) {
					const next = [...prev];
					next[idx] = entry;
					return next;
				}
				return [...prev, entry];
			});
		},
		[],
	);

	useEffect(() => {
		if (registeredRef.current) return;
		registeredRef.current = true;

		room.registerTextStreamHandler("lk.transcription", handleStream);
	}, [room, handleStream]);

	return entries;
}
