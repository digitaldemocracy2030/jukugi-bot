import { Button } from "~/components/ui/button";
import { useTransitionVote } from "~/hooks/use-transition-vote";

interface ProposeTransitionButtonProps {
	roomId: string;
	participantId: string;
	isAdmin: boolean;
	adminKey?: string;
	disabled: boolean;
	featureFlags?: {
		participantCanProposeTransition?: boolean;
	};
}

export function ProposeTransitionButton({
	roomId,
	participantId,
	isAdmin,
	adminKey,
	disabled,
	featureFlags,
}: ProposeTransitionButtonProps) {
	const { propose, isProposing } = useTransitionVote(roomId, adminKey);

	if (!isAdmin && !featureFlags?.participantCanProposeTransition) return null;

	const handlePropose = async () => {
		try {
			await propose(participantId);
		} catch (e: unknown) {
			console.error("Proposal failed:", e);
		}
	};

	return (
		<Button
			size="sm"
			variant="outline"
			onClick={handlePropose}
			disabled={disabled || isProposing}
			className="text-xs"
		>
			{isProposing ? "提案中..." : "次のフェーズへ移行を提案"}
		</Button>
	);
}
