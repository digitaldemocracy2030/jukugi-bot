import { Button } from "~/components/design-system";
import { useTransitionVote } from "~/hooks/use-transition-vote";

interface ProposeTransitionButtonProps {
	roomId: string;
	isAdmin: boolean;
	disabled: boolean;
	featureFlags?: {
		participantCanProposeTransition?: boolean;
	};
}

export function ProposeTransitionButton({
	roomId,
	isAdmin,
	disabled,
	featureFlags,
}: ProposeTransitionButtonProps) {
	const { propose, isProposing } = useTransitionVote(roomId);

	if (!isAdmin && !featureFlags?.participantCanProposeTransition) return null;

	return (
		<Button
			size="sm"
			variant="outline"
			onClick={() => propose()}
			loading={isProposing}
			disabled={disabled}
		>
			次のフェーズへ移行を提案
		</Button>
	);
}
