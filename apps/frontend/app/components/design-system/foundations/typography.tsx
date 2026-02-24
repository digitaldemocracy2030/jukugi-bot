import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const typographyVariants = cva("", {
	variants: {
		variant: {
			h1: "text-2xl font-bold",
			h2: "text-xl font-semibold",
			h3: "text-lg font-semibold",
			h4: "text-base font-medium",
			body: "text-sm",
			"body-sm": "text-xs",
			label: "text-sm font-medium",
			caption: "text-xs text-muted-foreground",
		},
		color: {
			default: "text-foreground",
			muted: "text-muted-foreground",
			primary: "text-primary",
			destructive: "text-destructive",
			success: "text-green-600 dark:text-green-400",
		},
		align: {
			left: "text-left",
			center: "text-center",
			right: "text-right",
		},
		weight: {
			normal: "font-normal",
			medium: "font-medium",
			semibold: "font-semibold",
			bold: "font-bold",
		},
	},
	defaultVariants: {
		color: "default",
	},
});

const defaultElementMap: Record<
	NonNullable<VariantProps<typeof typographyVariants>["variant"]>,
	React.ElementType
> = {
	h1: "h1",
	h2: "h2",
	h3: "h3",
	h4: "h4",
	body: "p",
	"body-sm": "p",
	label: "label",
	caption: "span",
};

type TypographyProps = {
	variant: NonNullable<VariantProps<typeof typographyVariants>["variant"]>;
	as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label";
	color?: VariantProps<typeof typographyVariants>["color"];
	align?: VariantProps<typeof typographyVariants>["align"];
	weight?: VariantProps<typeof typographyVariants>["weight"];
	truncate?: boolean;
	className?: string;
	children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "color">;

const Typography = forwardRef<HTMLElement, TypographyProps>(
	({ variant, as, color, align, weight, truncate, className, children, ...props }, ref) => {
		const Component = (as ?? defaultElementMap[variant]) as React.ElementType;

		return (
			<Component
				ref={ref}
				data-slot="typography"
				className={cn(
					typographyVariants({ variant, color, align, weight }),
					truncate && "truncate",
					className,
				)}
				{...props}
			>
				{children}
			</Component>
		);
	},
);

Typography.displayName = "Typography";

export { Typography, typographyVariants };
export type { TypographyProps };
