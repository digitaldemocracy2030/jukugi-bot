import { forwardRef, useMemo } from "react";

import { cn } from "~/lib/utils";
import { ParticipantListItem } from "./participant-list-item";

interface ParticipantData {
	id: string;
	displayName: string;
	role: "participant" | "facilitator" | "admin";
	status: "idle" | "speaking" | "queued" | "interrupting";
	isMuted?: boolean;
}

interface ParticipantListProps {
	participants: ParticipantData[];
	groupByRole?: boolean;
	currentParticipantId?: string;
	onParticipantAction?: (participantId: string, action: string) => void;
	className?: string;
}

const ROLE_ORDER: Record<string, number> = {
	admin: 0,
	facilitator: 1,
	participant: 2,
};

const ROLE_GROUP_LABELS: Record<string, string> = {
	admin: "Admin",
	facilitator: "Facilitator",
	participant: "Participants",
};

const ParticipantList = forwardRef<HTMLDivElement, ParticipantListProps>(
	({ participants, groupByRole = false, currentParticipantId, className }, ref) => {
		const grouped = useMemo(() => {
			if (!groupByRole) return null;

			const groups = new Map<string, ParticipantData[]>();
			for (const p of participants) {
				const list = groups.get(p.role) ?? [];
				list.push(p);
				groups.set(p.role, list);
			}

			return Array.from(groups.entries()).sort(
				([a], [b]) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99),
			);
		}, [participants, groupByRole]);

		return (
			<div ref={ref} data-slot="participant-list" className={cn("flex flex-col", className)}>
				<div className="px-3 py-2 border-b">
					<span className="text-sm font-semibold">Participants ({participants.length})</span>
				</div>

				<div className="flex-1 overflow-y-auto p-1">
					{grouped
						? grouped.map(([role, members]) => (
								<div key={role} className="mb-2">
									<div className="px-2 py-1">
										<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											{ROLE_GROUP_LABELS[role] ?? role} ({members.length})
										</span>
									</div>
									{members.map((p) => (
										<ParticipantListItem
											key={p.id}
											displayName={p.displayName}
											role={p.role}
											status={p.status}
											isMuted={p.isMuted}
											isMe={p.id === currentParticipantId}
										/>
									))}
								</div>
							))
						: participants.map((p) => (
								<ParticipantListItem
									key={p.id}
									displayName={p.displayName}
									role={p.role}
									status={p.status}
									isMuted={p.isMuted}
									isMe={p.id === currentParticipantId}
								/>
							))}
				</div>
			</div>
		);
	},
);

ParticipantList.displayName = "ParticipantList";

export { ParticipantList };
export type { ParticipantListProps, ParticipantData };
