import { forwardRef } from "react";
import { AvatarFallback, AvatarImage, Avatar as ShadcnAvatar } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { StatusIndicator } from "./status-indicator";

const sizeMap = {
	xs: "size-6",
	sm: "size-8",
	md: "size-10",
	lg: "size-14",
	xl: "size-20",
} as const;

const fallbackTextSize = {
	xs: "text-[10px]",
	sm: "text-xs",
	md: "text-sm",
	lg: "text-lg",
	xl: "text-2xl",
} as const;

const statusSizeMap = {
	xs: "sm" as const,
	sm: "sm" as const,
	md: "md" as const,
	lg: "md" as const,
	xl: "lg" as const,
};

const ringColorMap = {
	primary: "ring-teal-500",
	destructive: "ring-red-500",
	warning: "ring-amber-500",
} as const;

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AvatarProps = {
	src?: string;
	name: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	status?: "online" | "offline" | "away" | "busy" | "speaking";
	ring?: boolean;
	ringColor?: "primary" | "destructive" | "warning";
	className?: string;
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
	({ src, name, size = "md", status, ring, ringColor = "primary", className }, ref) => {
		return (
			<div
				ref={ref}
				data-slot="ds-avatar"
				className={cn("relative inline-flex shrink-0", className)}
			>
				<ShadcnAvatar
					className={cn(sizeMap[size], "rounded-full", ring && `ring-2 ${ringColorMap[ringColor]}`)}
				>
					{src && <AvatarImage src={src} alt={name} />}
					<AvatarFallback
						className={cn(
							"bg-muted text-muted-foreground flex items-center justify-center rounded-full",
							fallbackTextSize[size],
						)}
					>
						{getInitials(name)}
					</AvatarFallback>
				</ShadcnAvatar>
				{status && (
					<span className={cn("absolute bottom-0 right-0 rounded-full ring-2 ring-background")}>
						<StatusIndicator status={status} size={statusSizeMap[size]} />
					</span>
				)}
			</div>
		);
	},
);

Avatar.displayName = "Avatar";

export { Avatar, type AvatarProps, getInitials };
