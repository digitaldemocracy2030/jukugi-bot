import { Mic, MicOff } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";
import { SpeakerIndicator } from "./speaker-indicator";

const ROLE_LABELS: Record<string, string> = {
	facilitator: "F",
	admin: "A",
};

const STATUS_STYLES: Record<string, string> = {
	speaking: "text-green-600 dark:text-green-400",
	interrupting: "text-red-600 dark:text-red-400",
	queued: "text-yellow-600 dark:text-yellow-400",
	idle: "",
};

interface ParticipantListItemProps {
	displayName: string;
	role: "participant" | "facilitator" | "admin";
	status: "idle" | "speaking" | "queued" | "interrupting";
	isMuted?: boolean;
	isMe?: boolean;
	actions?: React.ReactNode;
	className?: string;
}

const ParticipantListItem = forwardRef<HTMLDivElement, ParticipantListItemProps>(
	({ displayName, role, status, isMuted = false, isMe = false, actions, className }, ref) => {
		const initials = displayName.trim().slice(0, 2).toUpperCase();

		return (
			<div
				ref={ref}
				data-slot="participant-list-item"
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50",
					isMe && "bg-muted/30",
					className,
				)}
			>
				{/* Avatar */}
				<div
					className={[
						"flex items-center justify-center rounded-full",
						"bg-secondary text-secondary-foreground",
						"size-7 text-xs font-semibold shrink-0",
					].join(" ")}
				>
					{initials}
				</div>

				{/* Name */}
				<span className={cn("flex-1 text-sm truncate", STATUS_STYLES[status])}>
					{displayName}
					{isMe && <span className="text-muted-foreground text-xs ml-1">(you)</span>}
				</span>

				{/* Speaker indicator */}
				{(status === "speaking" || status === "interrupting") && (
					<SpeakerIndicator
						active
						variant="bars"
						size="sm"
						color={status === "interrupting" ? "destructive" : "primary"}
					/>
				)}

				{/* Role badge */}
				{role !== "participant" && ROLE_LABELS[role] && (
					<span
						className={[
							"shrink-0 inline-flex items-center",
							"justify-center rounded bg-primary/10",
							"px-1 py-0.5 text-[10px]",
							"font-medium leading-none text-primary",
						].join(" ")}
					>
						{ROLE_LABELS[role]}
					</span>
				)}

				{/* Mic status */}
				{isMuted ? (
					<MicOff className="size-3.5 shrink-0 text-muted-foreground" aria-label="Muted" />
				) : (
					<Mic className="size-3.5 shrink-0 text-muted-foreground" aria-label="Unmuted" />
				)}

				{/* Actions slot */}
				{actions && <div className="shrink-0">{actions}</div>}
			</div>
		);
	},
);

ParticipantListItem.displayName = "ParticipantListItem";

export { ParticipantListItem };
export type { ParticipantListItemProps };
