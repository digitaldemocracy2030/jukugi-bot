import { useState } from "react";
import type { Room } from "../../../src/api/models";
import { saveToken, useParticipant } from "../../hooks/use-participant";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { RecoveryCodeDisplay } from "./recovery-code-display";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

type LobbyProps = {
	room: Room;
	onJoined: (token: string, livekitUrl: string, participantId: string) => void;
};

function parseJoinError(err: unknown): string {
	if (!err || typeof err !== "object") {
		return "参加に失敗しました。もう一度お試しください。";
	}
	const e = err as Record<string, unknown>;
	if (typeof e.message === "string" && e.message.length > 0) {
		const msg = e.message.toLowerCase();
		if (msg.includes("not found") || msg.includes("404")) {
			return "ルームが見つかりません。URLをご確認ください。";
		}
		if (msg.includes("ended") || msg.includes("closed")) {
			return "このルームはすでに終了しています。";
		}
		if (msg.includes("full") || msg.includes("capacity")) {
			return "ルームが満員です。しばらくお待ちください。";
		}
		if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("403")) {
			return "このルームへの参加が許可されていません。";
		}
		return e.message;
	}
	return "参加に失敗しました。もう一度お試しください。";
}

async function createParticipant(
	displayName: string,
): Promise<{ id: string; recoveryCode: string }> {
	const res = await fetch(`${API_BASE_URL}/api/participants`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ displayName }),
	});
	if (!res.ok) {
		throw new Error("参加者の作成に失敗しました");
	}
	return res.json();
}

async function joinRoom(
	roomId: string,
	participantToken: string,
	role: string,
): Promise<{ token: string; livekitUrl: string; participantId: string }> {
	const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/join`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ participantToken, role }),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw body;
	}
	return res.json();
}

export function Lobby({ room, onJoined }: LobbyProps) {
	const [displayName, setDisplayName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const { participant, isKnown, isLoading, clearParticipant } = useParticipant();

	const handleJoinAsKnown = async () => {
		if (!participant) return;
		setError(null);
		setIsPending(true);
		try {
			const result = await joinRoom(room.id, participant.id, "participant");
			onJoined(result.token, result.livekitUrl, result.participantId);
		} catch (err) {
			setError(parseJoinError(err));
		} finally {
			setIsPending(false);
		}
	};

	const handleJoinAsNew = async () => {
		const trimmed = displayName.trim();
		if (!trimmed) {
			setError("表示名を入力してください");
			return;
		}
		setError(null);
		setIsPending(true);
		try {
			const created = await createParticipant(trimmed);
			saveToken(created.id);
			const result = await joinRoom(room.id, created.id, "participant");
			onJoined(result.token, result.livekitUrl, result.participantId);
		} catch (err) {
			setError(parseJoinError(err));
		} finally {
			setIsPending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleJoinAsNew();
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background p-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex items-center justify-center py-12">
						<p className="text-muted-foreground">読み込み中...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl">{room.title}</CardTitle>
					{room.description && <CardDescription>{room.description}</CardDescription>}
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{isKnown && participant ? (
						<>
							<p className="text-sm text-muted-foreground">以前の参加情報が見つかりました。</p>
							{error && (
								<p role="alert" className="text-sm text-destructive">
									{error}
								</p>
							)}
							<Button onClick={handleJoinAsKnown} disabled={isPending}>
								{isPending ? "接続中..." : `${participant.displayName} として参加する`}
							</Button>
							<RecoveryCodeDisplay recoveryCode={participant.recoveryCode} />
							<button
								type="button"
								className="text-sm text-muted-foreground underline underline-offset-2"
								onClick={clearParticipant}
							>
								別のアカウントで参加する
							</button>
						</>
					) : (
						<>
							<div className="flex flex-col gap-2">
								<label htmlFor="display-name" className="text-sm font-medium">
									表示名
								</label>
								<Input
									id="display-name"
									type="text"
									placeholder="あなたの名前を入力"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									onKeyDown={handleKeyDown}
									disabled={isPending}
									maxLength={50}
									autoComplete="nickname"
								/>
							</div>
							{error && (
								<p role="alert" className="text-sm text-destructive">
									{error}
								</p>
							)}
							<Button onClick={handleJoinAsNew} disabled={isPending || !displayName.trim()}>
								{isPending ? "接続中..." : "参加する"}
							</Button>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
