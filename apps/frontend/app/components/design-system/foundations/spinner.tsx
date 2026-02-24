import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "~/lib/utils";

const spinnerVariants = cva("animate-spin text-muted-foreground", {
	variants: {
		size: {
			sm: "size-4",
			md: "size-6",
			lg: "size-10",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

type SpinnerProps = {
	size?: VariantProps<typeof spinnerVariants>["size"];
	label?: string;
	className?: string;
};

const Spinner = forwardRef<HTMLOutputElement, SpinnerProps>(({ size, label, className }, ref) => {
	return (
		<output
			ref={ref}
			data-slot="spinner"
			className={cn("inline-flex items-center gap-2", className)}
		>
			<Loader2 className={cn(spinnerVariants({ size }))} />
			{label && <span className="text-sm text-muted-foreground">{label}</span>}
			<span className="sr-only">{label ?? "Loading..."}</span>
		</output>
	);
});

Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
export type { SpinnerProps };
