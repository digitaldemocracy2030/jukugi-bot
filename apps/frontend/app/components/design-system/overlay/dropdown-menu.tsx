import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

interface DropdownMenuItem {
	type?: "item";
	label: string;
	icon?: ReactNode;
	shortcut?: string;
	disabled?: boolean;
	destructive?: boolean;
	onSelect: () => void;
}

interface DropdownMenuSeparator {
	type: "separator";
}

interface DropdownMenuLabel {
	type: "label";
	label: string;
}

type DropdownMenuEntry = DropdownMenuItem | DropdownMenuSeparator | DropdownMenuLabel;

interface DropdownMenuProps {
	/** Trigger element */
	trigger: ReactNode;
	/** Menu items */
	items: DropdownMenuEntry[];
	/** Display position */
	side?: "top" | "right" | "bottom" | "left";
	/** Alignment */
	align?: "start" | "center" | "end";
}

function deriveKey(entry: DropdownMenuEntry, idx: number): string {
	if (entry.type === "separator") return `sep-${idx}`;
	if (entry.type === "label") return `label-${idx}-${entry.label}`;
	return `item-${entry.label}`;
}

function DropdownMenu({ trigger, items, side = "bottom", align = "end" }: DropdownMenuProps) {
	const keyedItems = items.map((entry, idx) => ({ entry, key: deriveKey(entry, idx) }));

	return (
		<DropdownMenuPrimitive.Root>
			<DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
			<DropdownMenuPrimitive.Portal>
				<DropdownMenuPrimitive.Content
					side={side}
					align={align}
					sideOffset={4}
					className={cn(
						"z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
						"animate-in fade-in-0 zoom-in-95",
						"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
					)}
				>
					{keyedItems.map(({ entry, key }) => {
						if (entry.type === "separator") {
							return (
								<DropdownMenuPrimitive.Separator key={key} className="my-1 -mx-1 h-px bg-border" />
							);
						}

						if (entry.type === "label") {
							return (
								<DropdownMenuPrimitive.Label
									key={key}
									className="px-2 py-1.5 text-xs font-semibold text-muted-foreground"
								>
									{entry.label}
								</DropdownMenuPrimitive.Label>
							);
						}

						return (
							<DropdownMenuPrimitive.Item
								key={key}
								disabled={entry.disabled}
								onSelect={entry.onSelect}
								className={cn(
									"relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
									"focus:bg-accent focus:text-accent-foreground",
									"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
									entry.destructive && "text-destructive focus:text-destructive",
								)}
							>
								{entry.icon && <span className="size-4 shrink-0">{entry.icon}</span>}
								<span className="flex-1">{entry.label}</span>
								{entry.shortcut && (
									<span className="ml-auto text-xs text-muted-foreground">{entry.shortcut}</span>
								)}
							</DropdownMenuPrimitive.Item>
						);
					})}
				</DropdownMenuPrimitive.Content>
			</DropdownMenuPrimitive.Portal>
		</DropdownMenuPrimitive.Root>
	);
}

export { DropdownMenu };
export type {
	DropdownMenuProps,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuLabel,
	DropdownMenuEntry,
};
