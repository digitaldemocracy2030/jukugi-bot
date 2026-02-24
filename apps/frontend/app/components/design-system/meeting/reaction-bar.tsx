import { forwardRef } from "react";

import { cn } from "~/lib/utils";

interface Reaction {
	emoji: string;
	label: string;
	shortcut?: string;
}

interface RecentReaction {
	emoji: string;
	participantName: string;
	timestamp: number;
}

interface ReactionBarProps {
	reactions: Reaction[];
	onReact: (emoji: string) => void;
	recentReactions?: RecentReaction[];
	className?: string;
}

const ReactionBar = forwardRef<HTMLDivElement, ReactionBarProps>(
	({ reactions, onReact, recentReactions, className }, ref) => {
		return (
			<div ref={ref} data-slot="reaction-bar" className={cn("flex flex-col gap-2", className)}>
				<div className="flex items-center gap-1">
					{reactions.map((reaction) => (
						<button
							key={reaction.emoji}
							type="button"
							onClick={() => onReact(reaction.emoji)}
							title={
								reaction.shortcut ? `${reaction.label} (${reaction.shortcut})` : reaction.label
							}
							className={[
								"inline-flex items-center justify-center",
								"size-9 rounded-full hover:bg-muted",
								"transition-colors text-lg",
							].join(" ")}
						>
							{reaction.emoji}
						</button>
					))}
				</div>

				{recentReactions && recentReactions.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{recentReactions.map((r, i) => (
							<span
								key={`${r.emoji}-${r.timestamp}-${i}`}
								className={[
									"inline-flex items-center gap-0.5",
									"rounded-full bg-muted px-2 py-0.5 text-xs",
									"animate-in fade-in",
									"slide-in-from-bottom-1 duration-200",
								].join(" ")}
							>
								<span>{r.emoji}</span>
								<span className="text-muted-foreground truncate max-w-[6rem]">
									{r.participantName}
								</span>
							</span>
						))}
					</div>
				)}
			</div>
		);
	},
);

ReactionBar.displayName = "ReactionBar";

export { ReactionBar };
export type { ReactionBarProps, Reaction, RecentReaction };
