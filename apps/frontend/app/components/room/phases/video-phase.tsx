import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostApiRoomsRoomIdPhaseTransition } from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import { useDataMessage } from "../../../hooks/use-data-message";
import { useYouTubePlayer } from "../../../hooks/use-youtube-player";
import type { RoomMetadata, VideoSyncMessage } from "../../../types/room-metadata";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";

type VideoPhaseProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

type VideoEventMessage = { type: "VIDEO_ENDED" };

/** Compute the expected current playback position from server metadata. */
function computeCurrentTime(
	startAt: number,
	playing: boolean,
	playStartedAt: number | null,
): number {
	if (!playing || playStartedAt === null) return startAt;
	return startAt + (Date.now() - playStartedAt) / 1000;
}

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

	const { containerRef, playerRef, playerState } = useYouTubePlayer({
		videoId,
		startAt: videoPhase
			? computeCurrentTime(videoPhase.startAt, videoPhase.playing, videoPhase.playStartedAt)
			: 0,
		onStateChange: (state) => {
			if (state === "ended") handleVideoEnded();
		},
	});

	// Sync playback state when metadata changes
	useEffect(() => {
		const player = playerRef.current;
		if (!player || !videoPhase) return;

		const expectedTime = computeCurrentTime(
			videoPhase.startAt,
			videoPhase.playing,
			videoPhase.playStartedAt,
		);
		const currentTime = player.getCurrentTime?.() ?? 0;
		const drift = Math.abs(currentTime - expectedTime);

		// Re-seek if more than 2 seconds out of sync
		if (drift > 2) {
			player.seekTo(expectedTime, true);
		}

		if (videoPhase.playing) {
			player.playVideo?.();
		} else {
			player.pauseVideo?.();
		}
	}, [videoPhase, playerRef]);

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
			<div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
				<p>ビデオが設定されていません</p>
				{isFacilitator && (
					<Button variant="outline" onClick={handleAdvance}>
						次のフェーズへ
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 items-center gap-4 p-4">
			{/* Status / info bar */}
			<div className="flex items-center gap-2 self-start flex-wrap">
				<Badge variant={playerState === "playing" ? "default" : "secondary"}>
					{playerState === "playing"
						? "再生中"
						: playerState === "paused"
							? "一時停止中"
							: playerState === "ended"
								? "終了"
								: playerState === "buffering"
									? "バッファリング中"
									: "待機中"}
				</Badge>
				{autoAdvance && playerState !== "ended" && (
					<span className="text-xs text-muted-foreground">
						動画終了後に自動で次のフェーズへ移行します
					</span>
				)}
			</div>

			{/* Responsive YouTube embed — IFrame API replaces this div with the iframe */}
			<div className="w-full max-w-3xl aspect-video rounded-lg overflow-hidden bg-black shadow-lg">
				<div ref={containerRef} className="w-full h-full" />
			</div>

			{/* Facilitator controls */}
			{isFacilitator && (
				<div className="flex flex-col items-center gap-2 mt-2">
					{videoEndedNotified && !autoAdvance && (
						<p className="text-sm font-medium text-foreground">
							動画が終了しました。次のフェーズへ進む準備ができたらボタンを押してください。
						</p>
					)}
					<Button variant="outline" onClick={handleAdvance}>
						次のフェーズへ進む
					</Button>
				</div>
			)}

			{/* Non-facilitator ended message */}
			{(playerState === "ended" || videoEndedNotified) && !isFacilitator && (
				<p className="text-sm text-muted-foreground">
					動画が終了しました。ファシリテーターの操作をお待ちください。
				</p>
			)}
		</div>
	);
}
