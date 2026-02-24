import { forwardRef, useId } from "react";
import { cn } from "~/lib/utils";

const sizeMap = {
	sm: { track: "h-5 w-9", thumb: "size-3.5 data-[state=checked]:translate-x-4" },
	md: { track: "h-6 w-11", thumb: "size-4.5 data-[state=checked]:translate-x-5" },
} as const;

interface ToggleProps {
	pressed?: boolean;
	onPressedChange?: (pressed: boolean) => void;
	label?: string;
	size?: keyof typeof sizeMap;
	disabled?: boolean;
	className?: string;
}

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
	({ pressed = false, onPressedChange, label, size = "md", disabled = false, className }, ref) => {
		const autoId = useId();
		const sizes = sizeMap[size];

		const switchButton = (
			<button
				ref={ref}
				id={autoId}
				type="button"
				role="switch"
				aria-checked={pressed}
				aria-label={!label ? undefined : label}
				disabled={disabled}
				data-state={pressed ? "checked" : "unchecked"}
				onClick={() => onPressedChange?.(!pressed)}
				className={cn(
					"peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none",
					"focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
					pressed ? "bg-primary" : "bg-input",
					sizes.track,
					!label && className,
				)}
			>
				<span
					data-state={pressed ? "checked" : "unchecked"}
					className={cn(
						"pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform",
						"data-[state=unchecked]:translate-x-0.5",
						sizes.thumb,
					)}
				/>
			</button>
		);

		if (!label) {
			return switchButton;
		}

		return (
			<div className={cn("flex items-center gap-2", className)}>
				{switchButton}
				<label
					htmlFor={autoId}
					className={cn(
						"text-sm font-medium leading-none cursor-pointer",
						"peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
					)}
				>
					{label}
				</label>
			</div>
		);
	},
);

Toggle.displayName = "Toggle";

export { Toggle, type ToggleProps };
