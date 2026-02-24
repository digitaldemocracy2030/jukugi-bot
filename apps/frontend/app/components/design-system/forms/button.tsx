import { Slot } from "radix-ui";
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
	link: "text-primary underline-offset-4 hover:underline",
} as const;

const sizeMap = {
	xs: "h-6 gap-1 rounded-md px-2 text-xs",
	sm: "h-8 gap-1.5 rounded-md px-3",
	md: "h-9 gap-2 rounded-md px-4 py-2",
	lg: "h-10 gap-2 rounded-md px-6",
	icon: "size-9",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: keyof typeof variantMap;
	size?: keyof typeof sizeMap;
	loading?: boolean;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	fullWidth?: boolean;
	asChild?: boolean;
	className?: string;
	children?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = "primary",
			size = "md",
			loading = false,
			leftIcon,
			rightIcon,
			fullWidth = false,
			asChild = false,
			disabled,
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot.Root : "button";
		const isDisabled = disabled || loading;

		return (
			<Comp
				ref={ref}
				data-slot="button"
				disabled={isDisabled}
				className={cn(
					"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"disabled:pointer-events-none disabled:opacity-50",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0 shrink-0",
					variantMap[variant],
					sizeMap[size],
					fullWidth && "w-full",
					className,
				)}
				{...props}
			>
				{loading && (
					<svg
						className="size-4 animate-spin"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
				)}
				{!loading && leftIcon}
				{children}
				{!loading && rightIcon}
			</Comp>
		);
	},
);

Button.displayName = "Button";

export { Button, type ButtonProps };
