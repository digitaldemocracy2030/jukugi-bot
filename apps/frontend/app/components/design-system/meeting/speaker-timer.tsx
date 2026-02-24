import { forwardRef } from "react";

import { cn } from "~/lib/utils";

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

const SIZE_CONFIG = {
	sm: { container: "w-20 h-20", svg: 80, radius: 28, stroke: 6, text: "text-lg" },
	md: { container: "w-28 h-28", svg: 112, radius: 40, stroke: 8, text: "text-2xl" },
	lg: { container: "w-36 h-36", svg: 144, radius: 52, stroke: 10, text: "text-3xl" },
} as const;

interface SpeakerTimerProps {
	speakerName: string;
	remainingSeconds: number;
	totalSeconds: number;
	canEndSpeaking?: boolean;
	onEndSpeaking?: () => void;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const SpeakerTimer = forwardRef<HTMLDivElement, SpeakerTimerProps>(
	(
		{
			speakerName,
			remainingSeconds,
			totalSeconds,
			canEndSpeaking = false,
			onEndSpeaking,
			size = "md",
			className,
		},
		ref,
	) => {
		const config = SIZE_CONFIG[size];
		const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
		const circumference = 2 * Math.PI * config.radius;
		const dashOffset = circumference * (1 - progress);
		const center = config.svg / 2;

		return (
			<div
				ref={ref}
				data-slot="speaker-timer"
				className={cn("flex flex-col items-center gap-2", className)}
			>
				<div className={cn("relative flex items-center justify-center", config.container)}>
					<svg
						className="absolute inset-0 -rotate-90"
						width={config.svg}
						height={config.svg}
						viewBox={`0 0 ${config.svg} ${config.svg}`}
					>
						<title>Speaker timer</title>
						<circle
							cx={center}
							cy={center}
							r={config.radius}
							fill="none"
							strokeWidth={config.stroke}
							className="stroke-muted"
						/>
						<circle
							cx={center}
							cy={center}
							r={config.radius}
							fill="none"
							strokeWidth={config.stroke}
							strokeLinecap="round"
							strokeDasharray={circumference}
							strokeDashoffset={dashOffset}
							className={cn("transition-all duration-500", getProgressColor(remainingSeconds))}
						/>
					</svg>
					<span
						className={cn(
							"font-mono font-bold tabular-nums",
							config.text,
							getTimerColor(remainingSeconds),
						)}
					>
						{formatSeconds(remainingSeconds)}
					</span>
				</div>

				<p className="text-sm font-medium text-center max-w-[12rem] truncate">
					<span className="text-muted-foreground">発言中: </span>
					{speakerName}
				</p>

				{canEndSpeaking && onEndSpeaking && (
					<button
						type="button"
						onClick={onEndSpeaking}
						className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
					>
						End speaking
					</button>
				)}
			</div>
		);
	},
);

SpeakerTimer.displayName = "SpeakerTimer";

export { SpeakerTimer };
export type { SpeakerTimerProps };
