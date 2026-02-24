import { cva } from "class-variance-authority";
import { Hand, Loader2, X, Zap } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const handRaiseVariants = cva(
	[
		"inline-flex items-center justify-center gap-2",
		"rounded-lg font-medium transition-colors",
		"focus-visible:outline-none focus-visible:ring-2",
		"focus-visible:ring-ring",
		"disabled:pointer-events-none disabled:opacity-50",
	].join(" "),
	{
		variants: {
			mode: {
				"request-speak": "bg-primary text-primary-foreground hover:bg-primary/90",
				"request-interrupt":
					"bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700",
				"cancel-request": "border border-border bg-background text-foreground hover:bg-muted",
			},
			size: {
				sm: "h-8 px-3 text-xs",
				md: "h-10 px-4 text-sm",
				lg: "h-12 px-6 text-base",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

const MODE_CONFIG = {
	"request-speak": {
		label: "Request to speak",
		icon: Hand,
	},
	"request-interrupt": {
		label: "Request interruption",
		icon: Zap,
	},
	"cancel-request": {
		label: "Cancel request",
		icon: X,
	},
} as const;

interface HandRaiseButtonProps {
	mode: "request-speak" | "request-interrupt" | "cancel-request";
	onClick: () => void;
	disabled?: boolean;
	disabledReason?: string;
	queuePosition?: number;
	loading?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const HandRaiseButton = forwardRef<HTMLButtonElement, HandRaiseButtonProps>(
	(
		{
			mode,
			onClick,
			disabled = false,
			disabledReason,
			queuePosition,
			loading = false,
			size = "md",
			className,
		},
		ref,
	) => {
		const config = MODE_CONFIG[mode];
		const IconComponent = config.icon;

		const label =
			mode === "cancel-request" && queuePosition != null
				? `${config.label} (#${queuePosition})`
				: config.label;

		return (
			<button
				ref={ref}
				type="button"
				data-slot="hand-raise-button"
				onClick={onClick}
				disabled={disabled || loading}
				title={disabledReason ?? label}
				className={cn(handRaiseVariants({ mode, size }), className)}
			>
				{loading ? (
					<Loader2 className="size-4 animate-spin" />
				) : (
					<IconComponent className="size-4" />
				)}
				<span>{label}</span>
			</button>
		);
	},
);

HandRaiseButton.displayName = "HandRaiseButton";

export { HandRaiseButton, handRaiseVariants };
export type { HandRaiseButtonProps };
