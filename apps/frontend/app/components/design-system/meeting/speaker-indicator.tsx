import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const speakerIndicatorVariants = cva("", {
	variants: {
		size: {
			sm: "",
			md: "",
			lg: "",
		},
		color: {
			primary: "",
			warning: "",
			destructive: "",
		},
	},
	defaultVariants: {
		size: "md",
		color: "primary",
	},
});

const COLOR_MAP = {
	primary: {
		ring: "ring-primary",
		bg: "bg-primary",
		bar: "bg-primary",
	},
	warning: {
		ring: "ring-yellow-500",
		bg: "bg-yellow-500",
		bar: "bg-yellow-500",
	},
	destructive: {
		ring: "ring-destructive",
		bg: "bg-destructive",
		bar: "bg-destructive",
	},
} as const;

const SIZE_MAP = {
	sm: { dot: "size-2", bar: "h-2.5", barWidth: "w-0.5", gap: "gap-0.5", ring: "ring-1" },
	md: { dot: "size-2.5", bar: "h-3.5", barWidth: "w-0.5", gap: "gap-0.5", ring: "ring-2" },
	lg: { dot: "size-3", bar: "h-4", barWidth: "w-1", gap: "gap-1", ring: "ring-2" },
} as const;

interface SpeakerIndicatorProps extends VariantProps<typeof speakerIndicatorVariants> {
	active: boolean;
	variant?: "ring" | "bars" | "dot";
	className?: string;
}

const SpeakerIndicator = forwardRef<HTMLDivElement, SpeakerIndicatorProps>(
	({ active, variant = "bars", size = "md", color = "primary", className }, ref) => {
		const colors = COLOR_MAP[color ?? "primary"];
		const sizes = SIZE_MAP[size ?? "md"];

		if (variant === "ring") {
			return (
				<div
					ref={ref}
					data-slot="speaker-indicator"
					className={cn(
						"rounded-full transition-shadow",
						active && `${sizes.ring} ${colors.ring}`,
						className,
					)}
				/>
			);
		}

		if (variant === "dot") {
			return (
				<div
					ref={ref}
					data-slot="speaker-indicator"
					className={cn("inline-flex items-center justify-center", className)}
				>
					<span
						className={cn(
							"rounded-full transition-opacity",
							sizes.dot,
							colors.bg,
							active ? "opacity-100 animate-pulse" : "opacity-20",
						)}
					/>
				</div>
			);
		}

		// bars variant
		return (
			<div
				ref={ref}
				data-slot="speaker-indicator"
				role="img"
				className={cn("inline-flex items-end", sizes.gap, className)}
				aria-label={active ? "Speaking" : "Silent"}
			>
				{[0.6, 1, 0.75].map((scale, idx) => (
					<span
						key={`bar-${scale}`}
						className={cn(
							"rounded-full transition-all",
							sizes.barWidth,
							active ? colors.bar : "bg-muted-foreground/30",
						)}
						style={{
							height: active
								? `calc(${
										sizes.bar === "h-2.5" ? "0.625rem" : sizes.bar === "h-3.5" ? "0.875rem" : "1rem"
									} * ${scale})`
								: "2px",
							animationName: active ? "speaker-bar" : undefined,
							animationDuration: active ? `${0.4 + idx * 0.15}s` : undefined,
							animationTimingFunction: active ? "ease-in-out" : undefined,
							animationIterationCount: active ? "infinite" : undefined,
							animationDirection: active ? "alternate" : undefined,
							animationDelay: active ? `${idx * 0.1}s` : undefined,
						}}
					/>
				))}
			</div>
		);
	},
);

SpeakerIndicator.displayName = "SpeakerIndicator";

export { SpeakerIndicator, speakerIndicatorVariants };
export type { SpeakerIndicatorProps };
