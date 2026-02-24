import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const statusColorMap = {
	online: "bg-green-500",
	offline: "bg-stone-400 dark:bg-stone-600",
	away: "bg-amber-500",
	busy: "bg-red-500",
	speaking: "bg-teal-500",
} as const;

const sizeMap = {
	sm: "size-2",
	md: "size-2.5",
	lg: "size-3.5",
} as const;

type StatusIndicatorProps = React.ComponentProps<"span"> & {
	status: "online" | "offline" | "away" | "busy" | "speaking";
	size?: "sm" | "md" | "lg";
	pulse?: boolean;
};

const StatusIndicator = forwardRef<HTMLSpanElement, StatusIndicatorProps>(
	({ status, size = "md", pulse, className, ...props }, ref) => {
		const shouldPulse = pulse ?? status === "speaking";

		return (
			<span
				ref={ref}
				data-slot="status-indicator"
				title={status}
				className={cn(
					"inline-block rounded-full shrink-0",
					statusColorMap[status],
					sizeMap[size],
					shouldPulse && "animate-pulse",
					className,
				)}
				{...props}
			/>
		);
	},
);

StatusIndicator.displayName = "StatusIndicator";

export { StatusIndicator, type StatusIndicatorProps };
