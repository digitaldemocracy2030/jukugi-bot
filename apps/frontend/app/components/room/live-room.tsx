import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useRoomMetadata } from "../../hooks/use-room-metadata";
import { PhaseRenderer } from "./phase-renderer";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? "wss://localhost:7880";

type LiveRoomProps = {
	token: string;
	roomId: string;
	onDisconnected: () => void;
};

function LiveRoomInner({ roomId }: { roomId: string }) {
	const metadata = useRoomMetadata();

	return (
		<div className="flex flex-col h-screen bg-background">
			<RoomAudioRenderer />
			<main className="flex-1 flex overflow-hidden">
				<PhaseRenderer metadata={metadata} roomId={roomId} />
			</main>
		</div>
	);
}

export function LiveRoom({ token, roomId, onDisconnected }: LiveRoomProps) {
	return (
		<LiveKitRoom
			serverUrl={LIVEKIT_URL}
			token={token}
			connect={true}
			audio={false}
			video={false}
			onDisconnected={onDisconnected}
		>
			<LiveRoomInner roomId={roomId} />
		</LiveKitRoom>
	);
}
