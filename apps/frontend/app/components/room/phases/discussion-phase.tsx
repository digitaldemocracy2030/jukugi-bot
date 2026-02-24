import { useLocalParticipant } from "@livekit/components-react";
import {
	useDeleteApiRoomsRoomIdQueueLeave,
	usePostApiRoomsRoomIdInterrupt,
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdQueueJoin,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import { useSpeakingCheck } from "../../../hooks/use-speaking-check";
import type { RoomMetadata } from "../../../types/room-metadata";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../../ui/alert-dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ParticipantSidebar } from "../participant-sidebar";
import { SpeakerTimer } from "../speaker-timer";
import { ProposeTransitionButton } from "../transition/propose-transition-button";
import { TransitionVotePanel } from "../transition/transition-vote-panel";
import { VideoStage } from "../video-stage";

const DEFAULT_SPEAKING_SECONDS = 120;

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
	// The current speaker may have already been removed from the queue, so
	// search both the queue and interruptions list before falling back to their ID.
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
							speakingUntil={currentSpeakerEntry.speakingUntil}
							totalSeconds={DEFAULT_SPEAKING_SECONDS}
							speakerName={
								isCurrentSpeaker ? `${currentSpeakerName}（あなた）` : currentSpeakerName
							}
						/>
					) : (
						<p className="text-muted-foreground text-sm">現在の発言者はいません</p>
					)}

					{/* Interruptions */}
					{speakerQueue.interruptions.length > 0 && (
						<div className="flex flex-wrap gap-2 justify-center">
							{speakerQueue.interruptions.map((i) => (
								<Badge key={i.participantId} variant="destructive" className="gap-1">
									⚡ {i.displayName}
								</Badge>
							))}
						</div>
					)}
				</section>

				{/* Action buttons */}
				<section className="flex gap-3 justify-center flex-wrap">
					{/* Raise hand / cancel */}
					<Button
						variant={isInQueue ? "secondary" : "default"}
						disabled={!featureFlags.canSpeak || isCurrentSpeaker || isQueueLoading}
						onClick={handleQueueToggle}
					>
						{isQueueLoading ? "処理中..." : isInQueue ? "挙手取消" : "挙手"}
					</Button>

					{/* Interrupt with confirmation */}
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								disabled={
									!featureFlags.canInterrupt ||
									isInterrupting ||
									maxInterruptionsReached ||
									isInterruptLoading
								}
							>
								{isInterruptLoading ? "処理中..." : "割り込み"}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>割り込み確認</AlertDialogTitle>
								<AlertDialogDescription>
									現在の発言に割り込みますか？割り込みは短時間のみ許可されます。
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>キャンセル</AlertDialogCancel>
								<AlertDialogAction onClick={handleInterrupt}>割り込む</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</section>

				{/* Speaking queue */}
				<section>
					<h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
						発言待ち ({speakerQueue.queue.length})
					</h3>
					{speakerQueue.queue.length === 0 ? (
						<p className="text-sm text-muted-foreground">発言待ちの参加者はいません</p>
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
						<h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
							ファシリテーター操作
						</h3>
						<div className="flex gap-2 flex-wrap">
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
						</div>
					</section>
				)}

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
