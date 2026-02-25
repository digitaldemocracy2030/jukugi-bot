import { useRoomContext } from "@livekit/components-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetApiRoomsRoomIdTranscripts } from "../../src/api/gen/breakoutDeliberationOSAPI";

export type TranscriptionEntry = {
	id: string;
	participantIdentity: string;
	displayName: string | null;
	text: string;
	isFinal: boolean;
	timestamp: number;
};

/**
 * Merge consecutive entries from the same speaker into a single entry.
 * A new group starts when the speaker changes or a non-final (interim) entry appears.
 */
function mergeConsecutive(entries: TranscriptionEntry[]): TranscriptionEntry[] {
	if (entries.length === 0) return entries;
	const merged: TranscriptionEntry[] = [];
	let current = { ...entries[0] };

	for (let i = 1; i < entries.length; i++) {
		const e = entries[i];
		const sameSpeaker = e.participantIdentity === current.participantIdentity;
		// Keep interim entries separate so they can be replaced in-place
		if (sameSpeaker && current.isFinal && e.isFinal) {
			current = {
				...current,
				text: `${current.text}${e.text}`,
				timestamp: e.timestamp,
			};
		} else {
			merged.push(current);
			current = { ...e };
		}
	}
	merged.push(current);
	return merged;
}

/**
 * Subscribe to the LiveKit `lk.transcription` text stream and accumulate entries.
 * On mount, hydrates from the backend API so transcripts survive reconnection.
 */
export function useTranscription(roomId: string): TranscriptionEntry[] {
	const room = useRoomContext();
	const [streamEntries, setStreamEntries] = useState<TranscriptionEntry[]>([]);
	const registeredRef = useRef(false);

	// Fetch persisted final transcripts from the API
	const { data: apiData } = useGetApiRoomsRoomIdTranscripts(roomId, { finalOnly: "true" }, {
		query: { staleTime: 30_000 },
	});

	const apiEntries = useMemo<TranscriptionEntry[]>(() => {
		if (!apiData?.data || !("transcripts" in apiData.data)) return [];
		return apiData.data.transcripts.map((t) => ({
			id: t.id,
			participantIdentity: t.participantId ?? "unknown",
			displayName: (t as { displayName?: string | null }).displayName ?? null,
			text: t.content,
			isFinal: t.isFinal,
			timestamp: new Date(t.createdAt).getTime(),
		}));
	}, [apiData]);

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

			setStreamEntries((prev) => {
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
							displayName: null,
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
					displayName: null,
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

	// Merge: API entries first, then stream entries (deduplicated), then group consecutive same-speaker
	return useMemo(() => {
		let all: TranscriptionEntry[];
		if (apiEntries.length === 0) {
			all = streamEntries;
		} else if (streamEntries.length === 0) {
			all = apiEntries;
		} else {
			const apiTexts = new Set(apiEntries.map((e) => `${e.participantIdentity}::${e.text}`));
			const uniqueStreamEntries = streamEntries.filter(
				(e) => !e.isFinal || !apiTexts.has(`${e.participantIdentity}::${e.text}`),
			);
			all = [...apiEntries, ...uniqueStreamEntries];
		}
		return mergeConsecutive(all);
	}, [apiEntries, streamEntries]);
}
