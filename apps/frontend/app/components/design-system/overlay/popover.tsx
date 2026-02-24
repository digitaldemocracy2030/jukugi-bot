import { Popover as PopoverPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface PopoverProps {
	/** Trigger element */
	trigger: ReactNode;
	/** Display position */
	side?: "top" | "right" | "bottom" | "left";
	/** Alignment */
	align?: "start" | "center" | "end";
	/** Controlled open state */
	open?: boolean;
	/** Open change handler */
	onOpenChange?: (open: boolean) => void;
	/** Content */
	children: ReactNode;
	className?: string;
}

function Popover({
	trigger,
	side = "bottom",
	align = "center",
	open,
	onOpenChange,
	children,
	className,
}: PopoverProps) {
	return (
		<PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					side={side}
					align={align}
					sideOffset={6}
					className={cn(
						"z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
						"animate-in fade-in-0 zoom-in-95",
						"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
						className,
					)}
				>
					{children}
					<PopoverPrimitive.Arrow className="fill-popover" />
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}

export { Popover };
export type { PopoverProps };
