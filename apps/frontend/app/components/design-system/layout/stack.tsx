import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const stackVariants = cva("flex", {
	variants: {
		direction: {
			horizontal: "flex-row",
			vertical: "flex-col",
		},
		gap: {
			0: "gap-0",
			1: "gap-1",
			2: "gap-2",
			3: "gap-3",
			4: "gap-4",
			5: "gap-5",
			6: "gap-6",
			8: "gap-8",
			10: "gap-10",
			12: "gap-12",
		},
		align: {
			start: "items-start",
			center: "items-center",
			end: "items-end",
			stretch: "items-stretch",
			baseline: "items-baseline",
		},
		justify: {
			start: "justify-start",
			center: "justify-center",
			end: "justify-end",
			between: "justify-between",
			around: "justify-around",
		},
		wrap: {
			true: "flex-wrap",
			false: "",
		},
		fullWidth: {
			true: "w-full",
			false: "",
		},
	},
	defaultVariants: {
		direction: "vertical",
		gap: 0,
		wrap: false,
		fullWidth: false,
	},
});

type StackElement = "div" | "section" | "nav" | "ul" | "ol" | "header" | "footer";

interface StackProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof stackVariants> {
	as?: StackElement;
}

const Stack = forwardRef<HTMLElement, StackProps>(
	(
		{ className, direction, gap, align, justify, wrap, fullWidth, as: Component = "div", ...props },
		ref,
	) => {
		return (
			<Component
				ref={ref}
				data-slot="stack"
				className={cn(
					stackVariants({ direction, gap, align, justify, wrap, fullWidth, className }),
				)}
				{...props}
			/>
		);
	},
);
Stack.displayName = "Stack";

export { Stack, stackVariants };
export type { StackProps };
