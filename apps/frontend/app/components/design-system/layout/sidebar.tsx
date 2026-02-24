import { forwardRef } from "react";

import { cn } from "~/lib/utils";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Whether the sidebar is open */
	open: boolean;

	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;

	/** Which side the sidebar appears on */
	side?: "left" | "right";

	/** Width of the sidebar */
	width?: number | string;

	/** Title displayed in the sidebar header */
	title?: string;
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
	(
		{ className, open, onOpenChange, side = "right", width = 280, title, children, ...props },
		ref,
	) => {
		const widthValue = typeof width === "number" ? `${width}px` : width;

		return (
			<div
				ref={ref}
				data-slot="sidebar"
				data-state={open ? "open" : "closed"}
				data-side={side}
				className={cn(
					"flex flex-col border-border bg-background overflow-hidden transition-[width] duration-200 ease-in-out",
					side === "left" ? "border-r" : "border-l",
					open ? "opacity-100" : "w-0 opacity-0",
					className,
				)}
				style={open ? { width: widthValue } : undefined}
				{...props}
			>
				{title && (
					<div className="flex items-center justify-between border-b border-border px-4 py-3">
						<span className="text-sm font-medium">{title}</span>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							aria-label="Close sidebar"
						>
							<svg
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					</div>
				)}
				<div className="flex-1 overflow-y-auto">{children}</div>
			</div>
		);
	},
);
Sidebar.displayName = "Sidebar";

export { Sidebar };
export type { SidebarProps };
