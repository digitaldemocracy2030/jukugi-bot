import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { type ReactNode, useState } from "react";

import { cn } from "~/lib/utils";

const alertVariants = cva("relative flex items-start gap-3 rounded-lg border p-4 text-sm", {
	variants: {
		variant: {
			default: "bg-background text-foreground border-border",
			success:
				"bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800",
			warning:
				"bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800",
			destructive:
				"bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
			info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const defaultIcons: Record<string, React.ComponentType<{ className?: string }>> = {
	default: Info,
	success: CheckCircle,
	warning: AlertTriangle,
	destructive: XCircle,
	info: Info,
};

interface AlertProps {
	variant?: "default" | "success" | "warning" | "destructive" | "info";
	title?: string;
	children: ReactNode;
	icon?: ReactNode;
	dismissible?: boolean;
	onDismiss?: () => void;
	action?: ReactNode;
	className?: string;
}

function Alert({
	variant = "default",
	title,
	children,
	icon,
	dismissible,
	onDismiss,
	action,
	className,
}: AlertProps) {
	const [dismissed, setDismissed] = useState(false);

	if (dismissed) return null;

	const IconComp = defaultIcons[variant];
	const iconElement = icon ?? <IconComp className="mt-0.5 size-5 shrink-0" />;

	function handleDismiss() {
		setDismissed(true);
		onDismiss?.();
	}

	return (
		<div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)}>
			{iconElement}
			<div className="flex-1">
				{title && <p className="font-semibold">{title}</p>}
				<div className={cn(title && "mt-1")}>{children}</div>
				{action && <div className="mt-2">{action}</div>}
			</div>
			{dismissible && (
				<button
					type="button"
					className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
					onClick={handleDismiss}
				>
					<X className="size-4" />
					<span className="sr-only">Close</span>
				</button>
			)}
		</div>
	);
}

export { Alert, alertVariants };
export type { AlertProps };
