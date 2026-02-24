import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useState } from "react";
import type { RoomMetadata } from "../types/room-metadata";

function parseRoomMetadata(raw: string | undefined): RoomMetadata | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as RoomMetadata;
	} catch {
		return null;
	}
}

export function useRoomMetadata(): RoomMetadata | null {
	const room = useRoomContext();

	const [metadata, setMetadata] = useState<RoomMetadata | null>(() =>
		parseRoomMetadata(room.metadata),
	);

	const handleMetadataChanged = useCallback((raw: string | undefined) => {
		setMetadata(parseRoomMetadata(raw));
	}, []);

	const syncMetadata = useCallback(() => {
		setMetadata(parseRoomMetadata(room.metadata));
	}, [room]);

	useEffect(() => {
		room.on(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
		room.on(RoomEvent.Connected, syncMetadata);
		return () => {
			room.off(RoomEvent.RoomMetadataChanged, handleMetadataChanged);
			room.off(RoomEvent.Connected, syncMetadata);
		};
	}, [room, handleMetadataChanged, syncMetadata]);

	return metadata;
}
