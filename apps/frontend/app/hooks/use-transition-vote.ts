import axios from "axios";
import { useToast } from "~/components/design-system";
import {
	useDeleteApiRoomsRoomIdTransitionProposalsProposalId,
	usePostApiRoomsRoomIdTransitionProposals,
	usePostApiRoomsRoomIdTransitionProposalsProposalIdVotes,
} from "../../src/api/gen/breakoutDeliberationOSAPI";

// ── localStorage helpers ──

const VOTE_KEY_PREFIX = "osodp_vote_";

export function getStoredVote(proposalId: string): "yes" | "no" | null {
	if (typeof window === "undefined") return null;
	const val = localStorage.getItem(`${VOTE_KEY_PREFIX}${proposalId}`);
	return val === "yes" || val === "no" ? val : null;
}

function storeVote(proposalId: string, choice: "yes" | "no") {
	if (typeof window === "undefined") return;
	localStorage.setItem(`${VOTE_KEY_PREFIX}${proposalId}`, choice);
}

export function clearStoredVote(proposalId: string) {
	if (typeof window === "undefined") return;
	localStorage.removeItem(`${VOTE_KEY_PREFIX}${proposalId}`);
}

// ── Error helpers ──

function extractStatus(error: unknown): number | undefined {
	if (axios.isAxiosError(error)) return error.response?.status;
	return undefined;
}

function extractRetryAfter(error: unknown): number | undefined {
	if (axios.isAxiosError(error)) {
		const data = error.response?.data as { retryAfter?: number } | undefined;
		return data?.retryAfter;
	}
	return undefined;
}

// ── Hook ──

export function useTransitionVote(roomId: string) {
	const { toast } = useToast();

	const proposeMutation = usePostApiRoomsRoomIdTransitionProposals({
		mutation: {
			onError: (error: unknown) => {
				const status = extractStatus(error);
				if (status === 425) {
					const retryAfter = extractRetryAfter(error);
					toast({
						title: `あと${retryAfter ?? "数"}秒お待ちください`,
						variant: "warning",
					});
				} else if (status === 409) {
					toast({ title: "既に提案済みです", variant: "warning" });
				} else {
					toast({ title: "提案に失敗しました", variant: "destructive" });
				}
			},
		},
	});

	const voteMutation = usePostApiRoomsRoomIdTransitionProposalsProposalIdVotes({
		mutation: {
			onError: (error: unknown) => {
				const status = extractStatus(error);
				if (status === 409) {
					toast({ title: "既に投票済みです", variant: "warning" });
				} else {
					toast({ title: "投票に失敗しました", variant: "destructive" });
				}
			},
		},
	});

	const rejectMutation = useDeleteApiRoomsRoomIdTransitionProposalsProposalId({
		mutation: {
			onError: () => {
				toast({ title: "却下に失敗しました", variant: "destructive" });
			},
		},
	});

	const propose = (toPhaseId?: string) => {
		proposeMutation.mutate({ roomId, data: { toPhaseId } });
	};

	const vote = (proposalId: string, choice: "yes" | "no") => {
		storeVote(proposalId, choice);
		voteMutation.mutate({ roomId, proposalId, data: { choice } });
	};

	const reject = (proposalId: string) => {
		rejectMutation.mutate({ roomId, proposalId });
	};

	return {
		propose,
		vote,
		reject,
		isProposing: proposeMutation.isPending,
		isVoting: voteMutation.isPending,
		isRejecting: rejectMutation.isPending,
	};
}
