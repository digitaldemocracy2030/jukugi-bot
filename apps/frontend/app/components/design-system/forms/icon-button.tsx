import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const variantMap = {
	primary: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	outline:
		"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
	ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
	destructive:
		"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
} as const;

const sizeMap = {
	sm: "size-8 [&_svg]:size-4",
	md: "size-10 [&_svg]:size-5",
	lg: "size-12 [&_svg]:size-6",
} as const;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon: React.ReactNode;
	"aria-label": string;
	variant?: keyof typeof variantMap;
	size?: keyof typeof sizeMap;
	active?: boolean;
	rounded?: boolean;
	className?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{ className, icon, variant = "ghost", size = "md", active = false, rounded = false, ...props },
		ref,
	) => {
		return (
			<button
				ref={ref}
				type="button"
				data-slot="icon-button"
				data-active={active || undefined}
				className={cn(
					"inline-flex items-center justify-center shrink-0 transition-all outline-none",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0",
					variantMap[variant],
					sizeMap[size],
					rounded ? "rounded-full" : "rounded-md",
					active && "bg-accent text-accent-foreground",
					className,
				)}
				{...props}
			>
				{icon}
			</button>
		);
	},
);

IconButton.displayName = "IconButton";

export { IconButton, type IconButtonProps };
