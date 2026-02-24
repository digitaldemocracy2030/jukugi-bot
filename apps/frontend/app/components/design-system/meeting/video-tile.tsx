import { cva, type VariantProps } from "class-variance-authority";
import { Mic, MicOff, Pin } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const videoTileVariants = cva(
	"relative overflow-hidden rounded-lg bg-muted flex items-center justify-center",
	{
		variants: {
			layout: {
				fill: "w-full h-full",
				fit: "w-full h-full object-contain",
			},
			aspectRatio: {
				"16:9": "aspect-video",
				"4:3": "aspect-4/3",
				"1:1": "aspect-square",
			},
		},
		defaultVariants: {
			layout: "fill",
			aspectRatio: "16:9",
		},
	},
);

const ROLE_LABELS: Record<string, string> = {
	facilitator: "F",
	admin: "A",
};

interface VideoTileProps extends VariantProps<typeof videoTileVariants> {
	displayName: string;
	isSpeaking?: boolean;
	isMuted?: boolean;
	role?: "participant" | "facilitator" | "admin";
	pinned?: boolean;
	onPinToggle?: () => void;
	focused?: boolean;
	onClick?: () => void;
	children?: React.ReactNode;
	className?: string;
}

function TileContent({
	displayName,
	initials,
	isSpeaking,
	isMuted,
	role,
	pinned,
	onPinToggle,
	children,
}: {
	displayName: string;
	initials: string;
	isSpeaking: boolean;
	isMuted: boolean;
	role: string;
	pinned: boolean;
	onPinToggle?: () => void;
	children?: React.ReactNode;
}) {
	return (
		<>
			{children ?? (
				<div className="flex flex-col items-center justify-center gap-1 w-full h-full">
					<div
						className={[
							"flex items-center justify-center",
							"rounded-full bg-secondary",
							"text-secondary-foreground",
							"size-12 text-lg font-semibold",
						].join(" ")}
					>
						{initials}
					</div>
					<span className="text-xs text-muted-foreground truncate max-w-[90%]">{displayName}</span>
				</div>
			)}

			{pinned && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onPinToggle?.();
					}}
					className={[
						"absolute top-1.5 left-1.5 rounded-full",
						"bg-black/50 p-1 text-white",
						"hover:bg-black/70 transition-colors",
					].join(" ")}
					aria-label="Unpin"
				>
					<Pin className="size-3" />
				</button>
			)}

			<div
				className={[
					"absolute bottom-0 left-0 right-0",
					"bg-gradient-to-t from-black/60 to-transparent",
					"px-2 py-1.5",
				].join(" ")}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1 min-w-0">
						<span className="text-white text-xs font-medium truncate">{displayName}</span>
						{role !== "participant" && ROLE_LABELS[role] && (
							<span
								className={[
									"shrink-0 inline-flex items-center",
									"justify-center rounded bg-primary/80",
									"px-1 py-0.5 text-[10px]",
									"font-medium leading-none",
									"text-primary-foreground",
								].join(" ")}
							>
								{ROLE_LABELS[role]}
							</span>
						)}
					</div>
					{isMuted && <MicOff className="size-3.5 shrink-0 text-red-400" aria-label="Muted" />}
					{!isMuted && isSpeaking && (
						<Mic className="size-3.5 shrink-0 text-green-400" aria-label="Speaking" />
					)}
				</div>
			</div>
		</>
	);
}

const VideoTile = forwardRef<HTMLDivElement, VideoTileProps>(
	(
		{
			displayName,
			isSpeaking = false,
			isMuted = false,
			role = "participant",
			layout,
			aspectRatio,
			pinned = false,
			onPinToggle,
			focused = false,
			onClick,
			children,
			className,
		},
		ref,
	) => {
		const initials = displayName.trim().slice(0, 2).toUpperCase();

		const tileContent = (
			<TileContent
				displayName={displayName}
				initials={initials}
				isSpeaking={isSpeaking}
				isMuted={isMuted}
				role={role}
				pinned={pinned}
				onPinToggle={onPinToggle}
			>
				{children}
			</TileContent>
		);

		const baseClasses = cn(
			videoTileVariants({ layout, aspectRatio }),
			isSpeaking && "ring-2 ring-primary",
			focused && "ring-2 ring-primary ring-offset-2",
			className,
		);

		if (!onClick) {
			return (
				<div ref={ref} data-slot="video-tile" className={baseClasses}>
					{tileContent}
				</div>
			);
		}

		return (
			<button
				ref={ref as React.Ref<HTMLButtonElement>}
				type="button"
				data-slot="video-tile"
				onClick={onClick}
				className={cn(baseClasses, "cursor-pointer text-left")}
			>
				{tileContent}
			</button>
		);
	},
);

VideoTile.displayName = "VideoTile";

export { VideoTile, videoTileVariants };
export type { VideoTileProps };
