import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type CountdownProps = {
	expiresAt: number;
	expiredLabel?: string;
	size?: "sm" | "md";
	urgentThreshold?: number;
	onExpire?: () => void;
	className?: string;
};

const sizeClass = {
	sm: "text-xs",
	md: "text-sm",
} as const;

function computeRemaining(expiresAt: number): number {
	return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
	if (totalSeconds <= 0) return "0:00";
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const Countdown = forwardRef<HTMLSpanElement, CountdownProps>(
	(
		{ expiresAt, expiredLabel = "Expired", size = "md", urgentThreshold = 30, onExpire, className },
		ref,
	) => {
		const [remaining, setRemaining] = useState(() => computeRemaining(expiresAt));
		const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
		const expiredRef = useRef(false);

		const cleanup = useCallback(() => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, []);

		useEffect(() => {
			expiredRef.current = false;
			setRemaining(computeRemaining(expiresAt));

			intervalRef.current = setInterval(() => {
				const r = computeRemaining(expiresAt);
				setRemaining(r);
				if (r === 0) {
					cleanup();
					if (!expiredRef.current) {
						expiredRef.current = true;
						onExpire?.();
					}
				}
			}, 1000);

			return cleanup;
		}, [expiresAt, onExpire, cleanup]);

		const isExpired = remaining === 0;
		const isUrgent = !isExpired && remaining <= urgentThreshold;

		return (
			<span
				ref={ref}
				data-slot="ds-countdown"
				className={cn(
					"font-mono font-medium tabular-nums",
					sizeClass[size],
					isExpired && "text-muted-foreground",
					isUrgent && "text-red-600 dark:text-red-400",
					!isExpired && !isUrgent && "text-foreground",
					className,
				)}
			>
				{isExpired ? expiredLabel : formatCountdown(remaining)}
			</span>
		);
	},
);

Countdown.displayName = "Countdown";

export { Countdown, type CountdownProps };
