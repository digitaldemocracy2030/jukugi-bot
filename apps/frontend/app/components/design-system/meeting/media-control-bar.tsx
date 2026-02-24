import { Camera, CameraOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

interface MediaControlBarProps {
	micEnabled: boolean;
	onMicToggle: () => void;
	micDisabledReason?: string;

	cameraEnabled: boolean;
	onCameraToggle: () => void;

	onLeave: () => void;

	leftActions?: React.ReactNode;
	rightActions?: React.ReactNode;

	phaseInfo?: {
		label: string;
		type: "video" | "discussion" | "voting" | "survey";
	};

	className?: string;
}

const PHASE_COLORS: Record<string, string> = {
	video: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
	discussion: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
	voting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
	survey: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const MediaControlBar = forwardRef<HTMLDivElement, MediaControlBarProps>(
	(
		{
			micEnabled,
			onMicToggle,
			micDisabledReason,
			cameraEnabled,
			onCameraToggle,
			onLeave,
			leftActions,
			rightActions,
			phaseInfo,
			className,
		},
		ref,
	) => {
		return (
			<div
				ref={ref}
				data-slot="media-control-bar"
				className={cn(
					"flex items-center justify-between gap-2 px-4 py-2 border-t bg-card",
					className,
				)}
			>
				{/* Left section */}
				<div className="flex items-center gap-2 flex-1 min-w-0">
					{phaseInfo && (
						<span
							className={cn(
								"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
								PHASE_COLORS[phaseInfo.type] ?? PHASE_COLORS.video,
							)}
						>
							{phaseInfo.label}
						</span>
					)}
					{leftActions}
				</div>

				{/* Center controls */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onMicToggle}
						disabled={!!micDisabledReason}
						title={micDisabledReason ?? (micEnabled ? "Mute" : "Unmute")}
						className={cn(
							"inline-flex items-center justify-center rounded-full size-10 transition-colors",
							micEnabled
								? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
								: "bg-destructive text-white hover:bg-destructive/90",
							micDisabledReason && "opacity-50 cursor-not-allowed",
						)}
					>
						{micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
					</button>

					<button
						type="button"
						onClick={onCameraToggle}
						title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
						className={cn(
							"inline-flex items-center justify-center rounded-full size-10 transition-colors",
							cameraEnabled
								? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
								: "bg-destructive text-white hover:bg-destructive/90",
						)}
					>
						{cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
					</button>

					<button
						type="button"
						onClick={onLeave}
						title="Leave"
						className={[
							"inline-flex items-center justify-center",
							"rounded-full size-10",
							"bg-destructive text-white",
							"hover:bg-destructive/90 transition-colors",
						].join(" ")}
					>
						<PhoneOff className="size-5" />
					</button>
				</div>

				{/* Right section */}
				<div className="flex items-center gap-2 flex-1 min-w-0 justify-end">{rightActions}</div>
			</div>
		);
	},
);

MediaControlBar.displayName = "MediaControlBar";

export { MediaControlBar };
export type { MediaControlBarProps };
