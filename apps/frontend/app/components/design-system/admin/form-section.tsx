import { ChevronDown } from "lucide-react";
import { forwardRef, useState } from "react";

import { cn } from "~/lib/utils";

interface FormSectionProps {
	title: string;
	description?: string;
	collapsible?: boolean;
	defaultExpanded?: boolean;
	children: React.ReactNode;
	className?: string;
}

const FormSection = forwardRef<HTMLDivElement, FormSectionProps>(
	(
		{ title, description, collapsible = false, defaultExpanded = true, children, className },
		ref,
	) => {
		const [expanded, setExpanded] = useState(defaultExpanded);

		const isExpanded = collapsible ? expanded : true;

		return (
			<div
				ref={ref}
				data-slot="form-section"
				className={cn("border-b border-border pb-6", className)}
			>
				{collapsible ? (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="flex items-center justify-between w-full text-left py-2 group"
					>
						<div>
							<h3 className="text-sm font-semibold">{title}</h3>
							{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
						</div>
						<ChevronDown
							className={cn(
								"size-4 text-muted-foreground transition-transform",
								isExpanded && "rotate-180",
							)}
						/>
					</button>
				) : (
					<div className="py-2">
						<h3 className="text-sm font-semibold">{title}</h3>
						{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
					</div>
				)}

				{isExpanded && <div className="mt-3 space-y-4">{children}</div>}
			</div>
		);
	},
);

FormSection.displayName = "FormSection";

export { FormSection };
export type { FormSectionProps };
