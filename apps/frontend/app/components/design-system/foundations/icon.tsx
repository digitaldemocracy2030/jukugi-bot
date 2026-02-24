import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const iconVariants = cva("shrink-0", {
	variants: {
		size: {
			xs: "size-3",
			sm: "size-4",
			md: "size-5",
			lg: "size-6",
			xl: "size-8",
		},
		color: {
			default: "text-foreground",
			muted: "text-muted-foreground",
			primary: "text-primary",
			destructive: "text-destructive",
			success: "text-green-600 dark:text-green-400",
			warning: "text-yellow-600 dark:text-yellow-400",
		},
	},
	defaultVariants: {
		size: "md",
		color: "default",
	},
});

type IconProps = {
	name: LucideIcon;
	size?: VariantProps<typeof iconVariants>["size"];
	color?: VariantProps<typeof iconVariants>["color"];
	label?: string;
	className?: string;
} & Omit<React.SVGAttributes<SVGElement>, "color">;

const Icon = forwardRef<SVGSVGElement, IconProps>(
	({ name: IconComponent, size, color, label, className, ...props }, ref) => {
		return (
			<IconComponent
				ref={ref}
				data-slot="icon"
				className={cn(iconVariants({ size, color }), className)}
				aria-label={label}
				aria-hidden={label ? undefined : true}
				{...props}
			/>
		);
	},
);

Icon.displayName = "Icon";

export { Icon, iconVariants };
export type { IconProps };
