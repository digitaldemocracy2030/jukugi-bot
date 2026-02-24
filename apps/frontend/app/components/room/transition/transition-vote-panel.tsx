import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
		return (
			<Card className="border-green-200 bg-green-50">
				<CardContent className="pt-4">
					<p className="text-center text-green-700 font-medium">
						次のフェーズへの移行が決まりました
					</p>
				</CardContent>
			</Card>
		);
	}
	if (proposal.status === "rejected_by_admin") {
		return (
			<Card className="border-red-200 bg-red-50">
				<CardContent className="pt-4">
					<p className="text-center text-red-700">管理者により移行提案が却下されました</p>
				</CardContent>
			</Card>
		);
	}
	if (proposal.status === "expired") {
		return (
			<Card className="border-gray-200 bg-gray-50">
				<CardContent className="pt-4">
					<p className="text-center text-gray-600">投票期限が終了しました（現状維持）</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-blue-200">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm flex items-center justify-between">
					<span>次のフェーズへ移行しますか？</span>
					<Badge variant="outline">
						{proposal.proposedByRole === "admin" ? "管理者提案" : "参加者提案"}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex justify-between text-sm text-gray-600">
					<span>賛成: {proposal.yesCount}</span>
					<span>反対: {proposal.noCount}</span>
					<span>投票数: {proposal.totalVoted}</span>
				</div>

				<div className="space-y-1">
					<div className="h-2 w-full rounded-full bg-gray-200">
						<div
							className="h-full rounded-full bg-blue-500 transition-all"
							style={{ width: `${yesPercent}%` }}
						/>
					</div>
					<p className="text-xs text-gray-500 text-right">
						可決まで: {thresholdPercent}% 必要 (現在 {yesPercent}%)
					</p>
				</div>

				{remainingSec !== null && (
					<p className="text-xs text-center text-gray-500">残り {remainingSec} 秒</p>
				)}

				{!hasVoted ? (
					<div className="flex gap-2">
						<Button
							size="sm"
							className="flex-1"
							onClick={() => handleVote("yes")}
							disabled={isVoting}
						>
							賛成
						</Button>
						<Button
							size="sm"
							variant="outline"
							className="flex-1"
							onClick={() => handleVote("no")}
							disabled={isVoting}
						>
							反対
						</Button>
					</div>
				) : (
					<p className="text-xs text-center text-gray-500">投票済み</p>
				)}

				{isAdmin && (
					<Button
						size="sm"
						variant="destructive"
						className="w-full"
						onClick={handleReject}
						disabled={isRejecting}
					>
						提案を却下
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
