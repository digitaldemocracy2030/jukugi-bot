import { useParticipants } from "@livekit/components-react";
import { type Participant, Track } from "livekit-client";
import {
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "../../../src/api/gen/breakoutDeliberationOSAPI";
import type { RoomMetadata } from "../../types/room-metadata";
import { Button, Stack, Typography } from "../design-system";
import type { ParticipantData } from "../design-system/meeting/participant-list";
import { ParticipantListItem } from "../design-system/meeting/participant-list-item";

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

type ParticipantRole = "facilitator" | "participant";

function getRole(participant: Participant): ParticipantRole {
	try {
		const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
		return meta.role === "facilitator" ? "facilitator" : "participant";
	} catch {
		return "participant";
	}
}

function isMuted(participant: Participant): boolean {
	const micPub = participant.getTrackPublication(Track.Source.Microphone);
	return !micPub || micPub.isMuted;
}

type ParticipantSidebarProps = {
	metadata: RoomMetadata | null;
	roomId: string;
	isFacilitator: boolean;
	currentParticipantId?: string;
};

export function ParticipantSidebar({
	metadata,
	roomId,
	isFacilitator,
	currentParticipantId,
}: ParticipantSidebarProps) {
	const participants = useParticipants();

	const nextSpeakerMutation = usePostApiRoomsRoomIdQueueNext();
	const skipSpeakerMutation = usePostApiRoomsRoomIdQueueSkip();
	const endInterruptionMutation = usePostApiRoomsRoomIdInterruptParticipantIdEnd();

	const participantData: ParticipantData[] = participants.map((p) => ({
		id: p.identity,
		displayName: p.name ?? p.identity,
		role: getRole(p),
		status: getStatus(p, metadata),
		isMuted: isMuted(p),
	}));

	return (
		<aside className="flex flex-col h-full border-l bg-card">
			{/* Header */}
			<div className="px-3 py-2.5 border-b">
				<Typography variant="label">参加者 ({participants.length})</Typography>
			</div>

			{/* Facilitator controls */}
			{isFacilitator && (
				<div className="p-3 border-b">
					<Stack direction="vertical" gap={2}>
						<Typography variant="caption" className="uppercase tracking-wide">
							ファシリテーター操作
						</Typography>
						<Stack direction="horizontal" gap={2}>
							<Button
								size="sm"
								variant="outline"
								onClick={() => nextSpeakerMutation.mutate({ roomId, data: {} })}
							>
								次の発言者
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => skipSpeakerMutation.mutate({ roomId })}
							>
								スキップ
							</Button>
						</Stack>
					</Stack>
				</div>
			)}

			{/* Participant list using design-system component */}
			<div className="flex-1 overflow-y-auto p-1">
				{participantData.map((p) => {
					const interruption = metadata?.speakerQueue.interruptions.find(
						(i) => i.participantId === p.id,
					);

					return (
						<ParticipantListItem
							key={p.id}
							displayName={p.displayName}
							role={p.role}
							status={p.status}
							isMuted={p.isMuted}
							isMe={p.id === currentParticipantId}
							actions={
								isFacilitator && p.status === "interrupting" && interruption ? (
									<Button
										size="xs"
										variant="destructive"
										onClick={() =>
											endInterruptionMutation.mutate({
												roomId,
												participantId: p.id,
											})
										}
									>
										終了
									</Button>
								) : undefined
							}
						/>
					);
				})}
			</div>
		</aside>
	);
}
