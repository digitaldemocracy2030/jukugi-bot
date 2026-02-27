import { useLocalParticipant } from "@livekit/components-react";
import { useState } from "react";
import {
	useGetApiRoomsRoomIdPhases,
	useGetApiRoomsRoomIdPhasesPhaseIdVotesResults,
	usePostApiRoomsRoomIdPhasesPhaseIdVotes,
} from "../../../../src/api/gen/breakoutDeliberationOSAPI";
import type { VotingPhaseConfig } from "../../../../src/api/models/votingPhaseConfig";
import type { RoomMetadata } from "../../../types/room-metadata";
import {
	Alert,
	Badge,
	Button,
	Divider,
	Progress,
	RadioGroup,
	Stack,
	Typography,
} from "../../design-system";
import { ProposeTransitionButton } from "../transition/propose-transition-button";
import { TransitionVotePanel } from "../transition/transition-vote-panel";

type VotingPhaseProps = {
	metadata: RoomMetadata | null;
	roomId: string;
};

export function VotingPhase({ metadata, roomId }: VotingPhaseProps) {
	const { localParticipant } = useLocalParticipant();

	const participantMeta = (() => {
		try {
			return localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
		} catch {
			return {};
		}
	})();
	const isFacilitator = participantMeta.role === "facilitator";

	const canVote = metadata?.featureFlags?.canVote ?? true;
	const currentPhaseId = metadata?.currentPhaseId ?? null;

	// Fetch phase config to get question and options
	const { data: phasesData } = useGetApiRoomsRoomIdPhases(roomId, {
		query: { staleTime: 30_000 },
	});
	const phases = phasesData?.status === 200 ? phasesData.data : [];
	const currentPhase = phases.find((p) => p.id === currentPhaseId);
	const config = (
		currentPhase?.type === "voting" ? currentPhase.config : null
	) as VotingPhaseConfig | null;

	const question = config?.question ?? "";
	const options = config?.options ?? [];

	// Local voting state
	const [selectedOption, setSelectedOption] = useState<string>("");
	const [hasVoted, setHasVoted] = useState(false);

	// Submit vote mutation
	const submitVoteMutation = usePostApiRoomsRoomIdPhasesPhaseIdVotes();

	// Fetch results (only after voting, with polling)
	const { data: resultsData } = useGetApiRoomsRoomIdPhasesPhaseIdVotesResults(
		roomId,
		currentPhaseId ?? "",
		{
			query: {
				enabled: hasVoted && !!currentPhaseId,
				refetchInterval: 3000,
				staleTime: 2000,
			},
		},
	);
	const results = resultsData?.status === 200 ? resultsData.data : null;

	const handleVote = () => {
		if (!currentPhaseId || !selectedOption) return;
		submitVoteMutation.mutate(
			{
				roomId,
				phaseId: currentPhaseId,
				data: { selectedOption },
			},
			{
				onSuccess: () => {
					setHasVoted(true);
				},
				onError: (error: unknown) => {
					// 409 means already voted
					const status = (error as { response?: { status?: number } })?.response?.status;
					if (status === 409) {
						setHasVoted(true);
					}
				},
			},
		);
	};

	return (
		<div className="flex flex-col h-full overflow-y-auto">
			{/* Header */}
			<div className="px-4 py-3">
				<Stack direction="horizontal" gap={2} align="center">
					<Badge variant="solid" colorScheme="primary">
						投票
					</Badge>
					<Typography variant="h4">{currentPhase?.title ?? "投票フェーズ"}</Typography>
				</Stack>
			</div>

			<Divider />

			{/* Question */}
			<div className="px-4 py-4">
				{question ? (
					<div className="rounded-lg border border-border bg-muted/30 p-4">
						<Typography variant="h3" align="center">
							{question}
						</Typography>
					</div>
				) : (
					<Typography variant="body" color="muted" align="center">
						質問が設定されていません
					</Typography>
				)}
			</div>

			{/* Voting form or results */}
			<div className="px-4 py-3 flex-1">
				{!canVote ? (
					<Alert variant="info">このフェーズでは投票は無効になっています</Alert>
				) : !hasVoted ? (
					<Stack direction="vertical" gap={4}>
						{options.length > 0 ? (
							<>
								<Typography variant="caption" className="uppercase tracking-wide">
									選択肢
								</Typography>
								<RadioGroup
									options={options.map((opt) => ({
										value: opt,
										label: opt,
									}))}
									value={selectedOption}
									onValueChange={setSelectedOption}
									orientation="vertical"
								/>
								<Button
									variant="primary"
									size="lg"
									fullWidth
									disabled={!selectedOption}
									loading={submitVoteMutation.isPending}
									onClick={handleVote}
								>
									投票する
								</Button>
							</>
						) : (
							<Typography variant="body" color="muted" align="center">
								選択肢が設定されていません
							</Typography>
						)}
					</Stack>
				) : (
					<Stack direction="vertical" gap={4}>
						<Alert variant="success">投票が完了しました</Alert>

						{/* Results */}
						{results && (
							<Stack direction="vertical" gap={3}>
								<Typography variant="caption" className="uppercase tracking-wide">
									投票結果
								</Typography>
								{options.map((opt) => {
									const count = results.results[opt] ?? 0;
									const pct =
										results.totalVotes > 0 ? Math.round((count / results.totalVotes) * 100) : 0;
									return (
										<Stack key={opt} direction="vertical" gap={1}>
											<Stack direction="horizontal" justify="between" align="center">
												<Typography variant="body-sm">
													{opt}
													{opt === selectedOption && (
														<span className="ml-1 text-xs text-primary">（あなたの投票）</span>
													)}
												</Typography>
												<Typography variant="body-sm" color="muted">
													{count} 票 ({pct}%)
												</Typography>
											</Stack>
											<Progress value={pct} max={100} size="md" variant="default" />
										</Stack>
									);
								})}
								<Typography variant="body-sm" color="muted" align="center">
									合計 {results.totalVotes} 票
								</Typography>
							</Stack>
						)}
					</Stack>
				)}
			</div>

			{/* Facilitator info */}
			{isFacilitator && hasVoted && results && (
				<>
					<Divider />
					<div className="px-4 py-3">
						<Typography variant="caption" className="uppercase tracking-wide">
							ファシリテーター情報
						</Typography>
						<Typography variant="body-sm" color="muted">
							投票数: {results.totalVotes}
						</Typography>
					</div>
				</>
			)}

			{/* Phase transition */}
			<Divider />
			<div className="px-4 py-3">
				{metadata?.transitionProposal ? (
					<TransitionVotePanel
						roomId={roomId}
						proposal={metadata.transitionProposal}
						isAdmin={isFacilitator}
					/>
				) : (
					<ProposeTransitionButton roomId={roomId} isAdmin={isFacilitator} disabled={false} />
				)}
			</div>
		</div>
	);
}
