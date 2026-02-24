import type { RoomMetadata } from "../../types/room-metadata";
import { Spinner, Stack, Typography } from "../design-system";
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
			<Stack direction="vertical" align="center" justify="center" className="h-64 flex-1" gap={3}>
				<Spinner size="md" />
				<Typography variant="body" color="muted">
					ファシリテーターの開始を待っています...
				</Typography>
			</Stack>
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
		<Stack direction="vertical" align="center" justify="center" className="h-64 flex-1" gap={2}>
			<Typography variant="body" color="muted">
				{phaseType === "voting" ? "投票フェーズ（実装予定）" : "アンケートフェーズ（実装予定）"}
			</Typography>
		</Stack>
	);
}
