import type { RoomStatus } from "~/api/models/roomStatus";
import { Badge } from "~/components/ui/badge";

const statusConfig: Record<RoomStatus, { label: string; className: string }> = {
	draft: { label: "下書き", className: "bg-stone-200 text-stone-700 border-stone-300" },
	active: { label: "開催中", className: "bg-teal-100 text-teal-700 border-teal-300" },
	completed: { label: "完了", className: "bg-blue-100 text-blue-700 border-blue-300" },
	archived: { label: "アーカイブ", className: "bg-stone-100 text-stone-500 border-stone-200" },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
	const config = statusConfig[status];
	return (
		<Badge variant="outline" className={config.className}>
			{config.label}
		</Badge>
	);
}
