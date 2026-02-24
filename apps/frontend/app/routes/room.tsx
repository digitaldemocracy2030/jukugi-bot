import { useState } from "react";
import { useParams } from "react-router";
import { useGetApiRoomsSlug } from "../../src/api/gen/breakoutDeliberationOSAPI";
import { RoomStatus } from "../../src/api/models";
import { Button, Spinner, Stack, Typography } from "../components/design-system";
import { LiveRoom } from "../components/room/live-room";
import { Lobby } from "../components/room/lobby";

type ConnectionState =
	| { status: "lobby" }
	| { status: "connecting"; token: string; livekitUrl: string; participantId: string }
	| { status: "connected"; token: string; livekitUrl: string }
	| { status: "ended" };

function parseLoadError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		const msg = String((err as { message: unknown }).message);
		if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
			return "ルームが見つかりません。URLをご確認ください。";
		}
	}
	return "ルーム情報の取得に失敗しました。通信状況をご確認ください。";
}

export function meta() {
	return [{ title: "ルーム | OSODP" }];
}

export default function RoomPage() {
	const { slug } = useParams<{ slug: string }>();
	const [connState, setConnState] = useState<ConnectionState>({ status: "lobby" });

	const { data, isLoading, error, isError, refetch } = useGetApiRoomsSlug(slug ?? "", {
		query: { enabled: !!slug },
	});

	const handleJoined = (token: string, livekitUrl: string, participantId: string) => {
		setConnState({ status: "connecting", token, livekitUrl, participantId });
		setTimeout(() => {
			setConnState((prev) => {
				if (prev.status !== "connecting") return prev;
				return { status: "connected", token: prev.token, livekitUrl: prev.livekitUrl };
			});
		}, 0);
	};

	const handleDisconnected = () => {
		setConnState((prev) => {
			if (prev.status === "connected" || prev.status === "connecting") {
				return { status: "ended" };
			}
			return prev;
		});
	};

	if (!slug) {
		return (
			<Stack direction="vertical" align="center" justify="center" className="min-h-screen" gap={4}>
				<Typography variant="body" color="destructive" align="center" className="max-w-sm">
					ルームが見つかりません
				</Typography>
			</Stack>
		);
	}

	if (isLoading) {
		return (
			<Stack direction="vertical" align="center" justify="center" className="min-h-screen" gap={3}>
				<Spinner size="lg" label="読み込み中..." />
			</Stack>
		);
	}

	if (isError) {
		const message = parseLoadError(error);
		const isNotFound = message.includes("見つかりません");
		return (
			<Stack direction="vertical" align="center" justify="center" className="min-h-screen" gap={4}>
				<Typography variant="body" color="destructive" align="center" className="max-w-sm">
					{message}
				</Typography>
				{!isNotFound && (
					<Button variant="outline" onClick={() => refetch()}>
						再試行
					</Button>
				)}
			</Stack>
		);
	}

	if (!data || data.status !== 200) {
		return null;
	}

	const room = data.data;
	const isRoomEnded = room.status === RoomStatus.completed || room.status === RoomStatus.archived;

	if (connState.status === "ended" || (isRoomEnded && connState.status === "lobby")) {
		return (
			<Stack direction="vertical" align="center" justify="center" className="min-h-screen" gap={2}>
				<Typography variant="h2">{room.title}</Typography>
				<Typography variant="body" color="muted">
					このセッションは終了しました
				</Typography>
			</Stack>
		);
	}

	if (connState.status === "lobby") {
		return <Lobby room={room} onJoined={handleJoined} />;
	}

	if (connState.status === "connecting") {
		return (
			<Stack direction="vertical" align="center" justify="center" className="min-h-screen" gap={3}>
				<Spinner size="lg" label="接続中..." />
			</Stack>
		);
	}

	// connected
	return <LiveRoom token={connState.token} roomId={room.id} onDisconnected={handleDisconnected} />;
}
