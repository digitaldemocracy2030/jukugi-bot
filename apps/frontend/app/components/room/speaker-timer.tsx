import { useEffect, useRef, useState } from "react";

type SpeakerTimerProps = {
	speakingUntil: number;
	/** Total allocated speaking duration in seconds (used for progress calc). */
	totalSeconds: number;
	speakerName: string;
};

function getTimerColor(remaining: number): string {
	if (remaining <= 5) return "text-red-500";
	if (remaining <= 10) return "text-yellow-500";
	return "text-green-500";
}

function getProgressColor(remaining: number): string {
	if (remaining <= 5) return "stroke-red-500";
	if (remaining <= 10) return "stroke-yellow-500";
	return "stroke-green-500";
}

function formatSeconds(s: number): string {
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m}:${String(sec).padStart(2, "0")}`;
}

function computeRemaining(speakingUntil: number): number {
	return Math.max(0, Math.ceil((speakingUntil - Date.now()) / 1000));
}

export function SpeakerTimer({ speakingUntil, totalSeconds, speakerName }: SpeakerTimerProps) {
	const [remaining, setRemaining] = useState(() => computeRemaining(speakingUntil));
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		// Recompute immediately when speakingUntil changes
		setRemaining(computeRemaining(speakingUntil));

		intervalRef.current = setInterval(() => {
			const r = computeRemaining(speakingUntil);
			setRemaining(r);
			if (r === 0 && intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, 500);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [speakingUntil]);

	const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
	const radius = 40;
	const circumference = 2 * Math.PI * radius;
	const dashOffset = circumference * (1 - progress);

	return (
		<div className="flex flex-col items-center gap-2">
			<div className="relative flex items-center justify-center w-28 h-28">
				<svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
					<title>発言タイマー</title>
					{/* Track */}
					<circle cx="56" cy="56" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
					{/* Progress */}
					<circle
						cx="56"
						cy="56"
						r={radius}
						fill="none"
						strokeWidth="8"
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={dashOffset}
						className={`transition-all duration-500 ${getProgressColor(remaining)}`}
					/>
				</svg>
				<span className={`text-2xl font-mono font-bold tabular-nums ${getTimerColor(remaining)}`}>
					{formatSeconds(remaining)}
				</span>
			</div>
			<p className="text-sm font-medium text-center max-w-[12rem] truncate">
				<span className="text-muted-foreground">発言中: </span>
				{speakerName}
			</p>
		</div>
	);
}
