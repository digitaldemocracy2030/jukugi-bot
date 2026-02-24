import type { RoomMetadata } from "../../types/room-metadata";
import { DiscussionPhase } from "./phases/discussion-phase";
import { VideoPhase } from "./phases/video-phase";

type PhaseRendererProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

export function PhaseRenderer({ metadata, roomId }: PhaseRendererProps) {
	const phaseType = metadata?.currentPhaseType ?? null;

	if (phaseType === null) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				ファシリテーターの開始を待っています...
			</div>
		);
	}

	if (phaseType === "video") {
		return <VideoPhase metadata={metadata} roomId={roomId} />;
	}

	if (phaseType === "discussion") {
		return <DiscussionPhase metadata={metadata} roomId={roomId} />;
	}

	// "voting" | "survey" — placeholder with phase name
	return (
		<div className="flex items-center justify-center h-64 text-muted-foreground">
			{phaseType === "voting" ? "投票フェーズ（実装予定）" : "アンケートフェーズ（実装予定）"}
		</div>
	);
}
