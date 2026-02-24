import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import {
	useLocalParticipant,
	useParticipants,
	useTracks,
	VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { RoomMetadata } from "../../types/room-metadata";
import { Avatar, Typography } from "../design-system";
import { VideoGrid } from "../design-system/meeting/video-grid";
import { VideoTile } from "../design-system/meeting/video-tile";
import { MediaControls } from "./media-controls";

function hasVideoTrack(trackRef: TrackReferenceOrPlaceholder): boolean {
	return (
		trackRef.publication !== undefined &&
		!trackRef.publication.isMuted &&
		trackRef.source !== Track.Source.Unknown
	);
}

function TileVideoContent({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
	if (!hasVideoTrack(trackRef)) return null;
	return (
		<VideoTrack
			trackRef={trackRef as Parameters<typeof VideoTrack>[0]["trackRef"]}
			className="w-full h-full object-cover"
		/>
	);
}

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

	const speakerName = currentSpeakerId ? resolveDisplayName(currentSpeakerId) : "";

	return (
		<div className="flex flex-col gap-2 w-full">
			{/* Video area with spotlight layout */}
			<div className="h-64">
				<VideoGrid
					layout="spotlight"
					spotlightContent={
						speakerTrack ? (
							<VideoTile displayName={speakerName} isSpeaking={true} layout="fill">
								<TileVideoContent trackRef={speakerTrack} />
							</VideoTile>
						) : (
							<VideoTile displayName="" layout="fill">
								<div className="flex items-center justify-center w-full h-full">
									<Typography variant="body-sm" color="muted">
										現在の発言者はいません
									</Typography>
								</div>
							</VideoTile>
						)
					}
				>
					{otherTracks.map((t) => {
						const name = resolveDisplayName(t.participant.identity);
						return (
							<VideoTile
								key={t.participant.identity}
								displayName={name}
								layout="fill"
								aspectRatio="16:9"
							>
								{hasVideoTrack(t) ? (
									<VideoTrack
										trackRef={t as Parameters<typeof VideoTrack>[0]["trackRef"]}
										className="w-full h-full object-cover"
									/>
								) : undefined}
							</VideoTile>
						);
					})}
				</VideoGrid>
			</div>

			{/* Self-view + media controls bar */}
			<div className="flex items-center gap-3 px-3 py-2 border rounded-lg bg-card">
				<MediaControls micAllowed={micAllowed} />
				<div className="flex items-center gap-2 ml-auto">
					<Typography variant="caption">あなた</Typography>
					{selfTrack && hasVideoTrack(selfTrack) ? (
						<div className="w-20 h-14 rounded-md overflow-hidden bg-muted">
							<VideoTrack
								trackRef={selfTrack as Parameters<typeof VideoTrack>[0]["trackRef"]}
								className="w-full h-full object-cover"
							/>
						</div>
					) : (
						<Avatar name={resolveDisplayName(localParticipant.identity)} size="sm" />
					)}
				</div>
			</div>
		</div>
	);
}
