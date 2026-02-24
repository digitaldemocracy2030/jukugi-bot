import { Plus } from "lucide-react";
import { Link } from "react-router";
import { useGetApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import { RoomStatusBadge } from "~/components/admin/RoomStatusBadge";
import {
	Button,
	EmptyState,
	PageHeader,
	Spinner,
	Stack,
	Typography,
} from "~/components/design-system";

export function meta() {
	return [{ title: "ルーム一覧 | OSODP Admin" }];
}

export default function AdminIndexPage() {
	const { data, isLoading, error } = useGetApiRooms(undefined);

	const rooms = data?.status === 200 ? data.data : [];

	return (
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title="ルーム一覧"
				actions={
					<Button variant="primary" leftIcon={<Plus className="size-4" />} asChild>
						<Link to="/admin/rooms/new">新規ルーム作成</Link>
					</Button>
				}
			/>

			{isLoading && (
				<Stack direction="vertical" align="center" className="py-12">
					<Spinner size="lg" label="読み込み中..." />
				</Stack>
			)}
			{error && (
				<Typography variant="body" color="destructive">
					読み込みに失敗しました
				</Typography>
			)}

			{!isLoading && rooms.length === 0 && (
				<EmptyState
					title="ルームがありません"
					description="新規ルームを作成してセッションを開始しましょう。"
					action={
						<Button variant="primary" leftIcon={<Plus className="size-4" />} asChild>
							<Link to="/admin/rooms/new">新規ルーム作成</Link>
						</Button>
					}
				/>
			)}

			<div className="grid gap-4">
				{rooms.map((room) => (
					<div
						key={room.id}
						className="rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors"
					>
						<Stack direction="horizontal" align="center" justify="between" gap={4}>
							<div className="min-w-0">
								<Typography variant="h4" className="truncate">
									{room.title}
								</Typography>
								<Typography variant="caption" className="mt-0.5">
									/{room.slug}
								</Typography>
								{room.description && (
									<Typography variant="body-sm" color="muted" className="mt-1 line-clamp-2">
										{room.description}
									</Typography>
								)}
							</div>
							<Stack direction="horizontal" gap={3} align="center" className="shrink-0">
								<RoomStatusBadge status={room.status} />
								<Button variant="outline" size="sm" asChild>
									<Link to={`/admin/rooms/${room.id}`}>管理</Link>
								</Button>
							</Stack>
						</Stack>
					</div>
				))}
			</div>
		</Stack>
	);
}
