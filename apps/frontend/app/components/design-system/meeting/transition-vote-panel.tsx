import { Check, Loader2, X } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

import { cn } from "~/lib/utils";

interface TransitionProposal {
	id: string;
	status: "open" | "approved" | "rejected" | "expired";
	yesCount: number;
	noCount: number;
	totalVoted: number;
	requiredThreshold: number;
	expiresAt: number;
	proposedByRole: "admin" | "participant";
}

interface TransitionVotePanelProps {
	proposal: TransitionProposal;
	myVote?: "yes" | "no" | null;
	onVote: (vote: "yes" | "no") => void;
	loading?: boolean;
	className?: string;
}

function formatRemaining(ms: number): string {
	const totalSec = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TransitionVotePanel = forwardRef<HTMLDivElement, TransitionVotePanelProps>(
	({ proposal, myVote, onVote, loading = false, className }, ref) => {
		const [remainingMs, setRemainingMs] = useState(() =>
			Math.max(0, proposal.expiresAt - Date.now()),
		);

		useEffect(() => {
			if (proposal.status !== "open") return;

			const update = () => {
				setRemainingMs(Math.max(0, proposal.expiresAt - Date.now()));
			};
			update();
			const timer = setInterval(update, 1000);
			return () => clearInterval(timer);
		}, [proposal.expiresAt, proposal.status]);

		const yesPercent =
			proposal.totalVoted > 0 ? Math.round((proposal.yesCount / proposal.totalVoted) * 100) : 0;
		const thresholdPercent = Math.round(proposal.requiredThreshold * 100);

		if (proposal.status === "approved") {
			return (
				<div
					ref={ref}
					data-slot="transition-vote-panel"
					className={cn(
						"rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4",
						className,
					)}
				>
					<p className="text-center text-green-700 dark:text-green-300 font-medium">
						Transition approved - moving to next phase
					</p>
				</div>
			);
		}

		if (proposal.status === "rejected") {
			return (
				<div
					ref={ref}
					data-slot="transition-vote-panel"
					className={cn(
						"rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4",
						className,
					)}
				>
					<p className="text-center text-red-700 dark:text-red-300">
						Transition proposal was rejected
					</p>
				</div>
			);
		}

		if (proposal.status === "expired") {
			return (
				<div
					ref={ref}
					data-slot="transition-vote-panel"
					className={cn("rounded-lg border border-border bg-muted p-4", className)}
				>
					<p className="text-center text-muted-foreground">
						Vote expired - staying in current phase
					</p>
				</div>
			);
		}

		return (
			<div
				ref={ref}
				data-slot="transition-vote-panel"
				className={cn(
					"rounded-lg border border-blue-200 dark:border-blue-800 bg-card p-4 space-y-3",
					className,
				)}
			>
				{/* Header */}
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Move to next phase?</span>
					<span
						className={[
							"inline-flex items-center rounded-full",
							"border px-2 py-0.5 text-[10px]",
							"font-medium text-muted-foreground",
						].join(" ")}
					>
						{proposal.proposedByRole === "admin" ? "Admin proposal" : "Participant proposal"}
					</span>
				</div>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${yesPercent}%` }}
						/>
					</div>
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>
							Yes: {proposal.yesCount} / No: {proposal.noCount} / Voted: {proposal.totalVoted}
						</span>
						<span>
							Threshold: {thresholdPercent}% (now {yesPercent}%)
						</span>
					</div>
				</div>

				{/* Remaining time */}
				<p className="text-xs text-center text-muted-foreground">
					Time remaining: {formatRemaining(remainingMs)}
				</p>

				{/* Vote buttons */}
				{myVote == null ? (
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => onVote("yes")}
							disabled={loading}
							className={[
								"flex-1 inline-flex items-center",
								"justify-center gap-1.5 rounded-md",
								"bg-primary text-primary-foreground",
								"hover:bg-primary/90 h-9 px-3",
								"text-sm font-medium transition-colors",
								"disabled:opacity-50",
							].join(" ")}
						>
							{loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
							Yes
						</button>
						<button
							type="button"
							onClick={() => onVote("no")}
							disabled={loading}
							className={[
								"flex-1 inline-flex items-center",
								"justify-center gap-1.5 rounded-md",
								"border border-border bg-background",
								"text-foreground hover:bg-muted",
								"h-9 px-3 text-sm font-medium",
								"transition-colors disabled:opacity-50",
							].join(" ")}
						>
							{loading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
							No
						</button>
					</div>
				) : (
					<p className="text-xs text-center text-muted-foreground">
						You voted: {myVote === "yes" ? "Yes" : "No"}
					</p>
				)}
			</div>
		);
	},
);

TransitionVotePanel.displayName = "TransitionVotePanel";

export { TransitionVotePanel };
export type { TransitionVotePanelProps, TransitionProposal };
