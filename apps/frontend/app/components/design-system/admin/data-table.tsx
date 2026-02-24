import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

import { cn } from "~/lib/utils";

interface DataTableColumn<T> {
	key: string;
	header: string;
	width?: number | string;
	align?: "left" | "center" | "right";
	render?: (row: T) => ReactNode;
	sortable?: boolean;
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[];
	data: T[];
	rowKey: (row: T) => string;
	sort?: { key: string; direction: "asc" | "desc" };
	onSortChange?: (sort: { key: string; direction: "asc" | "desc" }) => void;
	onRowClick?: (row: T) => void;
	emptyState?: ReactNode;
	loading?: boolean;
	striped?: boolean;
	hoverable?: boolean;
	compact?: boolean;
	className?: string;
}

const ALIGN_CLASSES = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
} as const;

function DataTableInner<T>(
	{
		columns,
		data,
		rowKey,
		sort,
		onSortChange,
		onRowClick,
		emptyState,
		loading = false,
		striped = false,
		hoverable = false,
		compact = false,
		className,
	}: DataTableProps<T>,
	ref: React.ForwardedRef<HTMLDivElement>,
) {
	const handleSort = (key: string) => {
		if (!onSortChange) return;
		if (sort?.key === key) {
			onSortChange({
				key,
				direction: sort.direction === "asc" ? "desc" : "asc",
			});
		} else {
			onSortChange({ key, direction: "asc" });
		}
	};

	const cellPadding = compact ? "px-3 py-1.5" : "px-4 py-3";

	return (
		<div
			ref={ref}
			data-slot="data-table"
			className={cn("w-full overflow-auto rounded-lg border", className)}
		>
			<table className="w-full caption-bottom text-sm">
				<thead className="border-b bg-muted/50">
					<tr>
						{columns.map((col) => (
							<th
								key={col.key}
								className={cn(
									cellPadding,
									"font-medium text-muted-foreground",
									ALIGN_CLASSES[col.align ?? "left"],
									col.sortable &&
										onSortChange &&
										"cursor-pointer select-none hover:text-foreground",
								)}
								style={{
									width: typeof col.width === "number" ? `${col.width}px` : col.width,
								}}
								onClick={col.sortable ? () => handleSort(col.key) : undefined}
							>
								<span className="inline-flex items-center gap-1">
									{col.header}
									{col.sortable &&
										sort?.key === col.key &&
										(sort.direction === "asc" ? (
											<ArrowUp className="size-3.5" />
										) : (
											<ArrowDown className="size-3.5" />
										))}
									{col.sortable && sort?.key !== col.key && (
										<ArrowUpDown className="size-3.5 opacity-30" />
									)}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={columns.length} className="py-12 text-center">
								<Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
							</td>
						</tr>
					) : data.length === 0 ? (
						<tr>
							<td colSpan={columns.length} className="py-12 text-center">
								{emptyState ?? <span className="text-muted-foreground">No data</span>}
							</td>
						</tr>
					) : (
						data.map((row, index) => (
							<tr
								key={rowKey(row)}
								onClick={onRowClick ? () => onRowClick(row) : undefined}
								className={cn(
									"border-b last:border-b-0 transition-colors",
									striped && index % 2 === 1 && "bg-muted/30",
									hoverable && "hover:bg-muted/50",
									onRowClick && "cursor-pointer",
								)}
							>
								{columns.map((col) => (
									<td key={col.key} className={cn(cellPadding, ALIGN_CLASSES[col.align ?? "left"])}>
										{col.render
											? col.render(row)
											: String((row as Record<string, unknown>)[col.key] ?? "")}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

const DataTable = forwardRef(DataTableInner) as <T>(
	props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReturnType<typeof DataTableInner>;

export { DataTable };
export type { DataTableProps, DataTableColumn };
