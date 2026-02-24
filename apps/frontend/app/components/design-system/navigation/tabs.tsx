import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const tabsListVariants = cva("inline-flex items-center", {
	variants: {
		variant: {
			underline: "border-b border-border gap-0",
			pill: "gap-1 rounded-lg bg-muted p-1",
			outline: "gap-1 border border-border rounded-lg p-1",
		},
		align: {
			start: "justify-start",
			center: "justify-center",
			stretch: "w-full",
		},
		size: {
			sm: "h-8 text-xs",
			md: "h-10 text-sm",
		},
	},
	defaultVariants: {
		variant: "underline",
		align: "start",
		size: "md",
	},
});

const tabsTriggerVariants = cva(
	[
		"inline-flex items-center justify-center gap-1.5",
		"whitespace-nowrap font-medium transition-colors",
		"focus-visible:outline-none focus-visible:ring-2",
		"focus-visible:ring-ring",
		"disabled:pointer-events-none disabled:opacity-50",
	].join(" "),
	{
		variants: {
			variant: {
				underline: [
					"border-b-2 border-transparent px-3 pb-2.5 pt-2",
					"text-muted-foreground hover:text-foreground",
					"data-[state=active]:border-primary",
					"data-[state=active]:text-foreground",
				].join(" "),
				pill: [
					"rounded-md px-3 py-1.5",
					"text-muted-foreground hover:text-foreground",
					"data-[state=active]:bg-background",
					"data-[state=active]:text-foreground",
					"data-[state=active]:shadow-sm",
				].join(" "),
				outline: [
					"rounded-md px-3 py-1.5",
					"text-muted-foreground hover:text-foreground",
					"data-[state=active]:bg-background",
					"data-[state=active]:text-foreground",
					"data-[state=active]:border",
					"data-[state=active]:border-border",
				].join(" "),
			},
			size: {
				sm: "text-xs",
				md: "text-sm",
			},
		},
		defaultVariants: {
			variant: "underline",
			size: "md",
		},
	},
);

interface TabItem {
	value: string;
	label: string;
	icon?: React.ReactNode;
	badge?: string | number;
	disabled?: boolean;
	content: React.ReactNode;
}

interface TabsProps extends VariantProps<typeof tabsListVariants> {
	items: TabItem[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	className?: string;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
	({ items, value, defaultValue, onValueChange, variant, align, size, className }, ref) => {
		const resolvedDefault = defaultValue ?? items[0]?.value;

		return (
			<TabsPrimitive.Root
				ref={ref}
				data-slot="tabs"
				value={value}
				defaultValue={resolvedDefault}
				onValueChange={onValueChange}
				className={cn("w-full", className)}
			>
				<TabsPrimitive.List
					data-slot="tabs-list"
					className={cn(tabsListVariants({ variant, align, size }))}
				>
					{items.map((item) => (
						<TabsPrimitive.Trigger
							key={item.value}
							value={item.value}
							disabled={item.disabled}
							data-slot="tabs-trigger"
							className={cn(
								tabsTriggerVariants({ variant, size }),
								align === "stretch" && "flex-1",
							)}
						>
							{item.icon}
							<span>{item.label}</span>
							{item.badge != null && (
								<span
									className={[
										"ml-1 inline-flex items-center",
										"justify-center rounded-full bg-muted",
										"px-1.5 py-0.5 text-[10px]",
										"font-medium leading-none",
										"text-muted-foreground",
									].join(" ")}
								>
									{item.badge}
								</span>
							)}
						</TabsPrimitive.Trigger>
					))}
				</TabsPrimitive.List>
				{items.map((item) => (
					<TabsPrimitive.Content
						key={item.value}
						value={item.value}
						data-slot="tabs-content"
						className="mt-2 focus-visible:outline-none"
					>
						{item.content}
					</TabsPrimitive.Content>
				))}
			</TabsPrimitive.Root>
		);
	},
);

Tabs.displayName = "Tabs";

export { Tabs, tabsListVariants, tabsTriggerVariants };
export type { TabsProps, TabItem };
