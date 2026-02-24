import { forwardRef } from "react";

import { cn } from "~/lib/utils";

type DividerProps = {
	orientation?: "horizontal" | "vertical";
	label?: string;
	className?: string;
};

const Divider = forwardRef<HTMLDivElement, DividerProps>(
	({ orientation = "horizontal", label, className }, ref) => {
		if (orientation === "vertical") {
			return (
				<div
					ref={ref}
					data-slot="divider"
					className={cn("self-stretch w-px bg-border", className)}
				/>
			);
		}

		if (label) {
			return (
				<div ref={ref} data-slot="divider" className={cn("flex items-center gap-3", className)}>
					<div className="h-px flex-1 bg-border" />
					<span className="text-xs text-muted-foreground">{label}</span>
					<div className="h-px flex-1 bg-border" />
				</div>
			);
		}

		return <div ref={ref} data-slot="divider" className={cn("h-px w-full bg-border", className)} />;
	},
);

Divider.displayName = "Divider";

export { Divider };
export type { DividerProps };
