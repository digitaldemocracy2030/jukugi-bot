import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface TooltipProps {
	/** Tooltip content */
	content: ReactNode;
	/** Display position */
	side?: "top" | "right" | "bottom" | "left";
	/** Display delay (ms) */
	delayDuration?: number;
	/** Trigger element */
	children: ReactNode;
}

function Tooltip({ content, side = "top", delayDuration = 300, children }: TooltipProps) {
	return (
		<TooltipPrimitive.Provider delayDuration={delayDuration}>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Content
						side={side}
						sideOffset={6}
						className={cn(
							"z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background",
							"animate-in fade-in-0 zoom-in-95",
							"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
						)}
					>
						{content}
						<TooltipPrimitive.Arrow className="fill-foreground" />
					</TooltipPrimitive.Content>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

export { Tooltip };
export type { TooltipProps };
