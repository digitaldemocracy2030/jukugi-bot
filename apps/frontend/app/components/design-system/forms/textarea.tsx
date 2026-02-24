import { forwardRef, useCallback, useRef } from "react";
import { cn } from "~/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	error?: boolean;
	autoResize?: boolean;
	minRows?: number;
	maxRows?: number;
	className?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{ className, error = false, autoResize = false, minRows = 3, maxRows, style, ...props },
		ref,
	) => {
		const internalRef = useRef<HTMLTextAreaElement | null>(null);

		const setRefs = useCallback(
			(node: HTMLTextAreaElement | null) => {
				internalRef.current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			},
			[ref],
		);

		const resize = useCallback(() => {
			const el = internalRef.current;
			if (!el || !autoResize) return;
			el.style.height = "auto";
			const lineHeight = Number.parseInt(getComputedStyle(el).lineHeight, 10) || 20;
			const maxHeight = maxRows ? lineHeight * maxRows : undefined;
			const newHeight = maxHeight ? Math.min(el.scrollHeight, maxHeight) : el.scrollHeight;
			el.style.height = `${newHeight}px`;
		}, [autoResize, maxRows]);

		return (
			<textarea
				ref={setRefs}
				data-slot="textarea"
				rows={minRows}
				aria-invalid={error || undefined}
				onInput={autoResize ? resize : undefined}
				className={cn(
					"placeholder:text-muted-foreground border-input dark:bg-input/30 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none resize-y",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					autoResize && "resize-none overflow-hidden",
					error && "border-destructive ring-destructive/20",
					className,
				)}
				style={style}
				{...props}
			/>
		);
	},
);

Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
