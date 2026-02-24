import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import { Avatar } from "./avatar";

type AvatarGroupItem = {
	name: string;
	src?: string;
};

type AvatarGroupProps = {
	items: AvatarGroupItem[];
	max?: number;
	size?: "xs" | "sm" | "md";
	className?: string;
};

const overflowSizeMap = {
	xs: "size-6 text-[10px]",
	sm: "size-8 text-xs",
	md: "size-10 text-sm",
} as const;

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
	({ items, max = 5, size = "md", className }, ref) => {
		const visible = items.slice(0, max);
		const overflow = items.length - max;

		return (
			<div ref={ref} data-slot="ds-avatar-group" className={cn("flex -space-x-2", className)}>
				{visible.map((item) => (
					<Avatar
						key={item.name}
						name={item.name}
						src={item.src}
						size={size}
						className="ring-2 ring-background"
					/>
				))}
				{overflow > 0 && (
					<div
						className={cn(
							"relative inline-flex items-center justify-center rounded-full",
							"bg-muted text-muted-foreground font-medium ring-2 ring-background",
							overflowSizeMap[size],
						)}
					>
						+{overflow}
					</div>
				)}
			</div>
		);
	},
);

AvatarGroup.displayName = "AvatarGroup";

export { AvatarGroup, type AvatarGroupProps };
