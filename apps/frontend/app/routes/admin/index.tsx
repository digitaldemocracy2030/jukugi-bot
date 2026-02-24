import { Link } from "react-router";
import { useGetApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import { RoomStatusBadge } from "~/components/admin/RoomStatusBadge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function meta() {
	return [{ title: "ルーム一覧 | OSODP Admin" }];
}

export default function AdminIndexPage() {
	const { data, isLoading, error } = useGetApiRooms(undefined);

	const rooms = data?.status === 200 ? data.data : [];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">ルーム一覧</h1>
				<Button asChild>
					<Link to="/admin/rooms/new">+ 新規ルーム作成</Link>
				</Button>
			</div>

			{isLoading && <p className="text-muted-foreground">読み込み中...</p>}
			{error && <p className="text-destructive">読み込みに失敗しました</p>}

			{!isLoading && rooms.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						ルームがありません。新規ルームを作成してください。
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4">
				{rooms.map((room) => (
					<Card key={room.id} className="hover:bg-muted/30 transition-colors">
						<CardHeader>
							<div className="flex items-center justify-between gap-4">
								<div className="min-w-0">
									<CardTitle className="text-base truncate">{room.title}</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">/{room.slug}</p>
									{room.description && (
										<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
											{room.description}
										</p>
									)}
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<RoomStatusBadge status={room.status} />
									<Button variant="outline" size="sm" asChild>
										<Link to={`/admin/rooms/${room.id}`}>管理</Link>
									</Button>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
