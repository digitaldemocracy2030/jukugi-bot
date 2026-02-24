import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface ConfirmDialogProps {
	/** Open state */
	open: boolean;
	/** Open change handler */
	onOpenChange: (open: boolean) => void;
	/** Title */
	title: string;
	/** Description */
	description: string;
	/** Confirm button text */
	confirmLabel?: string;
	/** Cancel button text */
	cancelLabel?: string;
	/** Confirm button variant */
	confirmVariant?: "primary" | "destructive";
	/** Confirm callback */
	onConfirm: () => void;
	/** Loading state */
	loading?: boolean;
}

function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "OK",
	cancelLabel = "Cancel",
	confirmVariant = "primary",
	onConfirm,
	loading,
}: ConfirmDialogProps) {
	const actionVariant = confirmVariant === "destructive" ? "destructive" : "default";

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction
						variant={actionVariant}
						disabled={loading}
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
					>
						{loading ? "..." : confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
