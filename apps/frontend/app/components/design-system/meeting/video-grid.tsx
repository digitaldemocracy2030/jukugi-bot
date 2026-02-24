import { Children, forwardRef } from "react";

import { cn } from "~/lib/utils";

const GRID_COL_CLASSES: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
};

function resolveGridCols(count: number, maxColumns?: number): string {
	let cols: number;
	if (count <= 1) cols = 1;
	else if (count <= 4) cols = 2;
	else if (count <= 9) cols = 3;
	else cols = 4;

	if (maxColumns != null && cols > maxColumns) {
		cols = maxColumns;
	}

	return GRID_COL_CLASSES[cols] ?? "grid-cols-4";
}

interface VideoGridProps {
	children: React.ReactNode;
	layout?: "grid" | "spotlight" | "sidebar";
	maxColumns?: number;
	spotlightContent?: React.ReactNode;
	className?: string;
}

const VideoGrid = forwardRef<HTMLDivElement, VideoGridProps>(
	({ children, layout = "grid", maxColumns, spotlightContent, className }, ref) => {
		const childCount = Children.count(children);

		if (layout === "spotlight") {
			return (
				<div ref={ref} data-slot="video-grid" className={cn("flex gap-2 w-full h-full", className)}>
					<div className="flex-1 min-w-0">{spotlightContent}</div>
					{childCount > 0 && (
						<div className="flex flex-col gap-1 overflow-y-auto max-h-full w-28 shrink-0">
							{children}
						</div>
					)}
				</div>
			);
		}

		if (layout === "sidebar") {
			return (
				<div ref={ref} data-slot="video-grid" className={cn("flex gap-2 w-full h-full", className)}>
					<div className="flex-1 min-w-0">{spotlightContent}</div>
					{childCount > 0 && (
						<div className="flex flex-col gap-1 overflow-y-auto max-h-full w-48 shrink-0">
							{children}
						</div>
					)}
				</div>
			);
		}

		return (
			<div
				ref={ref}
				data-slot="video-grid"
				className={cn(
					"grid gap-2 w-full h-full auto-rows-fr",
					resolveGridCols(childCount, maxColumns),
					className,
				)}
			>
				{children}
			</div>
		);
	},
);

VideoGrid.displayName = "VideoGrid";

export { VideoGrid };
export type { VideoGridProps };
