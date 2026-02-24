import { forwardRef } from "react";
import { cn } from "~/lib/utils";

type EmptyStateProps = {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
};

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
	({ icon, title, description, action, className }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="ds-empty-state"
				className={cn(
					"flex flex-col items-center justify-center gap-3 py-12 px-4 text-center",
					className,
				)}
			>
				{icon && <div className="text-muted-foreground [&>svg]:size-10">{icon}</div>}
				<div className="flex flex-col gap-1">
					<h3 className="text-base font-semibold text-foreground">{title}</h3>
					{description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
				</div>
				{action && <div className="mt-2">{action}</div>}
			</div>
		);
	},
);

EmptyState.displayName = "EmptyState";

export { EmptyState, type EmptyStateProps };
