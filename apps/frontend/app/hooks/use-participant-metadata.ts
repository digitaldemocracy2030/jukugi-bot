import { useLocalParticipant } from "@livekit/components-react";
import { ParticipantEvent } from "livekit-client";
import { useCallback, useEffect, useState } from "react";

export type ParticipantMetadata = {
	displayName?: string;
	[key: string]: unknown;
};

function parseParticipantMetadata(raw: string | undefined): ParticipantMetadata | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as ParticipantMetadata;
	} catch {
		return null;
	}
}

export function useParticipantMetadata(): ParticipantMetadata | null {
	const { localParticipant } = useLocalParticipant();

	const [metadata, setMetadata] = useState<ParticipantMetadata | null>(() =>
		parseParticipantMetadata(localParticipant.metadata),
	);

	const handleMetadataChanged = useCallback(() => {
		setMetadata(parseParticipantMetadata(localParticipant.metadata));
	}, [localParticipant]);

	useEffect(() => {
		localParticipant.on(ParticipantEvent.ParticipantMetadataChanged, handleMetadataChanged);
		return () => {
			localParticipant.off(ParticipantEvent.ParticipantMetadataChanged, handleMetadataChanged);
		};
	}, [localParticipant, handleMetadataChanged]);

	return metadata;
}
