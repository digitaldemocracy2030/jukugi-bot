import { ChevronRight } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

interface BreadcrumbItem {
	label: string;
	href?: string;
	icon?: React.ReactNode;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
	items: BreadcrumbItem[];
	separator?: React.ReactNode;
}

const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
	({ items, separator, className, ...props }, ref) => {
		const separatorNode = separator ?? (
			<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
		);

		return (
			<nav
				ref={ref}
				data-slot="breadcrumb"
				aria-label="Breadcrumb"
				className={cn("flex items-center gap-1.5 text-sm", className)}
				{...props}
			>
				<ol className="flex items-center gap-1.5">
					{items.map((item, index) => {
						const isLast = index === items.length - 1;

						return (
							<li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
								{index > 0 && separatorNode}
								{isLast ? (
									<span
										className="flex items-center gap-1 font-medium text-foreground"
										aria-current="page"
									>
										{item.icon}
										{item.label}
									</span>
								) : item.href ? (
									<a
										href={item.href}
										className={[
											"flex items-center gap-1",
											"text-muted-foreground",
											"hover:text-foreground transition-colors",
										].join(" ")}
									>
										{item.icon}
										{item.label}
									</a>
								) : (
									<span className="flex items-center gap-1 text-muted-foreground">
										{item.icon}
										{item.label}
									</span>
								)}
							</li>
						);
					})}
				</ol>
			</nav>
		);
	},
);

Breadcrumb.displayName = "Breadcrumb";

export { Breadcrumb };
export type { BreadcrumbProps, BreadcrumbItem };
