import { RadioGroup as RadixRadioGroup } from "radix-ui";
import { forwardRef, useId } from "react";
import { cn } from "~/lib/utils";

interface RadioOption {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
}

interface RadioGroupProps {
	options: RadioOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	orientation?: "horizontal" | "vertical";
	disabled?: boolean;
	error?: boolean;
	name?: string;
	className?: string;
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
	(
		{
			options,
			value,
			onValueChange,
			orientation = "vertical",
			disabled = false,
			error = false,
			name,
			className,
		},
		ref,
	) => {
		const groupId = useId();

		return (
			<RadixRadioGroup.Root
				ref={ref}
				name={name}
				value={value}
				onValueChange={onValueChange}
				disabled={disabled}
				orientation={orientation}
				className={cn(
					"grid gap-2",
					orientation === "horizontal" && "grid-flow-col auto-cols-auto",
					className,
				)}
			>
				{options.map((option) => {
					const itemId = `${groupId}-${option.value}`;
					return (
						<div key={option.value} className="flex items-start gap-2">
							<div className="mt-0.5">
								<RadixRadioGroup.Item
									id={itemId}
									value={option.value}
									disabled={option.disabled}
									aria-invalid={error || undefined}
									className={cn(
										"size-4 shrink-0 rounded-full border border-input shadow-xs transition-all outline-none",
										"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
										"data-[state=checked]:border-primary",
										"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
										error && "border-destructive",
									)}
								>
									<RadixRadioGroup.Indicator className="flex items-center justify-center">
										<span className="size-2 rounded-full bg-primary" />
									</RadixRadioGroup.Indicator>
								</RadixRadioGroup.Item>
							</div>
							<div className="grid gap-0.5 leading-none">
								<label htmlFor={itemId} className="text-sm font-medium leading-none cursor-pointer">
									{option.label}
								</label>
								{option.description && (
									<p className="text-xs text-muted-foreground">{option.description}</p>
								)}
							</div>
						</div>
					);
				})}
			</RadixRadioGroup.Root>
		);
	},
);

RadioGroup.displayName = "RadioGroup";

export { RadioGroup, type RadioGroupProps, type RadioOption };
