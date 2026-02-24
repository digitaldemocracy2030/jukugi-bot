import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { cn } from "~/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";

type Props = {
	trackRef: TrackReferenceOrPlaceholder;
	displayName: string;
	isCurrentSpeaker?: boolean;
	variant?: "main" | "thumbnail";
	className?: string;
};

export function ParticipantVideoTile({
	trackRef,
	displayName,
	isCurrentSpeaker = false,
	variant = "thumbnail",
	className,
}: Props) {
	const hasVideo =
		trackRef.publication !== undefined &&
		!trackRef.publication.isMuted &&
		trackRef.source !== Track.Source.Unknown;

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg bg-muted flex items-center justify-center",
				variant === "main" && "w-full h-full",
				variant === "thumbnail" && "w-24 h-16 shrink-0",
				isCurrentSpeaker && "ring-2 ring-green-500",
				className,
			)}
		>
			{hasVideo ? (
				<VideoTrack
					trackRef={trackRef as Parameters<typeof VideoTrack>[0]["trackRef"]}
					className="w-full h-full object-cover"
				/>
			) : (
				<div className="flex flex-col items-center justify-center gap-1 w-full h-full">
					<Avatar size={variant === "main" ? "lg" : "sm"}>
						<AvatarFallback>{displayName.trim().slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
					{variant === "main" && (
						<span className="text-xs text-muted-foreground truncate max-w-[90%]">
							{displayName}
						</span>
					)}
				</div>
			)}
			<div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
				<span className="text-white text-xs truncate block">
					{displayName}
					{isCurrentSpeaker && <span className="ml-1 text-green-400 text-[10px]">発言中</span>}
				</span>
			</div>
		</div>
	);
}
