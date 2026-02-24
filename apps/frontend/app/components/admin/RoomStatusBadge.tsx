import type { RoomStatus } from "~/api/models/roomStatus";
import { Badge } from "~/components/design-system";

type ColorScheme = "default" | "primary" | "success" | "warning" | "destructive" | "info";

const statusConfig: Record<RoomStatus, { label: string; colorScheme: ColorScheme }> = {
	draft: { label: "下書き", colorScheme: "default" },
	active: { label: "開催中", colorScheme: "success" },
	completed: { label: "完了", colorScheme: "info" },
	archived: { label: "アーカイブ", colorScheme: "default" },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
	const config = statusConfig[status];
	return (
		<Badge variant="subtle" colorScheme={config.colorScheme}>
			{config.label}
		</Badge>
	);
}
