import { Select as RadixSelect } from "radix-ui";
import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const sizeMap = {
	sm: "h-8 text-xs px-2",
	md: "h-9 text-sm px-3",
	lg: "h-12 text-base px-3",
} as const;

interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

interface SelectProps {
	options: SelectOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	error?: boolean;
	size?: keyof typeof sizeMap;
	disabled?: boolean;
	className?: string;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
	(
		{
			options,
			value,
			onValueChange,
			placeholder = "Select...",
			error = false,
			size = "md",
			disabled = false,
			className,
		},
		ref,
	) => {
		return (
			<RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
				<RadixSelect.Trigger
					ref={ref}
					data-slot="select"
					aria-invalid={error || undefined}
					className={cn(
						"inline-flex items-center justify-between gap-2 rounded-md border bg-background shadow-xs outline-none transition-all",
						"border-input dark:bg-input/30 dark:border-input",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
						"data-[placeholder]:text-muted-foreground",
						sizeMap[size],
						error && "border-destructive ring-destructive/20",
						className,
					)}
				>
					<RadixSelect.Value placeholder={placeholder} />
					<RadixSelect.Icon className="text-muted-foreground">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</RadixSelect.Icon>
				</RadixSelect.Trigger>
				<RadixSelect.Portal>
					<RadixSelect.Content
						className={cn(
							"relative z-50 max-h-[300px] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
							"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
							"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
						)}
						position="popper"
						sideOffset={4}
					>
						<RadixSelect.Viewport className="p-1">
							{options.map((option) => (
								<RadixSelect.Item
									key={option.value}
									value={option.value}
									disabled={option.disabled}
									className={cn(
										"relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
										"focus:bg-accent focus:text-accent-foreground",
										"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
									)}
								>
									<span className="absolute left-2 flex size-4 items-center justify-center">
										<RadixSelect.ItemIndicator>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												aria-hidden="true"
											>
												<polyline points="20 6 9 17 4 12" />
											</svg>
										</RadixSelect.ItemIndicator>
									</span>
									<RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
								</RadixSelect.Item>
							))}
						</RadixSelect.Viewport>
					</RadixSelect.Content>
				</RadixSelect.Portal>
			</RadixSelect.Root>
		);
	},
);

Select.displayName = "Select";

export { Select, type SelectProps, type SelectOption };
