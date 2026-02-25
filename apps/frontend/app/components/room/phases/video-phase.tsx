import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostApiRoomsRoomIdPhaseTransition } from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import { useDataMessage } from "../../../hooks/use-data-message";
import { useYouTubePlayer } from "../../../hooks/use-youtube-player";
import type { RoomMetadata, VideoSyncMessage } from "../../../types/room-metadata";
import { Badge, Button, Stack, Typography } from "../../design-system";

type VideoPhaseProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

type VideoEventMessage = { type: "VIDEO_ENDED" };

/** Extract YouTube video ID from a URL or plain ID string. */
function extractVideoId(videoUrl: string): string {
	try {
		const url = new URL(videoUrl);
		if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
		return url.searchParams.get("v") ?? videoUrl;
	} catch {
		// Not a URL — treat as a bare video ID
		return videoUrl;
	}
}

export function VideoPhase({ metadata, roomId }: VideoPhaseProps) {
	const room = useRoomContext();
	const { localParticipant } = useLocalParticipant();

	const isFacilitator = (() => {
		try {
			const meta = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
			return meta.role === "facilitator";
		} catch {
			return false;
		}
	})();

	const phaseTransitionMutation = usePostApiRoomsRoomIdPhaseTransition();

	// Keep a ref to the latest currentPhaseId to avoid stale closures in callbacks
	const currentPhaseIdRef = useRef<string | null>(metadata?.currentPhaseId ?? null);
	useEffect(() => {
		currentPhaseIdRef.current = metadata?.currentPhaseId ?? null;
	}, [metadata?.currentPhaseId]);

	const videoPhase = metadata?.videoPhase;
	// Support both a bare videoId and a full YouTube URL
	const rawVideoId = videoPhase?.videoId ?? "";
	const videoId = rawVideoId ? extractVideoId(rawVideoId) : "";
	const autoAdvance = videoPhase?.autoAdvance ?? false;

	// Whether the facilitator has been notified the video ended (show advance prompt)
	const [videoEndedNotified, setVideoEndedNotified] = useState(false);

	// Guard against firing VIDEO_ENDED broadcast more than once per video
	const broadcastedEndRef = useRef(false);
	const prevVideoIdRef = useRef(videoId);
	if (prevVideoIdRef.current !== videoId) {
		prevVideoIdRef.current = videoId;
		broadcastedEndRef.current = false;
		setVideoEndedNotified(false);
	}

	const advancePhase = useCallback(() => {
		const phaseId = currentPhaseIdRef.current;
		if (!phaseId) return;
		phaseTransitionMutation.mutate({ roomId, data: { phaseId } });
	}, [roomId, phaseTransitionMutation]);

	/** Broadcast VIDEO_ENDED to all participants (including facilitator) via data channel. */
	const broadcastVideoEnded = useCallback(async () => {
		if (broadcastedEndRef.current) return;
		broadcastedEndRef.current = true;

		const msg: VideoEventMessage = { type: "VIDEO_ENDED" };
		const payload = new TextEncoder().encode(JSON.stringify(msg));
		try {
			await room.localParticipant.publishData(payload, {
				reliable: true,
				topic: "video-event",
			});
		} catch {
			// data channel publish failure is non-fatal
		}
	}, [room]);

	/** Called when this participant's player detects video end. */
	const handleVideoEnded = useCallback(async () => {
		await broadcastVideoEnded();

		// Facilitator auto-advances if configured
		if (isFacilitator && autoAdvance) {
			advancePhase();
		}
	}, [broadcastVideoEnded, isFacilitator, autoAdvance, advancePhase]);

	const { containerRef, playerRef, playerState, play } = useYouTubePlayer({
		videoId,
		startAt: videoPhase?.startAt ?? 0,
		onStateChange: (state) => {
			if (state === "ended") handleVideoEnded();
		},
	});

	// Listen for video-sync commands from facilitator
	useDataMessage<VideoSyncMessage>("video-sync", (msg) => {
		const player = playerRef.current;
		if (!player) return;
		if (msg.type === "play") {
			player.seekTo(msg.currentTime, true);
			player.playVideo?.();
		} else if (msg.type === "pause") {
			player.pauseVideo?.();
			player.seekTo(msg.currentTime, true);
		} else if (msg.type === "seek") {
			player.seekTo(msg.currentTime, true);
		} else if (msg.type === "end") {
			handleVideoEnded();
		}
	});

	// Facilitator receives VIDEO_ENDED from any participant → show advance prompt
	useDataMessage<VideoEventMessage>("video-event", (msg) => {
		if (msg.type === "VIDEO_ENDED" && isFacilitator) {
			setVideoEndedNotified(true);
			if (autoAdvance) {
				advancePhase();
			}
		}
	});

	const handleAdvance = () => {
		advancePhase();
	};

	if (!videoId) {
		return (
			<Stack direction="vertical" align="center" justify="center" className="flex-1" gap={3}>
				<Typography variant="body" color="muted">
					ビデオが設定されていません
				</Typography>
				{isFacilitator && (
					<Button variant="outline" onClick={handleAdvance}>
						次のフェーズへ
					</Button>
				)}
			</Stack>
		);
	}

	const hasStarted = playerState === "playing" || playerState === "paused" || playerState === "buffering" || playerState === "ended";

	const statusLabel =
		playerState === "playing"
			? "再生中"
			: playerState === "paused"
				? "一時停止中"
				: playerState === "ended"
					? "終了"
					: playerState === "buffering"
						? "バッファリング中"
						: "待機中";

	const badgeColor =
		playerState === "playing" ? "success" : playerState === "ended" ? "default" : "info";

	return (
		<Stack direction="vertical" align="center" gap={4} className="flex-1 p-4">
			{/* Status / info bar */}
			<Stack direction="horizontal" gap={2} align="center" wrap className="self-start">
				<Badge variant="solid" colorScheme={badgeColor}>
					{statusLabel}
				</Badge>
				{autoAdvance && playerState !== "ended" && (
					<Typography variant="caption">動画終了後に自動で次のフェーズへ移行します</Typography>
				)}
			</Stack>

			{/* Responsive YouTube embed — IFrame API replaces this div with the iframe */}
			<div className="w-full max-w-3xl aspect-video rounded-lg overflow-hidden bg-black shadow-lg">
				<div ref={containerRef} className="w-full h-full" />
			</div>

			{!hasStarted && (
				<Stack direction="vertical" align="center" gap={2}>
					<Typography variant="body" color="muted">
						音声が流れます。準備ができたら再生ボタンを押してください。
					</Typography>
					<Button variant="primary" onClick={play}>
						再生
					</Button>
				</Stack>
			)}

			{/* Facilitator controls */}
			{isFacilitator && (
				<Stack direction="vertical" align="center" gap={2} className="mt-2">
					{videoEndedNotified && !autoAdvance && (
						<Typography variant="body" weight="medium">
							動画が終了しました。次のフェーズへ進む準備ができたらボタンを押してください。
						</Typography>
					)}
					<Button variant="outline" onClick={handleAdvance}>
						次のフェーズへ進む
					</Button>
				</Stack>
			)}

			{/* Non-facilitator ended message */}
			{(playerState === "ended" || videoEndedNotified) && !isFacilitator && (
				<Typography variant="body" color="muted">
					動画が終了しました。ファシリテーターの操作をお待ちください。
				</Typography>
			)}
		</Stack>
	);
}
