import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

interface TransitionProposalResponse {
	id: string;
	fromPhaseId: string;
	toPhaseId: string | null;
	proposedByRole: "admin" | "participant";
	status: "open" | "approved" | "rejected_by_admin" | "expired" | "cancelled";
	yesCount: number;
	noCount: number;
	totalVoted: number;
	requiredThreshold: number;
	expiresAt: string | null;
	createdAt: string;
}

export function useTransitionVote(roomId: string, adminKey?: string) {
	const [isProposing, setIsProposing] = useState(false);
	const [isVoting, setIsVoting] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const propose = async (participantId: string, toPhaseId?: string) => {
		setIsProposing(true);
		try {
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (adminKey) headers["X-Admin-Key"] = adminKey;
			const res = await fetch(`${API_BASE}/api/rooms/${roomId}/transition-proposals`, {
				method: "POST",
				headers,
				body: JSON.stringify({ participantId, toPhaseId }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw { status: res.status, ...err };
			}
			return (await res.json()) as TransitionProposalResponse;
		} finally {
			setIsProposing(false);
		}
	};

	const vote = async (proposalId: string, participantId: string, choice: "yes" | "no") => {
		setIsVoting(true);
		try {
			const res = await fetch(
				`${API_BASE}/api/rooms/${roomId}/transition-proposals/${proposalId}/votes`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ participantId, choice }),
				},
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw { status: res.status, ...err };
			}
			return (await res.json()) as TransitionProposalResponse;
		} finally {
			setIsVoting(false);
		}
	};

	const reject = async (proposalId: string) => {
		setIsRejecting(true);
		try {
			const headers: Record<string, string> = {};
			if (adminKey) headers["X-Admin-Key"] = adminKey;
			const res = await fetch(
				`${API_BASE}/api/rooms/${roomId}/transition-proposals/${proposalId}`,
				{ method: "DELETE", headers },
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw { status: res.status, ...err };
			}
		} finally {
			setIsRejecting(false);
		}
	};

	return { propose, vote, reject, isProposing, isVoting, isRejecting };
}
