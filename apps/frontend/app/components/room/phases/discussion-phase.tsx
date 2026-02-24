import { useLocalParticipant } from "@livekit/components-react";
import { useEffect, useRef, useState } from "react";
import {
	useDeleteApiRoomsRoomIdQueueLeave,
	usePostApiRoomsRoomIdInterrupt,
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdQueueJoin,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import { useSpeakingCheck } from "../../../hooks/use-speaking-check";
import { useTranscription } from "../../../hooks/use-transcription";
import type { RoomMetadata } from "../../../types/room-metadata";
import { Badge, Button, ConfirmDialog, SpeakerTimer, Stack, Typography } from "../../design-system";
import { ParticipantSidebar } from "../participant-sidebar";
import { TranscriptionPanel } from "../transcription-panel";
import { ProposeTransitionButton } from "../transition/propose-transition-button";
import { TransitionVotePanel } from "../transition/transition-vote-panel";
import { VideoStage } from "../video-stage";

const DEFAULT_SPEAKING_SECONDS = 120;

/** Compute remaining seconds from a speakingUntil timestamp, updating every 500ms. */
function useCountdown(speakingUntil: number | undefined): number {
	const [remaining, setRemaining] = useState(() =>
		Math.max(0, Math.ceil(((speakingUntil ?? 0) - Date.now()) / 1000)),
	);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!speakingUntil) {
			setRemaining(0);
			return;
		}
		setRemaining(Math.max(0, Math.ceil((speakingUntil - Date.now()) / 1000)));
		intervalRef.current = setInterval(() => {
			const r = Math.max(0, Math.ceil((speakingUntil - Date.now()) / 1000));
			setRemaining(r);
			if (r === 0 && intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		}, 500);
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [speakingUntil]);

	return remaining;
}

type DiscussionPhaseProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

