import { Checkbox as RadixCheckbox } from "radix-ui";
import { forwardRef, useId } from "react";
import { cn } from "~/lib/utils";

interface CheckboxProps {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	label?: string;
	description?: string;
	disabled?: boolean;
	indeterminate?: boolean;
	error?: boolean;
	name?: string;
	className?: string;
}

const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	(
		{
			checked,
			onCheckedChange,
			label,
			description,
			disabled = false,
			indeterminate = false,
			error = false,
			name,
			className,
		},
		ref,
	) => {
		const autoId = useId();
		const id = name ?? autoId;

		const resolvedChecked = indeterminate ? "indeterminate" : checked;

		const checkbox = (
			<RadixCheckbox.Root
				ref={ref}
				id={id}
				name={name}
				checked={resolvedChecked}
				onCheckedChange={(val) => {
					if (typeof val === "boolean") {
						onCheckedChange?.(val);
					} else {
						onCheckedChange?.(false);
					}
				}}
				disabled={disabled}
				aria-invalid={error || undefined}
				className={cn(
					"peer size-4 shrink-0 rounded-sm border border-input shadow-xs transition-all outline-none",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary",
					"data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary",
					"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
					error && "border-destructive",
				)}
			>
				<RadixCheckbox.Indicator className="flex items-center justify-center text-current">
					{indeterminate ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							aria-hidden="true"
						>
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="3"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					)}
				</RadixCheckbox.Indicator>
			</RadixCheckbox.Root>
		);

		if (!label && !description) {
			return <div className={className}>{checkbox}</div>;
		}

		return (
			<div className={cn("flex items-start gap-2", className)}>
				<div className="mt-0.5">{checkbox}</div>
				<div className="grid gap-0.5 leading-none">
					{label && (
						<label
							htmlFor={id}
							className={cn(
								"text-sm font-medium leading-none cursor-pointer",
								"peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
								error && "text-destructive",
							)}
						>
							{label}
						</label>
					)}
					{description && <p className="text-xs text-muted-foreground">{description}</p>}
				</div>
			</div>
		);
	},
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
