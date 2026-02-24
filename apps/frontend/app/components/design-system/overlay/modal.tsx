import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

const sizeClasses = {
	sm: "max-w-[400px]",
	md: "max-w-[500px]",
	lg: "max-w-[640px]",
	xl: "max-w-[800px]",
	full: "max-w-[calc(100vw-2rem)]",
} as const;

interface ModalProps {
	/** Open state */
	open: boolean;
	/** Open change handler */
	onOpenChange: (open: boolean) => void;
	/** Title */
	title: string;
	/** Description */
	description?: string;
	/** Size */
	size?: "sm" | "md" | "lg" | "xl" | "full";
	/** Disable ESC / overlay click close */
	preventClose?: boolean;
	/** Footer (action buttons etc.) */
	footer?: ReactNode;
	/** Body */
	children: ReactNode;
	className?: string;
}

function Modal({
	open,
	onOpenChange,
	title,
	description,
	size = "md",
	preventClose,
	footer,
	children,
	className,
}: ModalProps) {
	function handleOpenChange(next: boolean) {
		if (preventClose && !next) return;
		onOpenChange(next);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				className={cn(sizeClasses[size], className)}
				onPointerDownOutside={preventClose ? (e) => e.preventDefault() : undefined}
				onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <p className="text-sm text-muted-foreground">{description}</p>}
				</DialogHeader>
				<div data-slot="modal-body">{children}</div>
				{footer && (
					<div data-slot="modal-footer" className="mt-4 flex justify-end gap-2">
						{footer}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export { Modal };
export type { ModalProps };
