import { ArrowLeft } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "../navigation/breadcrumb";

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	breadcrumbs?: BreadcrumbItem[];
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	backHref?: string;
	className?: string;
}

const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
	({ title, subtitle, breadcrumbs, actions, badge, backHref, className }, ref) => {
		return (
			<div ref={ref} data-slot="page-header" className={cn("space-y-3", className)}>
				{breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}

				<div className="flex items-start justify-between gap-4">
					<div className="flex items-start gap-3 min-w-0">
						{backHref && (
							<a
								href={backHref}
								className={[
									"mt-1 inline-flex items-center",
									"justify-center rounded-md size-8",
									"border border-border hover:bg-muted",
									"transition-colors shrink-0",
								].join(" ")}
								aria-label="Go back"
							>
								<ArrowLeft className="size-4" />
							</a>
						)}
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h1 className="text-xl font-bold truncate">{title}</h1>
								{badge}
							</div>
							{subtitle && (
								<p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
							)}
						</div>
					</div>

					{actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
				</div>
			</div>
		);
	},
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
export type { PageHeaderProps };
