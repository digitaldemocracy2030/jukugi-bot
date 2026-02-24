import { useState } from "react";
import { useParams } from "react-router";
import { useGetApiRoomsSlug } from "../../src/api/gen/breakoutDeliberationOSAPI";
import { RoomStatus } from "../../src/api/models";
import { LiveRoom } from "../components/room/live-room";
import { Lobby } from "../components/room/lobby";
import { Button } from "../components/ui/button";

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
			<div className="flex flex-col items-center justify-center min-h-screen gap-4">
				<p className="text-destructive text-center max-w-sm">ルームが見つかりません</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (isError) {
		const message = parseLoadError(error);
		const isNotFound = message.includes("見つかりません");
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-4">
				<p className="text-destructive text-center max-w-sm">{message}</p>
				{!isNotFound && (
					<Button variant="outline" onClick={() => refetch()}>
						再試行
					</Button>
				)}
			</div>
		);
	}

	if (!data || data.status !== 200) {
		return null;
	}

	const room = data.data;
	const isRoomEnded = room.status === RoomStatus.completed || room.status === RoomStatus.archived;

	if (connState.status === "ended" || (isRoomEnded && connState.status === "lobby")) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">{room.title}</h1>
					<p className="text-muted-foreground">このセッションは終了しました</p>
				</div>
			</div>
		);
	}

	if (connState.status === "lobby") {
		return <Lobby room={room} onJoined={handleJoined} />;
	}

	if (connState.status === "connecting") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-muted-foreground">接続中...</p>
			</div>
		);
	}

	// connected
	return <LiveRoom token={connState.token} roomId={room.id} onDisconnected={handleDisconnected} />;
}
