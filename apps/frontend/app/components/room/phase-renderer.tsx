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
			<Stack direction="vertical" align="center" justify="center" className="flex-1" gap={4}>
				<Spinner size="lg" />
				<Stack direction="vertical" align="center" gap={1}>
					<Typography variant="h4" align="center">
						セッション開始を待っています
					</Typography>
					<Typography variant="body-sm" color="muted" align="center">
						ファシリテーターがフェーズを開始するとここに表示されます
					</Typography>
				</Stack>
			</Stack>
		);
	}

	if (phaseType === "video") {
		return <VideoPhase metadata={metadata} roomId={roomId} />;
	}

	if (phaseType === "discussion") {
		return <DiscussionPhase metadata={metadata} roomId={roomId} />;
	}

	// "voting" | "survey" — placeholder
	return (
		<Stack direction="vertical" align="center" justify="center" className="flex-1" gap={3}>
			<Typography variant="h4" color="muted" align="center">
				{phaseType === "voting" ? "投票フェーズ" : "アンケートフェーズ"}
			</Typography>
			<Typography variant="body-sm" color="muted" align="center">
				このフェーズは現在開発中です
			</Typography>
		</Stack>
	);
}
