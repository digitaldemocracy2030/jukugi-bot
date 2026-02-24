import { useParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import {
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "../../../src/api/gen/breakoutDeliberationOSAPI";
import type { RoomMetadata } from "../../types/room-metadata";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

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

const STATUS_ICON: Record<ParticipantStatus, string> = {
	speaking: "🎤",
	interrupting: "⚡",
	queued: "✋",
	idle: "💤",
};

const STATUS_CLASS: Record<ParticipantStatus, string> = {
	speaking: "text-green-500",
	interrupting: "text-red-500",
	queued: "text-yellow-500",
	idle: "text-muted-foreground",
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
				<h2 className="text-sm font-semibold">参加者 ({participants.length})</h2>
			</div>

			{/* Facilitator controls */}
			{isFacilitator && (
				<div className="p-3 border-b flex flex-col gap-2">
					<p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
						ファシリテーター操作
					</p>
					<Button
						size="sm"
						variant="outline"
						onClick={() => nextSpeakerMutation.mutate({ roomId, data: {} })}
						className="w-full"
					>
						次の発言者
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => skipSpeakerMutation.mutate({ roomId })}
						className="w-full"
					>
						スキップ
					</Button>
				</div>
			)}

			{/* Participant list */}
			<ul className="flex-1 p-2 flex flex-col gap-1">
				{participants.map((p) => {
					const status = getStatus(p, metadata);
					const role = getRole(p);
					const interruption = metadata?.speakerQueue.interruptions.find(
						(i) => i.participantId === p.identity,
					);

					return (
						<li
							key={p.identity}
							className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
						>
							<span
								role="img"
								aria-label={status}
								className={`text-base leading-none ${STATUS_CLASS[status]}`}
							>
								{STATUS_ICON[status]}
							</span>
							<span className="flex-1 text-sm truncate">{p.name ?? p.identity}</span>
							{role === "facilitator" && (
								<Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
									F
								</Badge>
							)}
							{isFacilitator && status === "interrupting" && interruption && (
								<Button
									size="sm"
									variant="destructive"
									className="h-5 text-[10px] px-1 py-0 shrink-0"
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
