import { cva } from "class-variance-authority";

import { cn } from "~/lib/utils";

const progressBarVariants = cva("h-full rounded-full transition-all duration-300", {
	variants: {
		variant: {
			default: "bg-primary",
			success: "bg-green-500",
			warning: "bg-yellow-500",
			destructive: "bg-red-500",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const sizeMap = {
	sm: "h-1",
	md: "h-2",
	lg: "h-3",
} as const;

interface ProgressSegment {
	value: number;
	color: string;
	label?: string;
}

interface ProgressProps {
	/** Progress value (0-100) */
	value?: number;
	/** Maximum value (default 100) */
	max?: number;
	/** Variant */
	variant?: "default" | "success" | "warning" | "destructive";
	/** Size */
	size?: "sm" | "md" | "lg";
	/** Show label */
	showLabel?: boolean;
	/** Custom label formatter */
	formatLabel?: (value: number, max: number) => string;
	/** Multiple segments (e.g. yes/no vote bar) */
	segments?: ProgressSegment[];
	className?: string;
}

function Progress({
	value = 0,
	max = 100,
	variant = "default",
	size = "md",
	showLabel,
	formatLabel,
	segments,
	className,
}: ProgressProps) {
	const isSegmented = segments && segments.length > 0;
	const total = isSegmented ? segments.reduce((sum, s) => sum + s.value, 0) : max;

	return (
		<div data-slot="progress" className={cn("w-full", className)}>
			{showLabel && isSegmented && (
				<div className="mb-1 flex justify-between text-xs text-muted-foreground">
					{segments.map((segment) => (
						<span key={segment.label ?? segment.color}>{segment.label ?? `${segment.value}`}</span>
					))}
				</div>
			)}
			{showLabel && !isSegmented && (
				<div className="mb-1 text-right text-xs text-muted-foreground">
					{formatLabel ? formatLabel(value, max) : `${Math.round((value / max) * 100)}%`}
				</div>
			)}
			<div
				role="progressbar"
				aria-valuenow={isSegmented ? undefined : value}
				aria-valuemin={0}
				aria-valuemax={max}
				className={cn("w-full overflow-hidden rounded-full bg-muted", sizeMap[size])}
			>
				{isSegmented ? (
					<div className="flex h-full">
						{segments.map((segment) => {
							const pct = total > 0 ? (segment.value / total) * 100 : 0;
							return (
								<div
									key={segment.label ?? segment.color}
									className={cn("h-full transition-all duration-300", segment.color)}
									style={{ width: `${pct}%` }}
								/>
							);
						})}
					</div>
				) : (
					<div
						className={progressBarVariants({ variant })}
						style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
					/>
				)}
			</div>
		</div>
	);
}

export { Progress, progressBarVariants };
export type { ProgressProps, ProgressSegment };
