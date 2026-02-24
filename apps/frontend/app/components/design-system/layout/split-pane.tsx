import { forwardRef } from "react";

import { cn } from "~/lib/utils";

interface SplitPaneProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Side panel content */
	aside?: React.ReactNode;

	/** Which side the aside appears on */
	asideSide?: "left" | "right";

	/** Width of the aside panel */
	asideWidth?: number | string;

	/** Whether the aside panel is open */
	asideOpen?: boolean;
}

const SplitPane = forwardRef<HTMLDivElement, SplitPaneProps>(
	(
		{
			className,
			children,
			aside,
			asideSide = "right",
			asideWidth = 280,
			asideOpen = true,
			...props
		},
		ref,
	) => {
		const widthValue = typeof asideWidth === "number" ? `${asideWidth}px` : asideWidth;

		const asidePanel = aside && (
			<div
				data-slot="split-pane-aside"
				data-state={asideOpen ? "open" : "closed"}
				className={cn(
					"shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out",
					asideOpen ? "opacity-100" : "w-0 opacity-0",
				)}
				style={asideOpen ? { width: widthValue } : undefined}
			>
				{aside}
			</div>
		);

		return (
			<div
				ref={ref}
				data-slot="split-pane"
				className={cn("flex h-full w-full", className)}
				{...props}
			>
				{asideSide === "left" && asidePanel}
				<div data-slot="split-pane-main" className="flex-1 min-w-0">
					{children}
				</div>
				{asideSide === "right" && asidePanel}
			</div>
		);
	},
);
SplitPane.displayName = "SplitPane";

export { SplitPane };
export type { SplitPaneProps };
