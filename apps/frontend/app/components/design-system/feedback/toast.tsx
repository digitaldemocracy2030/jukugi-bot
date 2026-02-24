import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { cn } from "~/lib/utils";

interface ToastOptions {
	/** Message title */
	title: string;
	/** Detailed description */
	description?: string;
	/** Variant */
	variant?: "default" | "success" | "warning" | "destructive" | "info";
	/** Display duration (ms). 0 for manual close only */
	duration?: number;
	/** Action button */
	action?: {
		label: string;
		onClick: () => void;
	};
}

interface ToastEntry extends ToastOptions {
	id: string;
	removing?: boolean;
}

type Listener = () => void;

let toastId = 0;
let toasts: ToastEntry[] = [];
const listeners = new Set<Listener>();

function emitChange() {
	for (const listener of listeners) {
		listener();
	}
}

function addToast(options: ToastOptions): string {
	const id = `toast-${++toastId}`;
	toasts = [...toasts, { ...options, id }];
	emitChange();

	const duration = options.duration ?? 5000;
	if (duration > 0) {
		setTimeout(() => dismissToast(id), duration);
	}

	return id;
}

function dismissToast(id: string) {
	toasts = toasts.map((t) => (t.id === id ? { ...t, removing: true } : t));
	emitChange();
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
		emitChange();
	}, 200);
}

function subscribe(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getSnapshot() {
	return toasts;
}

const toastVariants = cva(
	"pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all duration-200 data-[removing=true]:animate-out data-[removing=true]:fade-out-0 data-[removing=true]:slide-out-to-right-full",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground border-border",
				success:
					"bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800",
				warning:
					"bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800",
				destructive:
					"bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
				info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const variantIcons: Record<string, React.ComponentType<{ className?: string }>> = {
	default: Info,
	success: CheckCircle,
	warning: AlertTriangle,
	destructive: XCircle,
	info: Info,
};

function ToastProvider() {
	const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

	if (currentToasts.length === 0) return null;

	return (
		<div
			data-slot="toast-provider"
			className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2"
		>
			{currentToasts.map((toast) => {
				const IconComp = variantIcons[toast.variant ?? "default"];
				return (
					<div
						key={toast.id}
						data-removing={toast.removing ? "true" : undefined}
						className={cn(
							toastVariants({ variant: toast.variant }),
							"animate-in fade-in-0 slide-in-from-right-full",
						)}
					>
						<IconComp className="mt-0.5 size-5 shrink-0" />
						<div className="flex-1">
							<p className="text-sm font-semibold">{toast.title}</p>
							{toast.description && <p className="mt-1 text-sm opacity-80">{toast.description}</p>}
							{toast.action && (
								<button
									type="button"
									className="mt-2 text-sm font-medium underline underline-offset-4 hover:opacity-80"
									onClick={toast.action.onClick}
								>
									{toast.action.label}
								</button>
							)}
						</div>
						<button
							type="button"
							className="shrink-0 rounded-sm opacity-70 hover:opacity-100"
							onClick={() => dismissToast(toast.id)}
						>
							<X className="size-4" />
							<span className="sr-only">Close</span>
						</button>
					</div>
				);
			})}
		</div>
	);
}

function useToast() {
	const toast = useCallback((options: ToastOptions) => addToast(options), []);
	const dismiss = useCallback((id: string) => dismissToast(id), []);

	return { toast, dismiss };
}

export { ToastProvider, useToast };
export type { ToastOptions };
