import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const toolbarVariants = cva("flex items-center w-full", {
	variants: {
		position: {
			top: "fixed top-0 left-0 right-0 z-50",
			bottom: "fixed bottom-0 left-0 right-0 z-50",
			inline: "relative",
		},
		blur: {
			true: "backdrop-blur-md bg-background/80",
			false: "bg-background",
		},
		bordered: {
			true: "",
			false: "",
		},
	},
	compoundVariants: [
		{
			position: "top",
			bordered: true,
			className: "border-b",
		},
		{
			position: "bottom",
			bordered: true,
			className: "border-t",
		},
		{
			position: "inline",
			bordered: true,
			className: "border",
		},
	],
	defaultVariants: {
		position: "inline",
		blur: false,
		bordered: false,
	},
});

interface ToolbarProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof toolbarVariants> {}

const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
	({ className, position, blur, bordered, ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="toolbar"
				role="toolbar"
				className={cn("px-4 py-2", toolbarVariants({ position, blur, bordered, className }))}
				{...props}
			/>
		);
	},
);
Toolbar.displayName = "Toolbar";

const toolbarSectionVariants = cva("flex items-center gap-2", {
	variants: {
		align: {
			start: "mr-auto",
			center: "mx-auto",
			end: "ml-auto",
		},
	},
	defaultVariants: {
		align: "center",
	},
});

interface ToolbarSectionProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof toolbarSectionVariants> {}

const ToolbarSection = forwardRef<HTMLDivElement, ToolbarSectionProps>(
	({ className, align, ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="toolbar-section"
				className={cn(toolbarSectionVariants({ align, className }))}
				{...props}
			/>
		);
	},
);
ToolbarSection.displayName = "ToolbarSection";

export { Toolbar, toolbarVariants, ToolbarSection, toolbarSectionVariants };
export type { ToolbarProps, ToolbarSectionProps };
