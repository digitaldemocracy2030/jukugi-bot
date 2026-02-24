import { useState } from "react";
import type { Room } from "../../../src/api/models";
import { saveToken, useParticipant } from "../../hooks/use-participant";
import { Alert, Button, FormField, Input, Spinner, Stack, Typography } from "../design-system";
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
			<Stack
				direction="vertical"
				align="center"
				justify="center"
				className="min-h-screen bg-background p-4"
			>
				<div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
					<Stack direction="vertical" align="center" justify="center" className="py-8">
						<Spinner size="lg" label="読み込み中..." />
					</Stack>
				</div>
			</Stack>
		);
	}

	return (
		<Stack
			direction="vertical"
			align="center"
			justify="center"
			className="min-h-screen bg-background p-4"
		>
			<div className="w-full max-w-md rounded-xl border bg-card shadow-sm">
				<div className="p-6 pb-2">
					<Typography variant="h2">{room.title}</Typography>
					{room.description && (
						<Typography variant="body" color="muted" className="mt-1">
							{room.description}
						</Typography>
					)}
				</div>
				<div className="p-6 pt-4">
					<Stack direction="vertical" gap={4}>
						{isKnown && participant ? (
							<>
								<Typography variant="body" color="muted">
									以前の参加情報が見つかりました。
								</Typography>
								{error && <Alert variant="destructive">{error}</Alert>}
								<Button variant="primary" fullWidth loading={isPending} onClick={handleJoinAsKnown}>
									{`${participant.displayName} として参加する`}
								</Button>
								<RecoveryCodeDisplay recoveryCode={participant.recoveryCode} />
								<button
									type="button"
									className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
									onClick={clearParticipant}
								>
									別のアカウントで参加する
								</button>
							</>
						) : (
							<>
								<FormField label="表示名" htmlFor="display-name">
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
								</FormField>
								{error && <Alert variant="destructive">{error}</Alert>}
								<Button
									variant="primary"
									fullWidth
									loading={isPending}
									onClick={handleJoinAsNew}
									disabled={!displayName.trim()}
								>
									参加する
								</Button>
							</>
						)}
					</Stack>
				</div>
			</div>
		</Stack>
	);
}
