import { useEffect, useState } from "react";
import { Alert, Badge, Button, Stack, Typography } from "~/components/design-system";
import { clearStoredVote, getStoredVote, useTransitionVote } from "~/hooks/use-transition-vote";
import type { RoomMetadata } from "~/types/room-metadata";

interface TransitionVotePanelProps {
	roomId: string;
	proposal: NonNullable<RoomMetadata["transitionProposal"]>;
	isAdmin: boolean;
}

export function TransitionVotePanel({ roomId, proposal, isAdmin }: TransitionVotePanelProps) {
	const { vote, reject, isVoting, isRejecting } = useTransitionVote(roomId);
	const [hasVoted, setHasVoted] = useState(() => getStoredVote(proposal.id) !== null);
	const [myChoice, setMyChoice] = useState<"yes" | "no" | null>(() => getStoredVote(proposal.id));
	const [remainingSec, setRemainingSec] = useState<number | null>(null);
	const [dismissedProposalId, setDismissedProposalId] = useState<string | null>(null);

	// Countdown timer
	useEffect(() => {
		if (!proposal.expiresAt || proposal.status !== "open") return;
		const update = () => {
			const diff = Math.max(
				0,
				Math.floor((new Date(proposal.expiresAt as string).getTime() - Date.now()) / 1000),
			);
			setRemainingSec(diff);
		};
		update();
		const timer = setInterval(update, 1000);
		return () => clearInterval(timer);
	}, [proposal.expiresAt, proposal.status]);

	// Terminal state handling: clear localStorage + auto-dismiss after 3s
	const isTerminal =
		proposal.status === "approved" ||
		proposal.status === "rejected_by_admin" ||
		proposal.status === "expired";

	useEffect(() => {
		if (!isTerminal) return;
		clearStoredVote(proposal.id);
		const timeout = setTimeout(() => {
			setDismissedProposalId(proposal.id);
		}, 3000);
		return () => clearTimeout(timeout);
	}, [isTerminal, proposal.id]);

	// If dismissed, hide panel
	if (dismissedProposalId === proposal.id) return null;

	const handleVote = (choice: "yes" | "no") => {
		vote(proposal.id, choice);
		setHasVoted(true);
		setMyChoice(choice);
	};

	const handleReject = () => {
		reject(proposal.id);
	};

	const thresholdPercent = Math.round(proposal.requiredThreshold * 100);
	const yesPercent =
		proposal.totalVoted > 0 ? Math.round((proposal.yesCount / proposal.totalVoted) * 100) : 0;

	// ── Terminal states ──

	if (proposal.status === "approved") {
		return (
			<div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 p-4">
				<Stack direction="vertical" gap={2} align="center">
					<Typography variant="label" className="text-green-700 dark:text-green-300">
						移行が承認されました
					</Typography>
					<Typography variant="body-sm" color="muted">
						次のフェーズへ移動します...
					</Typography>
				</Stack>
			</div>
		);
	}

	if (proposal.status === "rejected_by_admin") {
		return <Alert variant="destructive">管理者により却下されました</Alert>;
	}

	if (proposal.status === "expired") {
		return (
			<Alert variant="default">
				投票期限が終了しました（賛成: {proposal.yesCount} / 反対: {proposal.noCount}）
			</Alert>
		);
	}

	// Local expiry check
	const isLocallyExpired = remainingSec !== null && remainingSec <= 0;
	if (isLocallyExpired) {
		return (
			<Alert variant="default">
				投票期限が終了しました（賛成: {proposal.yesCount} / 反対: {proposal.noCount}）
			</Alert>
		);
	}

	// ── Open proposal ──

	return (
		<div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-4">
			<Stack direction="vertical" gap={3}>
				<Stack direction="horizontal" align="center" justify="between">
					<Typography variant="label">次のフェーズへ移行しますか？</Typography>
					<Badge variant="outline" colorScheme="info">
						{proposal.proposedByRole === "admin" ? "管理者提案" : "参加者提案"}
					</Badge>
				</Stack>

				{/* Vote bars */}
				<Stack direction="vertical" gap={2}>
					{/* Yes bar */}
					<Stack direction="vertical" gap={1}>
						<Stack direction="horizontal" justify="between" align="center">
							<Typography variant="body-sm">賛成</Typography>
							<Typography variant="body-sm" color="muted">
								{proposal.yesCount}票
							</Typography>
						</Stack>
						<div className="relative h-3 w-full rounded-full bg-muted/30">
							<div
								className="h-full rounded-full bg-green-500 transition-all"
								style={{
									width: `${proposal.totalVoted > 0 ? Math.round((proposal.yesCount / proposal.totalVoted) * 100) : 0}%`,
								}}
							/>
							{/* Threshold line */}
							<div
								className="absolute top-0 h-full w-0.5 bg-foreground/50"
								style={{ left: `${thresholdPercent}%` }}
							/>
						</div>
					</Stack>

					{/* No bar */}
					<Stack direction="vertical" gap={1}>
						<Stack direction="horizontal" justify="between" align="center">
							<Typography variant="body-sm">反対</Typography>
							<Typography variant="body-sm" color="muted">
								{proposal.noCount}票
							</Typography>
						</Stack>
						<div className="relative h-3 w-full rounded-full bg-muted/30">
							<div
								className="h-full rounded-full bg-red-400 transition-all"
								style={{
									width: `${proposal.totalVoted > 0 ? Math.round((proposal.noCount / proposal.totalVoted) * 100) : 0}%`,
								}}
							/>
						</div>
					</Stack>

					<Typography variant="caption" align="right">
						可決ライン: {thresholdPercent}% (現在 {yesPercent}%)
					</Typography>
				</Stack>

				{remainingSec !== null && (
					<Typography variant="caption" align="center">
						残り {remainingSec} 秒
					</Typography>
				)}

				{!hasVoted ? (
					<Stack direction="horizontal" gap={2}>
						<Button
							size="sm"
							variant="primary"
							fullWidth
							onClick={() => handleVote("yes")}
							loading={isVoting}
						>
							賛成
						</Button>
						<Button
							size="sm"
							variant="outline"
							fullWidth
							onClick={() => handleVote("no")}
							loading={isVoting}
						>
							反対
						</Button>
					</Stack>
				) : (
					<div className="flex justify-center">
						<Badge variant="solid" colorScheme={myChoice === "yes" ? "success" : "destructive"}>
							{myChoice === "yes" ? "賛成に投票済み" : "反対に投票済み"}
						</Badge>
					</div>
				)}

				{isAdmin && (
					<Button
						size="sm"
						variant="destructive"
						fullWidth
						onClick={handleReject}
						loading={isRejecting}
					>
						提案を却下
					</Button>
				)}
			</Stack>
		</div>
	);
}
