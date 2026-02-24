import { cn } from "~/lib/utils";

interface SkeletonProps {
	/** Shape variant */
	variant?: "text" | "circular" | "rectangular";
	/** Width */
	width?: number | string;
	/** Height */
	height?: number | string;
	/** Number of text lines (variant="text") */
	lines?: number;
	/** Enable animation */
	animate?: boolean;
	className?: string;
}

function Skeleton({
	variant = "text",
	width,
	height,
	lines = 1,
	animate = true,
	className,
}: SkeletonProps) {
	const baseClass = cn("bg-muted", animate && "animate-pulse");

	if (variant === "text") {
		const lineItems = Array.from({ length: lines }, (_, i) => ({
			id: `line-${i}`,
			isLast: i === lines - 1 && lines > 1,
		}));
		return (
			<div data-slot="skeleton" className={cn("flex flex-col gap-2", className)}>
				{lineItems.map((line) => (
					<div
						key={line.id}
						className={cn(baseClass, "h-4 rounded", line.isLast && "w-3/4")}
						style={{
							width: line.isLast ? undefined : (width ?? "100%"),
							height: height ?? undefined,
						}}
					/>
				))}
			</div>
		);
	}

	if (variant === "circular") {
		return (
			<div
				data-slot="skeleton"
				className={cn(baseClass, "rounded-full", className)}
				style={{
					width: width ?? 40,
					height: height ?? width ?? 40,
				}}
			/>
		);
	}

	// rectangular
	return (
		<div
			data-slot="skeleton"
			className={cn(baseClass, "rounded-md", className)}
			style={{
				width: width ?? "100%",
				height: height ?? 100,
			}}
		/>
	);
}

export { Skeleton };
export type { SkeletonProps };
