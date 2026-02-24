import { forwardRef } from "react";
import { Input as BaseInput } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const sizeMap = {
	sm: "h-8 text-xs",
	md: "h-9 text-sm",
	lg: "h-12 text-base",
} as const;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	leftIcon?: React.ReactNode;
	rightElement?: React.ReactNode;
	error?: boolean;
	inputSize?: keyof typeof sizeMap;
	className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	({ className, leftIcon, rightElement, error = false, inputSize = "md", ...props }, ref) => {
		if (!leftIcon && !rightElement) {
			return (
				<BaseInput
					ref={ref}
					data-slot="input"
					aria-invalid={error || undefined}
					className={cn(
						sizeMap[inputSize],
						error && "border-destructive ring-destructive/20",
						className,
					)}
					{...props}
				/>
			);
		}

		return (
			<div className="relative flex items-center">
				{leftIcon && (
					<span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground [&_svg]:size-4">
						{leftIcon}
					</span>
				)}
				<BaseInput
					ref={ref}
					data-slot="input"
					aria-invalid={error || undefined}
					className={cn(
						sizeMap[inputSize],
						leftIcon && "pl-9",
						rightElement && "pr-9",
						error && "border-destructive ring-destructive/20",
						className,
					)}
					{...props}
				/>
				{rightElement && (
					<span className="absolute right-3 flex items-center text-muted-foreground">
						{rightElement}
					</span>
				)}
			</div>
		);
	},
);

Input.displayName = "Input";

export { Input, type InputProps };
