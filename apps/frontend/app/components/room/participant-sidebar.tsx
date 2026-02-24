import { useParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import {
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "../../../src/api/gen/breakoutDeliberationOSAPI";
import type { RoomMetadata } from "../../types/room-metadata";
import { Badge, Button, Stack, StatusIndicator, Typography } from "../design-system";

type ParticipantStatus = "speaking" | "interrupting" | "queued" | "idle";

function getStatus(participant: Participant, metadata: RoomMetadata | null): ParticipantStatus {
	const id = participant.identity;
	const queue = metadata?.speakerQueue;
	if (!queue) return "idle";
	if (queue.currentSpeaker?.participantId === id) return "speaking";
	if (queue.interruptions.some((i) => i.participantId === id)) return "interrupting";
	if (queue.queue.some((q) => q.participantId === id)) return "queued";
	return "idle";
}

const STATUS_MAP: Record<
	ParticipantStatus,
	{ indicator: "speaking" | "busy" | "away" | "offline"; label: string }
> = {
	speaking: { indicator: "speaking", label: "発言中" },
	interrupting: { indicator: "busy", label: "割り込み中" },
	queued: { indicator: "away", label: "挙手中" },
	idle: { indicator: "offline", label: "待機中" },
};

type ParticipantRole = "facilitator" | "participant";

function getRole(participant: Participant): ParticipantRole {
	try {
		const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
		return meta.role === "facilitator" ? "facilitator" : "participant";
	} catch {
		return "participant";
	}
}

type ParticipantSidebarProps = {
	metadata: RoomMetadata | null;
	roomId: string;
	isFacilitator: boolean;
};

export function ParticipantSidebar({ metadata, roomId, isFacilitator }: ParticipantSidebarProps) {
	const participants = useParticipants();

	const nextSpeakerMutation = usePostApiRoomsRoomIdQueueNext();
	const skipSpeakerMutation = usePostApiRoomsRoomIdQueueSkip();
	const endInterruptionMutation = usePostApiRoomsRoomIdInterruptParticipantIdEnd();

	return (
		<aside className="flex flex-col w-60 shrink-0 border-l bg-card h-full overflow-y-auto">
			<div className="p-3 border-b">
				<Typography variant="label">参加者 ({participants.length})</Typography>
			</div>

			{/* Facilitator controls */}
			{isFacilitator && (
				<div className="p-3 border-b">
					<Stack direction="vertical" gap={2}>
						<Typography variant="caption" weight="medium" className="uppercase tracking-wide">
							ファシリテーター操作
						</Typography>
						<Button
							size="sm"
							variant="outline"
							fullWidth
							onClick={() => nextSpeakerMutation.mutate({ roomId, data: {} })}
						>
							次の発言者
						</Button>
						<Button
							size="sm"
							variant="outline"
							fullWidth
							onClick={() => skipSpeakerMutation.mutate({ roomId })}
						>
							スキップ
						</Button>
					</Stack>
				</div>
			)}

			{/* Participant list */}
			<ul className="flex-1 p-2 flex flex-col gap-1">
				{participants.map((p) => {
					const status = getStatus(p, metadata);
					const role = getRole(p);
					const statusConfig = STATUS_MAP[status];
					const interruption = metadata?.speakerQueue.interruptions.find(
						(i) => i.participantId === p.identity,
					);

					return (
						<li
							key={p.identity}
							className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
						>
							<StatusIndicator status={statusConfig.indicator} size="sm" />
							<span className="flex-1 text-sm truncate">{p.name ?? p.identity}</span>
							{role === "facilitator" && (
								<Badge variant="subtle" colorScheme="primary" size="sm">
									F
								</Badge>
							)}
							{isFacilitator && status === "interrupting" && interruption && (
								<Button
									size="xs"
									variant="destructive"
									onClick={() =>
										endInterruptionMutation.mutate({
											roomId,
											participantId: p.identity,
										})
									}
								>
									終了
								</Button>
							)}
						</li>
					);
				})}
			</ul>
		</aside>
	);
}
