import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 font-medium whitespace-nowrap shrink-0 gap-1 transition-colors",
	{
		variants: {
			variant: {
				solid: "",
				outline: "bg-transparent border",
				subtle: "",
			},
			colorScheme: {
				default: "",
				primary: "",
				success: "",
				warning: "",
				destructive: "",
				info: "",
			},
			size: {
				sm: "text-[10px] px-1.5 py-0 h-5",
				md: "text-xs px-2 py-0.5 h-6",
			},
		},
		compoundVariants: [
			// solid
			{ variant: "solid", colorScheme: "default", className: "bg-stone-500 text-white" },
			{ variant: "solid", colorScheme: "primary", className: "bg-teal-600 text-white" },
			{ variant: "solid", colorScheme: "success", className: "bg-green-600 text-white" },
			{ variant: "solid", colorScheme: "warning", className: "bg-amber-500 text-white" },
			{ variant: "solid", colorScheme: "destructive", className: "bg-red-600 text-white" },
			{ variant: "solid", colorScheme: "info", className: "bg-blue-600 text-white" },
			// outline
			{
				variant: "outline",
				colorScheme: "default",
				className: "border-stone-300 text-stone-700 dark:border-stone-600 dark:text-stone-300",
			},
			{
				variant: "outline",
				colorScheme: "primary",
				className: "border-teal-500 text-teal-700 dark:border-teal-400 dark:text-teal-300",
			},
			{
				variant: "outline",
				colorScheme: "success",
				className: "border-green-500 text-green-700 dark:border-green-400 dark:text-green-300",
			},
			{
				variant: "outline",
				colorScheme: "warning",
				className: "border-amber-500 text-amber-700 dark:border-amber-400 dark:text-amber-300",
			},
			{
				variant: "outline",
				colorScheme: "destructive",
				className: "border-red-500 text-red-700 dark:border-red-400 dark:text-red-300",
			},
			{
				variant: "outline",
				colorScheme: "info",
				className: "border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300",
			},
			// subtle
			{
				variant: "subtle",
				colorScheme: "default",
				className: "bg-stone-500/10 text-stone-700 dark:text-stone-300",
			},
			{
				variant: "subtle",
				colorScheme: "primary",
				className: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
			},
			{
				variant: "subtle",
				colorScheme: "success",
				className: "bg-green-500/10 text-green-700 dark:text-green-300",
			},
			{
				variant: "subtle",
				colorScheme: "warning",
				className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
			},
			{
				variant: "subtle",
				colorScheme: "destructive",
				className: "bg-red-500/10 text-red-700 dark:text-red-300",
			},
			{
				variant: "subtle",
				colorScheme: "info",
				className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
			},
		],
		defaultVariants: {
			variant: "solid",
			colorScheme: "default",
			size: "md",
		},
	},
);

type BadgeProps = React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & {
		dot?: boolean;
		icon?: React.ReactNode;
		removable?: boolean;
		onRemove?: () => void;
	};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
	(
		{
			className,
			variant = "solid",
			colorScheme = "default",
			size = "md",
			dot,
			icon,
			removable,
			onRemove,
			children,
			...props
		},
		ref,
	) => {
		return (
			<span
				ref={ref}
				data-slot="ds-badge"
				className={cn(badgeVariants({ variant, colorScheme, size }), className)}
				{...props}
			>
				{dot && <span className="size-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />}
				{icon && <span className="shrink-0 [&>svg]:size-3">{icon}</span>}
				{children}
				{removable && (
					<button
						type="button"
						onClick={onRemove}
						className="shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
						aria-label="Remove"
					>
						<X className="size-3" />
					</button>
				)}
			</span>
		);
	},
);

Badge.displayName = "Badge";

export { Badge, badgeVariants, type BadgeProps };
