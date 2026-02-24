import { useEffect, useState } from "react";
import { Alert, Badge, Button, Progress, Stack, Typography } from "~/components/design-system";
import { useTransitionVote } from "~/hooks/use-transition-vote";
import type { RoomMetadata } from "~/types/room-metadata";

interface TransitionVotePanelProps {
	roomId: string;
	proposal: NonNullable<RoomMetadata["transitionProposal"]>;
	participantId: string;
	isAdmin: boolean;
	adminKey?: string;
}

export function TransitionVotePanel({
	roomId,
	proposal,
	participantId,
	isAdmin,
	adminKey,
}: TransitionVotePanelProps) {
	const { vote, reject, isVoting, isRejecting } = useTransitionVote(roomId, adminKey);
	const [hasVoted, setHasVoted] = useState(false);
	const [remainingSec, setRemainingSec] = useState<number | null>(null);

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

	const handleVote = async (choice: "yes" | "no") => {
		try {
			await vote(proposal.id, participantId, choice);
			setHasVoted(true);
		} catch (e: unknown) {
			if ((e as { status?: number })?.status === 409) setHasVoted(true);
		}
	};

	const handleReject = async () => {
		try {
			await reject(proposal.id);
		} catch {
			// rejection failure is non-fatal
		}
	};

	const yesPercent =
		proposal.totalVoted > 0 ? Math.round((proposal.yesCount / proposal.totalVoted) * 100) : 0;
	const thresholdPercent = Math.round(proposal.requiredThreshold * 100);

	if (proposal.status === "approved") {
		return <Alert variant="success">次のフェーズへの移行が決まりました</Alert>;
	}
	if (proposal.status === "rejected_by_admin") {
		return <Alert variant="destructive">管理者により移行提案が却下されました</Alert>;
	}
	if (proposal.status === "expired") {
		return <Alert variant="default">投票期限が終了しました（現状維持）</Alert>;
	}

	return (
		<div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-4">
			<Stack direction="vertical" gap={3}>
				<Stack direction="horizontal" align="center" justify="between">
					<Typography variant="label">次のフェーズへ移行しますか？</Typography>
					<Badge variant="outline" colorScheme="info">
						{proposal.proposedByRole === "admin" ? "管理者提案" : "参加者提案"}
					</Badge>
				</Stack>

				<Stack direction="horizontal" justify="between">
					<Typography variant="body-sm" color="muted">
						賛成: {proposal.yesCount}
					</Typography>
					<Typography variant="body-sm" color="muted">
						反対: {proposal.noCount}
					</Typography>
					<Typography variant="body-sm" color="muted">
						投票数: {proposal.totalVoted}
					</Typography>
				</Stack>

				<Stack direction="vertical" gap={1}>
					<Progress value={yesPercent} variant="default" size="sm" />
					<Typography variant="caption" align="right">
						可決まで: {thresholdPercent}% 必要 (現在 {yesPercent}%)
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
					<Typography variant="caption" align="center">
						投票済み
					</Typography>
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
