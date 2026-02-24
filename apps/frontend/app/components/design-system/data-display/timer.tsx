import { forwardRef, useMemo } from "react";
import { cn } from "~/lib/utils";

type TimerProps = {
	remainingSeconds: number;
	totalSeconds: number;
	format?: "mm:ss" | "seconds";
	size?: "sm" | "md" | "lg";
	thresholds?: {
		warning: number;
		danger: number;
	};
	label?: string;
	className?: string;
};

const sizeConfig = {
	sm: { diameter: 48, strokeWidth: 4, radius: 18, textClass: "text-sm" },
	md: { diameter: 80, strokeWidth: 6, radius: 31, textClass: "text-xl" },
	lg: { diameter: 120, strokeWidth: 8, radius: 48, textClass: "text-2xl" },
} as const;

function formatTime(seconds: number, fmt: "mm:ss" | "seconds"): string {
	if (fmt === "seconds") return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function getTimerStage(
	remaining: number,
	warningThreshold: number,
	dangerThreshold: number,
): "normal" | "warning" | "danger" {
	if (remaining <= dangerThreshold) return "danger";
	if (remaining <= warningThreshold) return "warning";
	return "normal";
}

const stageColors = {
	normal: { stroke: "stroke-teal-500", text: "text-teal-600 dark:text-teal-400" },
	warning: { stroke: "stroke-amber-500", text: "text-amber-600 dark:text-amber-400" },
	danger: { stroke: "stroke-red-500", text: "text-red-600 dark:text-red-400" },
} as const;

const Timer = forwardRef<HTMLDivElement, TimerProps>(
	(
		{ remainingSeconds, totalSeconds, format = "mm:ss", size = "md", thresholds, label, className },
		ref,
	) => {
		const warningThreshold = thresholds?.warning ?? Math.floor(totalSeconds * 0.5);
		const dangerThreshold = thresholds?.danger ?? Math.floor(totalSeconds * 0.2);
		const stage = getTimerStage(remainingSeconds, warningThreshold, dangerThreshold);
		const colors = stageColors[stage];
		const config = sizeConfig[size];

		const circumference = useMemo(() => 2 * Math.PI * config.radius, [config.radius]);
		const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
		const dashOffset = circumference * (1 - progress);
		const center = config.diameter / 2;

		return (
			<div
				ref={ref}
				data-slot="ds-timer"
				className={cn("flex flex-col items-center gap-1", className)}
			>
				{label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
				<div
					className="relative flex items-center justify-center"
					style={{ width: config.diameter, height: config.diameter }}
				>
					<svg
						className="absolute inset-0 -rotate-90"
						width={config.diameter}
						height={config.diameter}
						viewBox={`0 0 ${config.diameter} ${config.diameter}`}
					>
						<title>Timer</title>
						<circle
							cx={center}
							cy={center}
							r={config.radius}
							fill="none"
							strokeWidth={config.strokeWidth}
							className="stroke-muted"
						/>
						<circle
							cx={center}
							cy={center}
							r={config.radius}
							fill="none"
							strokeWidth={config.strokeWidth}
							strokeLinecap="round"
							strokeDasharray={circumference}
							strokeDashoffset={dashOffset}
							className={cn(
								"transition-all duration-500",
								colors.stroke,
								stage === "danger" && "animate-pulse",
							)}
						/>
					</svg>
					<span className={cn("font-mono font-bold tabular-nums", config.textClass, colors.text)}>
						{formatTime(remainingSeconds, format)}
					</span>
				</div>
			</div>
		);
	},
);

Timer.displayName = "Timer";

export { Timer, type TimerProps };
