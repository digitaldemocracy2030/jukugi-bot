import { useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { RoomMetadata } from "../../types/room-metadata";
import { MediaControls } from "./media-controls";
import { ParticipantVideoTile } from "./participant-video-tile";

export function VideoStage({
	metadata,
	micAllowed = false,
}: {
	metadata: RoomMetadata | null;
	micAllowed?: boolean;
}) {
	const { localParticipant } = useLocalParticipant();
	const participants = useParticipants();
	const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
		onlySubscribed: false,
	});

	const currentSpeakerId = metadata?.speakerQueue.currentSpeaker?.participantId ?? null;

	function resolveDisplayName(identity: string): string {
		const p = participants.find((par) => par.identity === identity);
		if (p?.name) return p.name;
		return (
			metadata?.speakerQueue.queue.find((q) => q.participantId === identity)?.displayName ??
			metadata?.speakerQueue.interruptions.find((i) => i.participantId === identity)?.displayName ??
			identity
		);
	}

	const speakerTrack = currentSpeakerId
		? (allTracks.find((t) => t.participant.identity === currentSpeakerId) ?? null)
		: null;

	const otherTracks = allTracks.filter(
		(t) =>
			t.participant.identity !== currentSpeakerId &&
			t.participant.identity !== localParticipant.identity,
	);

	const selfTrack = allTracks.find((t) => t.participant.identity === localParticipant.identity);

	return (
		<div className="flex flex-col gap-2 w-full">
			<div className="flex gap-2 h-64">
				{/* メインステージ */}
				<div className="flex-1 relative">
					{speakerTrack ? (
						<ParticipantVideoTile
							trackRef={speakerTrack}
							displayName={resolveDisplayName(speakerTrack.participant.identity)}
							isCurrentSpeaker
							variant="main"
						/>
					) : (
						<div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
							<p className="text-muted-foreground text-sm">現在の発言者はいません</p>
						</div>
					)}
				</div>
				{/* サムネイルストリップ */}
				{otherTracks.length > 0 && (
					<div className="flex flex-col gap-1 overflow-y-auto max-h-full w-28 shrink-0">
						{otherTracks.map((t) => (
							<ParticipantVideoTile
								key={t.participant.identity}
								trackRef={t}
								displayName={resolveDisplayName(t.participant.identity)}
								variant="thumbnail"
							/>
						))}
					</div>
				)}
			</div>
			{/* セルフビューバー */}
			<div className="flex items-center gap-3 px-2 py-1.5 border rounded-lg bg-card">
				<MediaControls micAllowed={micAllowed} />
				<div className="flex items-center gap-2 ml-auto">
					<span className="text-xs text-muted-foreground">あなた:</span>
					{selfTrack ? (
						<ParticipantVideoTile
							trackRef={selfTrack}
							displayName={resolveDisplayName(localParticipant.identity)}
							variant="thumbnail"
						/>
					) : (
						<span className="text-sm">{resolveDisplayName(localParticipant.identity)}</span>
					)}
				</div>
			</div>
		</div>
	);
}