export function DiscussionPhase({ metadata, roomId }: DiscussionPhaseProps) {
	const { localParticipant } = useLocalParticipant();
	const myId = localParticipant.identity;

	const joinQueueMutation = usePostApiRoomsRoomIdQueueJoin();
	const leaveQueueMutation = useDeleteApiRoomsRoomIdQueueLeave();
	const interruptMutation = usePostApiRoomsRoomIdInterrupt();
	const nextSpeakerMutation = usePostApiRoomsRoomIdQueueNext();
	const skipSpeakerMutation = usePostApiRoomsRoomIdQueueSkip();
	const endInterruptionMutation = usePostApiRoomsRoomIdInterruptParticipantIdEnd();

	const transcriptionEntries = useTranscription();
	const [interruptDialogOpen, setInterruptDialogOpen] = useState(false);

	const participantMeta = (() => {
		try {
			return localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
		} catch {
			return {};
		}
	})();
	const isFacilitator = participantMeta.role === "facilitator";
	const myDisplayName: string = participantMeta.displayName ?? myId;

	const speakerQueue = metadata?.speakerQueue ?? {
		currentSpeaker: null,
		queue: [],
		interruptions: [],
	};
	const featureFlags = metadata?.featureFlags ?? {
		canSpeak: false,
		canInterrupt: false,
		canVote: false,
	};

	const isInQueue = speakerQueue.queue.some((q) => q.participantId === myId);
	const isCurrentSpeaker = speakerQueue.currentSpeaker?.participantId === myId;
	const isInterrupting = speakerQueue.interruptions.some((i) => i.participantId === myId);
	const maxInterruptionsReached = speakerQueue.interruptions.length >= 3;

	const isQueueLoading = joinQueueMutation.isPending || leaveQueueMutation.isPending;
	const isInterruptLoading = interruptMutation.isPending;

	useSpeakingCheck(roomId, featureFlags.canSpeak);

	const currentSpeakerEntry = speakerQueue.currentSpeaker;
	const remainingSeconds = useCountdown(currentSpeakerEntry?.speakingUntil);
	const currentSpeakerName = (() => {
		if (!currentSpeakerEntry) return "";
		const id = currentSpeakerEntry.participantId;
		return (
			speakerQueue.queue.find((q) => q.participantId === id)?.displayName ??
			speakerQueue.interruptions.find((i) => i.participantId === id)?.displayName ??
			id
		);
	})();

	const handleQueueToggle = () => {
		if (isInQueue) {
			leaveQueueMutation.mutate({ roomId, data: {} });
		} else {
			joinQueueMutation.mutate({
				roomId,
				data: { displayName: myDisplayName },
			});
		}
	};

	const handleInterrupt = () => {
		interruptMutation.mutate({
			roomId,
			data: { displayName: myDisplayName },
		});
		setInterruptDialogOpen(false);
	};

	return (
		<div className="flex h-full">
			{/* Main content */}
			<div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
				{/* Video stage */}
				<VideoStage metadata={metadata} micAllowed={isCurrentSpeaker || isInterrupting} />

				{/* Active speaker / timer */}
				<section className="flex flex-col items-center gap-3 py-4">
					{currentSpeakerEntry ? (
						<SpeakerTimer
							remainingSeconds={remainingSeconds}
							totalSeconds={DEFAULT_SPEAKING_SECONDS}
							speakerName={
								isCurrentSpeaker ? `${currentSpeakerName}（あなた）` : currentSpeakerName
							}
						/>
					) : (
						<Typography variant="body" color="muted">
							現在の発言者はいません
						</Typography>
					)}

					{/* Interruptions */}
					{speakerQueue.interruptions.length > 0 && (
						<Stack direction="horizontal" gap={2} wrap justify="center">
							{speakerQueue.interruptions.map((i) => (
								<Badge key={i.participantId} variant="solid" colorScheme="destructive">
									{i.displayName}
								</Badge>
							))}
						</Stack>
					)}
				</section>

				{/* Action buttons */}
				<Stack direction="horizontal" gap={3} justify="center" wrap>
					{/* Raise hand / cancel */}
					<Button
						variant={isInQueue ? "secondary" : "primary"}
						disabled={!featureFlags.canSpeak || isCurrentSpeaker || isQueueLoading}
						loading={isQueueLoading}
						onClick={handleQueueToggle}
					>
						{isInQueue ? "挙手取消" : "挙手"}
					</Button>

					{/* Interrupt with confirmation */}
					<Button
						variant="outline"
						disabled={
							!featureFlags.canInterrupt ||
							isInterrupting ||
							maxInterruptionsReached ||
							isInterruptLoading
						}
						loading={isInterruptLoading}
						onClick={() => setInterruptDialogOpen(true)}
					>
						割り込み
					</Button>
					<ConfirmDialog
						open={interruptDialogOpen}
						onOpenChange={setInterruptDialogOpen}
						title="割り込み確認"
						description="現在の発言に割り込みますか？割り込みは短時間のみ許可されます。"
						confirmLabel="割り込む"
						cancelLabel="キャンセル"
						onConfirm={handleInterrupt}
					/>
				</Stack>

				{/* Speaking queue */}
				<section>
					<Typography variant="caption" weight="semibold" className="mb-2 uppercase tracking-wide">
						発言待ち ({speakerQueue.queue.length})
					</Typography>
					{speakerQueue.queue.length === 0 ? (
						<Typography variant="body" color="muted">
							発言待ちの参加者はいません
						</Typography>
					) : (
						<ol className="flex flex-col gap-1">
							{speakerQueue.queue.map((entry, index) => {
								const isMe = entry.participantId === myId;
								return (
									<li
										key={entry.participantId}
										className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
											isMe ? "bg-primary/10 font-semibold" : "bg-muted/40"
										}`}
									>
										<span className="text-muted-foreground w-5 text-right shrink-0">
											{index + 1}.
										</span>
										<span className="flex-1 truncate">
											{entry.displayName}
											{isMe && <span className="ml-1 text-xs text-primary">（あなた）</span>}
										</span>
									</li>
								);
							})}
						</ol>
					)}
				</section>

				{/* Facilitator-only queue management */}
				{isFacilitator && (
					<section className="border-t pt-4">
						<Typography
							variant="caption"
							weight="semibold"
							className="mb-2 uppercase tracking-wide"
						>
							ファシリテーター操作
						</Typography>
						<Stack direction="horizontal" gap={2} wrap>
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
							{speakerQueue.interruptions.map((i) => (
								<Button
									key={i.participantId}
									size="sm"
									variant="destructive"
									onClick={() =>
										endInterruptionMutation.mutate({
											roomId,
											participantId: i.participantId,
										})
									}
								>
									割り込み終了: {i.displayName}
								</Button>
							))}
						</Stack>
					</section>
				)}

				{/* Transcription */}
				<TranscriptionPanel entries={transcriptionEntries} />

				{/* Phase transition proposal */}
				<section className="border-t pt-4 space-y-3">
					{metadata?.transitionProposal ? (
						<TransitionVotePanel
							roomId={roomId}
							proposal={metadata.transitionProposal}
							participantId={myId}
							isAdmin={isFacilitator}
						/>
					) : (
						<ProposeTransitionButton
							roomId={roomId}
							participantId={myId}
							isAdmin={isFacilitator}
							disabled={false}
						/>
					)}
				</section>
			</div>

			{/* Sidebar */}
			<ParticipantSidebar metadata={metadata} roomId={roomId} isFacilitator={isFacilitator} />
		</div>
	);
}
