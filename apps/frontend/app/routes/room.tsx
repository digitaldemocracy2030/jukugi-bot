import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useGetApiRoomsSlug } from "../../src/api/gen/breakoutDeliberationOSAPI";
import { RoomStatus } from "../../src/api/models";
import {
	Alert,
	Badge,
	Button,
	Container,
	Divider,
	Spinner,
	Stack,
	Typography,
} from "../components/design-system";
import { LiveRoom } from "../components/room/live-room";
import { Lobby } from "../components/room/lobby";

type ConnectionState =
	| { status: "lobby" }
	| { status: "connecting"; token: string; livekitUrl: string; participantId: string }
	| { status: "connected"; token: string; livekitUrl: string }
	| { status: "ended" };

function parseLoadError(err: unknown): { message: string; isNotFound: boolean } {
	if (err && typeof err === "object" && "message" in err) {
		const msg = String((err as { message: unknown }).message);
		if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
			return {
				message: "ルームが見つかりません。URLをご確認ください。",
				isNotFound: true,
			};
		}
	}
	return {
		message: "ルーム情報の取得に失敗しました。通信状況をご確認ください。",
		isNotFound: false,
	};
}

function RoomStateCard({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<Container maxWidth="sm" padding="none">
				<Stack direction="vertical" align="center" gap={6} className="w-full">
					<Stack direction="horizontal" align="center" gap={2}>
						<div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<span className="text-primary font-bold text-body-sm">OS</span>
						</div>
						<Typography variant="label" color="muted">
							Breakout Deliberation OS
						</Typography>
					</Stack>
					<div className="w-full rounded-xl border border-border bg-card p-8 shadow-sm">
						<Stack direction="vertical" gap={5}>
							{children}
						</Stack>
					</div>
				</Stack>
			</Container>
		</div>
	);
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
			<RoomStateCard>
				<Alert variant="destructive" title="ルームが見つかりません">
					URLにルームIDが含まれていません。正しいURLからアクセスしてください。
				</Alert>
				<Button variant="outline" asChild className="w-full">
					<Link to="/">ホームに戻る</Link>
				</Button>
			</RoomStateCard>
		);
	}

	if (isLoading) {
		return (
			<RoomStateCard>
				<Stack direction="vertical" align="center" gap={4} className="py-6">
					<Spinner size="lg" />
					<Stack direction="vertical" align="center" gap={1}>
						<Typography variant="h4" align="center">
							ルームを準備しています
						</Typography>
						<Typography variant="body-sm" color="muted" align="center">
							しばらくお待ちください...
						</Typography>
					</Stack>
				</Stack>
			</RoomStateCard>
		);
	}

	if (isError) {
		const { message, isNotFound } = parseLoadError(error);
		return (
			<RoomStateCard>
				<Alert variant={isNotFound ? "destructive" : "warning"} title="エラー">
					{message}
				</Alert>
				<Stack direction="horizontal" gap={3} justify="center">
					<Button variant="outline" asChild>
						<Link to="/">ホームに戻る</Link>
					</Button>
					{!isNotFound && (
						<Button variant="primary" onClick={() => refetch()}>
							再試行
						</Button>
					)}
				</Stack>
			</RoomStateCard>
		);
	}

	if (!data || data.status !== 200) {
		return null;
	}

	const room = data.data;
	const isRoomEnded = room.status === RoomStatus.completed || room.status === RoomStatus.archived;

	if (connState.status === "ended" || (isRoomEnded && connState.status === "lobby")) {
		return (
			<RoomStateCard>
				<Stack direction="vertical" align="center" gap={3}>
					<Badge colorScheme="default" variant="subtle">
						終了
					</Badge>
					<Typography variant="h3" align="center">
						{room.title}
					</Typography>
				</Stack>
				<Divider />
				<Stack direction="vertical" align="center" gap={2}>
					<Typography variant="body" color="muted" align="center">
						このセッションは終了しました。
					</Typography>
					<Typography variant="body-sm" color="muted" align="center">
						ご参加ありがとうございました。
					</Typography>
				</Stack>
				<Button variant="outline" asChild className="w-full">
					<Link to="/">ホームに戻る</Link>
				</Button>
			</RoomStateCard>
		);
	}

	if (connState.status === "lobby") {
		return <Lobby room={room} onJoined={handleJoined} />;
	}

	if (connState.status === "connecting") {
		return (
			<RoomStateCard>
				<Stack direction="vertical" align="center" gap={4}>
					<Typography variant="h3" align="center">
						{room.title}
					</Typography>
					{room.description && (
						<Typography variant="body-sm" color="muted" align="center">
							{room.description}
						</Typography>
					)}
					<Badge colorScheme="info" variant="subtle">
						接続中
					</Badge>
				</Stack>
				<Divider />
				<Stack direction="vertical" align="center" gap={4} className="py-4">
					<Spinner size="lg" />
					<Typography variant="body" color="muted" align="center">
						セッションに接続しています...
					</Typography>
				</Stack>
			</RoomStateCard>
		);
	}

	// connected
	return <LiveRoom token={connState.token} roomId={room.id} onDisconnected={handleDisconnected} />;
}
