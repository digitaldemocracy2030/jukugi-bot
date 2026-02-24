import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
	useGetApiRoomsRoomIdPhases,
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdPhaseTransition,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "~/api/gen/breakoutDeliberationOSAPI";
import { PhaseTypeIcon } from "~/components/admin/PhaseTypeIcon";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function meta() {
	return [{ title: "セッション進行 | OSODP Admin" }];
}

export default function AdminSessionPage() {
	const { roomId } = useParams<{ roomId: string }>();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [interruptParticipantId, setInterruptParticipantId] = useState("");
	const [selectedPhaseId, setSelectedPhaseId] = useState("");

	const { data: phasesData, isLoading } = useGetApiRoomsRoomIdPhases(roomId ?? "", {
		query: { refetchInterval: 5000, enabled: !!roomId },
	});
	const { mutateAsync: forceTransition, isPending: transitioning } =
		usePostApiRoomsRoomIdPhaseTransition();
	const { mutateAsync: queueNext, isPending: nextPending } = usePostApiRoomsRoomIdQueueNext();
	const { mutateAsync: queueSkip, isPending: skipPending } = usePostApiRoomsRoomIdQueueSkip();
	const { mutateAsync: endInterrupt, isPending: endingInterrupt } =
		usePostApiRoomsRoomIdInterruptParticipantIdEnd();

	const phases = phasesData?.status === 200 ? phasesData.data : [];

	if (!roomId) return null;
	const id = roomId;

	async function handleForceTransition(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!selectedPhaseId) return;
		try {
			await forceTransition({ roomId: id, data: { phaseId: selectedPhaseId } });
			queryClient.invalidateQueries();
		} catch {
			setError("フェーズ遷移に失敗しました");
		}
	}

	async function handleQueueNext() {
		setError(null);
		try {
			await queueNext({ roomId: id, data: {} });
		} catch {
			setError("次の発言者への移行に失敗しました");
		}
	}

	async function handleQueueSkip() {
		setError(null);
		try {
			await queueSkip({ roomId: id });
		} catch {
			setError("スキップに失敗しました");
		}
	}

	async function handleEndInterrupt(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await endInterrupt({ roomId: id, participantId: interruptParticipantId });
			setInterruptParticipantId("");
		} catch {
			setError("割り込み終了に失敗しました");
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link
					to={`/admin/rooms/${id}`}
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					← ルーム詳細
				</Link>
			</div>

			<h1 className="text-2xl font-bold">セッション進行</h1>

			{error && <p className="text-sm text-destructive">{error}</p>}

			{/* Phase overview & transition */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">フェーズ一覧・遷移</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
					<div className="space-y-2">
						{phases.map((phase, idx) => (
							<div key={phase.id} className="flex items-center gap-3 rounded-md border px-4 py-3">
								<span className="text-sm text-muted-foreground w-5 text-center">{idx + 1}</span>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm">{phase.title}</p>
									<PhaseTypeIcon type={phase.type} />
								</div>
							</div>
						))}
					</div>

					{phases.length > 0 && (
						<form onSubmit={handleForceTransition} className="flex gap-3 flex-wrap pt-2">
							<select
								value={selectedPhaseId}
								onChange={(e) => setSelectedPhaseId(e.target.value)}
								className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
							>
								<option value="">フェーズを選択...</option>
								{phases.map((phase) => (
									<option key={phase.id} value={phase.id}>
										{phase.title}
									</option>
								))}
							</select>
							<Button type="submit" disabled={transitioning || !selectedPhaseId}>
								{transitioning ? "遷移中..." : "強制遷移"}
							</Button>
						</form>
					)}
				</CardContent>
			</Card>

			{/* Discussion phase controls */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">議論フェーズ操作</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						発言キューのリアルタイム状態はLiveKit接続が必要です。
						以下のボタンからキュー操作のみ実行できます。
					</p>
					<div className="flex gap-3 flex-wrap">
						<Button variant="outline" onClick={handleQueueNext} disabled={nextPending}>
							{nextPending ? "処理中..." : "次の発言者"}
						</Button>
						<Button variant="outline" onClick={handleQueueSkip} disabled={skipPending}>
							{skipPending ? "処理中..." : "スキップ"}
						</Button>
					</div>

					<div className="pt-2">
						<p className="text-xs font-medium text-muted-foreground mb-2">
							割り込み強制終了（参加者ID入力）
						</p>
						<form onSubmit={handleEndInterrupt} className="flex gap-2">
							<input
								value={interruptParticipantId}
								onChange={(e) => setInterruptParticipantId(e.target.value)}
								placeholder="参加者ID"
								className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
							/>
							<Button
								type="submit"
								variant="outline"
								size="sm"
								disabled={endingInterrupt || !interruptParticipantId}
							>
								割り込み終了
							</Button>
						</form>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
