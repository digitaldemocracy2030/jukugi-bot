import { TrendingDown, TrendingUp } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const COLOR_ACCENTS = {
	default: "border-l-border",
	primary: "border-l-primary",
	success: "border-l-green-500",
	warning: "border-l-yellow-500",
	destructive: "border-l-destructive",
} as const;

const TREND_STYLES = {
	up: { icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
	down: { icon: TrendingDown, color: "text-red-600 dark:text-red-400" },
	neutral: { icon: null, color: "text-muted-foreground" },
} as const;

interface StatCardProps {
	label: string;
	value: string | number;
	unit?: string;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		direction: "up" | "down" | "neutral";
		label?: string;
	};
	colorScheme?: "default" | "primary" | "success" | "warning" | "destructive";
	className?: string;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
	({ label, value, unit, icon, trend, colorScheme = "default", className }, ref) => {
		const trendConfig = trend ? TREND_STYLES[trend.direction] : null;
		const TrendIcon = trendConfig?.icon;

		return (
			<div
				ref={ref}
				data-slot="stat-card"
				className={cn(
					"rounded-lg border border-l-4 bg-card p-4",
					COLOR_ACCENTS[colorScheme],
					className,
				)}
			>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs font-medium text-muted-foreground">{label}</p>
						<div className="flex items-baseline gap-1">
							<span className="text-2xl font-bold tabular-nums">{value}</span>
							{unit && <span className="text-sm text-muted-foreground">{unit}</span>}
						</div>
					</div>
					{icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
				</div>

				{trend && (
					<div className={cn("flex items-center gap-1 mt-2 text-xs", trendConfig?.color)}>
						{TrendIcon && <TrendIcon className="size-3.5" />}
						<span>
							{trend.direction !== "neutral" && (trend.direction === "up" ? "+" : "")}
							{trend.value}%
						</span>
						{trend.label && <span className="text-muted-foreground">{trend.label}</span>}
					</div>
				)}
			</div>
		);
	},
);

StatCard.displayName = "StatCard";

export { StatCard };
export type { StatCardProps };
