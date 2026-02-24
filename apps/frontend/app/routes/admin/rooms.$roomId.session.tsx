import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router";
import {
	useGetApiRoomsRoomIdPhases,
	usePostApiRoomsRoomIdInterruptParticipantIdEnd,
	usePostApiRoomsRoomIdPhaseTransition,
	usePostApiRoomsRoomIdQueueNext,
	usePostApiRoomsRoomIdQueueSkip,
} from "~/api/gen/breakoutDeliberationOSAPI";
import { PhaseTypeIcon } from "~/components/admin/PhaseTypeIcon";
import {
	Alert,
	Button,
	FormField,
	Input,
	PageHeader,
	Select,
	Spinner,
	Stack,
	Typography,
} from "~/components/design-system";

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
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title="セッション進行"
				backHref={`/admin/rooms/${id}`}
				breadcrumbs={[
					{ label: "ルーム一覧", href: "/admin" },
					{ label: "ルーム詳細", href: `/admin/rooms/${id}` },
					{ label: "セッション進行" },
				]}
			/>

			{error && (
				<Alert variant="destructive" dismissible>
					{error}
				</Alert>
			)}

			{/* Phase overview & transition */}
			<div className="rounded-xl border bg-card shadow-sm">
				<div className="p-4 border-b">
					<Typography variant="h4">フェーズ一覧・遷移</Typography>
				</div>
				<div className="p-4">
					<Stack direction="vertical" gap={4}>
						{isLoading && (
							<Stack direction="vertical" align="center" className="py-4">
								<Spinner label="読み込み中..." />
							</Stack>
						)}
						<Stack direction="vertical" gap={2}>
							{phases.map((phase, idx) => (
								<div key={phase.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
									<Typography variant="caption" className="w-5 text-center">
										{idx + 1}
									</Typography>
									<div className="flex-1 min-w-0">
										<Typography variant="h4" className="truncate">
											{phase.title}
										</Typography>
										<PhaseTypeIcon type={phase.type} />
									</div>
								</div>
							))}
						</Stack>

						{phases.length > 0 && (
							<form onSubmit={handleForceTransition}>
								<Stack direction="horizontal" gap={3} wrap className="pt-2">
									<div className="flex-1">
										<Select
											value={selectedPhaseId}
											onValueChange={setSelectedPhaseId}
											placeholder="フェーズを選択..."
											options={phases.map((phase) => ({
												value: phase.id,
												label: phase.title,
											}))}
										/>
									</div>
									<Button
										type="submit"
										variant="primary"
										loading={transitioning}
										disabled={!selectedPhaseId}
									>
										強制遷移
									</Button>
								</Stack>
							</form>
						)}
					</Stack>
				</div>
			</div>

			{/* Discussion phase controls */}
			<div className="rounded-xl border bg-card shadow-sm">
				<div className="p-4 border-b">
					<Typography variant="h4">議論フェーズ操作</Typography>
				</div>
				<div className="p-4">
					<Stack direction="vertical" gap={4}>
						<Typography variant="body" color="muted">
							発言キューのリアルタイム状態はLiveKit接続が必要です。
							以下のボタンからキュー操作のみ実行できます。
						</Typography>
						<Stack direction="horizontal" gap={3} wrap>
							<Button variant="outline" onClick={handleQueueNext} loading={nextPending}>
								次の発言者
							</Button>
							<Button variant="outline" onClick={handleQueueSkip} loading={skipPending}>
								スキップ
							</Button>
						</Stack>

						<div className="pt-2">
							<FormField label="割り込み強制終了（参加者ID入力）">
								<form onSubmit={handleEndInterrupt}>
									<Stack direction="horizontal" gap={2}>
										<Input
											value={interruptParticipantId}
											onChange={(e) => setInterruptParticipantId(e.target.value)}
											placeholder="参加者ID"
											inputSize="sm"
										/>
										<Button
											type="submit"
											variant="outline"
											size="sm"
											loading={endingInterrupt}
											disabled={!interruptParticipantId}
										>
											割り込み終了
										</Button>
									</Stack>
								</form>
							</FormField>
						</div>
					</Stack>
				</div>
			</div>
		</Stack>
	);
}
