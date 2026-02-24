import { Archive, CheckCircle2, FolderOpen, Layers, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useGetApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import type { Room } from "~/api/models/room";
import { RoomStatusBadge } from "~/components/admin/RoomStatusBadge";
import {
	Button,
	DataTable,
	type DataTableColumn,
	EmptyState,
	PageHeader,
	Stack,
	StatCard,
	Tabs,
	Typography,
} from "~/components/design-system";

export function meta() {
	return [{ title: "Dashboard | OSODP Admin" }];
}

const STATUS_TABS = [
	{ value: "all", label: "すべて" },
	{ value: "draft", label: "下書き" },
	{ value: "active", label: "開催中" },
	{ value: "completed", label: "完了" },
	{ value: "archived", label: "アーカイブ" },
] as const;

export default function AdminIndexPage() {
	const navigate = useNavigate();
	const { data, isLoading, error } = useGetApiRooms(undefined);
	const [statusFilter, setStatusFilter] = useState("all");
	const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" }>({
		key: "updatedAt",
		direction: "desc",
	});

	const rooms = data?.status === 200 ? data.data : [];

	const counts = useMemo(() => {
		const c = { all: 0, draft: 0, active: 0, completed: 0, archived: 0 };
		for (const room of rooms) {
			c.all++;
			c[room.status]++;
		}
		return c;
	}, [rooms]);

	const filteredRooms = useMemo(() => {
		const filtered =
			statusFilter === "all" ? rooms : rooms.filter((r) => r.status === statusFilter);

		return [...filtered].sort((a, b) => {
			const key = sort.key as keyof Room;
			const aVal = a[key] ?? "";
			const bVal = b[key] ?? "";
			const cmp = String(aVal).localeCompare(String(bVal));
			return sort.direction === "asc" ? cmp : -cmp;
		});
	}, [rooms, statusFilter, sort]);

	const columns: DataTableColumn<Room>[] = [
		{
			key: "title",
			header: "ルーム名",
			sortable: true,
			render: (room) => (
				<div className="min-w-0">
					<Typography variant="body" className="font-medium truncate">
						{room.title}
					</Typography>
					<Typography variant="caption" className="truncate">
						/{room.slug}
					</Typography>
				</div>
			),
		},
		{
			key: "status",
			header: "ステータス",
			width: 120,
			sortable: true,
			render: (room) => <RoomStatusBadge status={room.status} />,
		},
		{
			key: "maxParticipants",
			header: "定員",
			width: 80,
			align: "center",
			sortable: true,
			render: (room) => (
				<Typography variant="body-sm" className="tabular-nums">
					{room.maxParticipants}
				</Typography>
			),
		},
		{
			key: "updatedAt",
			header: "最終更新",
			width: 160,
			sortable: true,
			render: (room) => (
				<Typography variant="caption" className="tabular-nums">
					{new Date(room.updatedAt).toLocaleString("ja-JP", {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</Typography>
			),
		},
		{
			key: "actions",
			header: "",
			width: 100,
			align: "right",
			render: (room) => (
				<Button variant="outline" size="sm" asChild>
					<Link to={`/admin/rooms/${room.id}`}>管理</Link>
				</Button>
			),
		},
	];

	const tabItems = STATUS_TABS.map((tab) => ({
		value: tab.value,
		label: tab.label,
		badge: counts[tab.value as keyof typeof counts],
		content: (
			<div className="mt-4">
				{error ? (
					<Typography variant="body" color="destructive">
						読み込みに失敗しました
					</Typography>
				) : !isLoading && filteredRooms.length === 0 ? (
					<EmptyState
						title="ルームがありません"
						description={
							statusFilter === "all"
								? "新規ルームを作成してセッションを開始しましょう。"
								: "該当するルームがありません。"
						}
						action={
							statusFilter === "all" ? (
								<Button variant="primary" leftIcon={<Plus className="size-4" />} asChild>
									<Link to="/admin/rooms/new">新規ルーム作成</Link>
								</Button>
							) : undefined
						}
					/>
				) : (
					<DataTable
						columns={columns}
						data={filteredRooms}
						rowKey={(r) => r.id}
						sort={sort}
						onSortChange={setSort}
						onRowClick={(room) => navigate(`/admin/rooms/${room.id}`)}
						loading={isLoading}
						hoverable
						striped
					/>
				)}
			</div>
		),
	}));

	return (
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title="Dashboard"
				actions={
					<Button variant="primary" leftIcon={<Plus className="size-4" />} asChild>
						<Link to="/admin/rooms/new">新規ルーム作成</Link>
					</Button>
				}
			/>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard label="全ルーム数" value={counts.all} icon={<Layers className="size-5" />} />
				<StatCard
					label="開催中"
					value={counts.active}
					icon={<FolderOpen className="size-5" />}
					colorScheme="success"
				/>
				<StatCard
					label="完了"
					value={counts.completed}
					icon={<CheckCircle2 className="size-5" />}
					colorScheme="primary"
				/>
				<StatCard
					label="アーカイブ"
					value={counts.archived}
					icon={<Archive className="size-5" />}
				/>
			</div>

			<Tabs items={tabItems} value={statusFilter} onValueChange={setStatusFilter} variant="pill" />
		</Stack>
	);
}
