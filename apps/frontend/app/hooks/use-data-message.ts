import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";

export type DataMessageHandler<T = unknown> = (payload: T, topic: string) => void;

export function useDataMessage<T = unknown>(
	topic: string | undefined,
	onMessage: DataMessageHandler<T>,
): void {
	const room = useRoomContext();
	const handlerRef = useRef(onMessage);
	handlerRef.current = onMessage;

	useEffect(() => {
		const handleDataReceived = (
			payload: Uint8Array,
			_participant: unknown,
			_kind: unknown,
			receivedTopic: string | undefined,
		) => {
			if (topic !== undefined && receivedTopic !== topic) return;
			try {
				const text = new TextDecoder().decode(payload);
				const data = JSON.parse(text) as T;
				handlerRef.current(data, receivedTopic ?? "");
			} catch {
				// Ignore malformed messages
			}
		};

		room.on(RoomEvent.DataReceived, handleDataReceived);
		return () => {
			room.off(RoomEvent.DataReceived, handleDataReceived);
		};
	}, [room, topic]);
}
