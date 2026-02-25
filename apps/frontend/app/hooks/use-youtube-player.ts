import { useCallback, useEffect, useRef, useState } from "react";

// Extend Window with the YT global injected by the YouTube IFrame API
declare global {
	interface Window {
		YT: typeof YT;
		onYouTubeIframeAPIReady: () => void;
	}
}

export type YouTubePlayerState =
	| "unstarted"
	| "ended"
	| "playing"
	| "paused"
	| "buffering"
	| "cued";

export type UseYouTubePlayerOptions = {
	videoId: string;
	startAt?: number;
	onStateChange?: (state: YouTubePlayerState) => void;
	onReady?: (player: YT.Player) => void;
};

let apiLoaded = false;
const pendingCallbacks: Array<() => void> = [];

function loadYouTubeApi(onReady: () => void) {
	if (apiLoaded) {
		onReady();
		return;
	}
	pendingCallbacks.push(onReady);
	if (document.getElementById("yt-iframe-api")) return;

	const script = document.createElement("script");
	script.id = "yt-iframe-api";
	script.src = "https://www.youtube.com/iframe_api";
	document.head.appendChild(script);

	window.onYouTubeIframeAPIReady = () => {
		apiLoaded = true;
		for (const cb of pendingCallbacks) cb();
		pendingCallbacks.length = 0;
	};
}

function ytStateToString(data: number): YouTubePlayerState {
	if (data === -1) return "unstarted";
	if (data === 0) return "ended";
	if (data === 1) return "playing";
	if (data === 2) return "paused";
	if (data === 3) return "buffering";
	if (data === 5) return "cued";
	return "unstarted";
}

export function useYouTubePlayer({
	videoId,
	startAt = 0,
	onStateChange,
	onReady,
}: UseYouTubePlayerOptions) {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YT.Player | null>(null);
	const [playerState, setPlayerState] = useState<YouTubePlayerState>("unstarted");

	// Keep callbacks up-to-date without triggering re-init
	const onStateChangeRef = useRef(onStateChange);
	const onReadyRef = useRef(onReady);
	onStateChangeRef.current = onStateChange;
	onReadyRef.current = onReady;

	// Capture initial videoId/startAt in refs so the effect closure stays stable
	// (the effect intentionally runs once; imperative updates go through playerRef)
	const initVideoIdRef = useRef(videoId);
	const initStartAtRef = useRef(startAt);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		loadYouTubeApi(() => {
			if (!el) return;
			const player = new window.YT.Player(el, {
				videoId: initVideoIdRef.current,
				playerVars: {
					start: Math.floor(initStartAtRef.current),
					autoplay: 0,
					controls: 0,
					rel: 0,
					modestbranding: 1,
					playsinline: 1,
				},
				events: {
					onReady: (e: YT.PlayerEvent) => {
						playerRef.current = e.target;
						onReadyRef.current?.(e.target);
					},
					onStateChange: (e: YT.OnStateChangeEvent) => {
						const state = ytStateToString(e.data);
						setPlayerState(state);
						onStateChangeRef.current?.(state);
					},
				},
			});
			playerRef.current = player;
		});

		return () => {
			try {
				playerRef.current?.destroy();
			} catch {
				// ignore errors during cleanup
			}
			playerRef.current = null;
		};
	}, []);

	const play = useCallback(() => {
		playerRef.current?.playVideo();
	}, []);

	return { containerRef, playerRef, playerState, play };
}
