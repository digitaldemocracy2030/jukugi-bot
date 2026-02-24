import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const containerVariants = cva("", {
	variants: {
		maxWidth: {
			sm: "max-w-xl",
			md: "max-w-2xl",
			lg: "max-w-4xl",
			xl: "max-w-5xl",
			"2xl": "max-w-7xl",
			full: "max-w-full",
		},
		padding: {
			none: "px-0",
			sm: "px-4",
			md: "px-6",
			lg: "px-8",
		},
		centered: {
			true: "mx-auto",
			false: "",
		},
	},
	defaultVariants: {
		maxWidth: "xl",
		padding: "md",
		centered: true,
	},
});

interface ContainerProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof containerVariants> {}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
	({ className, maxWidth, padding, centered, ...props }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="container"
				className={cn(containerVariants({ maxWidth, padding, centered, className }))}
				{...props}
			/>
		);
	},
);
Container.displayName = "Container";

export { Container, containerVariants };
export type { ContainerProps };
