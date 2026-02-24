import { forwardRef, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface FormFieldProps {
	label: string;
	description?: string;
	error?: string;
	required?: boolean;
	htmlFor?: string;
	children: ReactNode;
	className?: string;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
	({ label, description, error, required = false, htmlFor, children, className }, ref) => {
		return (
			<div ref={ref} className={cn("grid gap-1.5", className)}>
				<label htmlFor={htmlFor} className="text-sm font-medium leading-none">
					{label}
					{required && <span className="text-destructive ml-0.5">*</span>}
				</label>
				{description && <p className="text-xs text-muted-foreground">{description}</p>}
				{children}
				{error && (
					<p className="text-xs text-destructive" role="alert">
						{error}
					</p>
				)}
			</div>
		);
	},
);

FormField.displayName = "FormField";

export { FormField, type FormFieldProps };
