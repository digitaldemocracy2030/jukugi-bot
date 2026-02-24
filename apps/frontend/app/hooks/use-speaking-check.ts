import { useEffect, useRef } from "react";
import { usePostApiRoomsRoomIdSpeakingCheck } from "../../src/api/gen/breakoutDeliberationOSAPI";

const POLL_INTERVAL_MS = 5000;

/**
 * 議論フェーズ中、5秒ごとに /speaking/check をポーリングする。
 * タイムアウトした発言者・割り込みを自動的に終了させ、次の発言者に進む。
 */
export function useSpeakingCheck(roomId: string, enabled: boolean) {
	const mutation = usePostApiRoomsRoomIdSpeakingCheck();
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const mutate = mutation.mutate;

	useEffect(() => {
		if (!enabled) {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			return;
		}

		mutate({ roomId });
		intervalRef.current = setInterval(() => {
			mutate({ roomId });
		}, POLL_INTERVAL_MS);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [roomId, enabled, mutate]);
}
