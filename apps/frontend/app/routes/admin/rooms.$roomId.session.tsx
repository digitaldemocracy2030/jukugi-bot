import { useQueryClient } from "@tanstack/react-query";
import {
	ArrowRightLeft,
	ListOrdered,
	MessageSquare,
	SkipForward,
	StepForward,
	UserX,
} from "lucide-react";
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
	Badge,
	Button,
	FormField,
	Input,
	PageHeader,
	Select,
	Spinner,
	Stack,
	StatCard,
	Tabs,
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
			setSelectedPhaseId("");
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

	const phaseTypes = phases.reduce(
		(acc, p) => {
			acc[p.type] = (acc[p.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const phaseTab = (
		<Stack direction="vertical" gap={4} className="mt-4">
			{isLoading && (
				<Stack direction="vertical" align="center" className="py-4">
					<Spinner label="読み込み中..." />
				</Stack>
			)}

			<div className="rounded-lg border overflow-hidden">
				{phases.map((phase, idx) => (
					<button
						type="button"
						key={phase.id}
						className={`flex items-center gap-3 px-4 py-3 w-full text-left ${idx !== phases.length - 1 ? "border-b" : ""} ${selectedPhaseId === phase.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"} transition-colors cursor-pointer`}
						onClick={() => setSelectedPhaseId(phase.id)}
					>
						<div className="flex items-center justify-center size-7 rounded-md bg-muted text-xs font-bold tabular-nums">
							{idx + 1}
						</div>
						<div className="flex-1 min-w-0">
							<Typography variant="body" className="font-medium truncate">
								{phase.title}
							</Typography>
						</div>
						<Badge variant="outline" colorScheme="default">
							<PhaseTypeIcon type={phase.type} />
						</Badge>
					</button>
				))}
			</div>

			{phases.length > 0 && (
				<form onSubmit={handleForceTransition}>
					<div className="rounded-lg border bg-muted/30 p-4">
						<Stack direction="vertical" gap={3}>
							<Typography variant="body-sm" className="font-medium">
								フェーズ強制遷移
							</Typography>
							<Stack direction="horizontal" gap={3} align="end">
								<div className="flex-1">
									<Select
										value={selectedPhaseId}
										onValueChange={setSelectedPhaseId}
										placeholder="遷移先フェーズを選択..."
										options={phases.map((phase) => ({
											value: phase.id,
											label: phase.title,
										}))}
									/>
								</div>
								<Button
									type="submit"
									variant="primary"
									leftIcon={<ArrowRightLeft className="size-3.5" />}
									loading={transitioning}
									disabled={!selectedPhaseId}
								>
									強制遷移
								</Button>
							</Stack>
						</Stack>
					</div>
				</form>
			)}
		</Stack>
	);

	const controlTab = (
		<Stack direction="vertical" gap={4} className="mt-4">
			<Alert variant="info">
				発言キューのリアルタイム状態はLiveKit接続が必要です。以下からキュー操作のみ実行できます。
			</Alert>

			<div className="rounded-lg border bg-card p-4">
				<Stack direction="vertical" gap={4}>
					<Typography variant="body-sm" className="font-semibold">
						発言キュー操作
					</Typography>
					<Stack direction="horizontal" gap={3}>
						<Button
							variant="outline"
							leftIcon={<StepForward className="size-4" />}
							onClick={handleQueueNext}
							loading={nextPending}
						>
							次の発言者
						</Button>
						<Button
							variant="outline"
							leftIcon={<SkipForward className="size-4" />}
							onClick={handleQueueSkip}
							loading={skipPending}
						>
							スキップ
						</Button>
					</Stack>
				</Stack>
			</div>

			<div className="rounded-lg border bg-card p-4">
				<Stack direction="vertical" gap={3}>
					<Typography variant="body-sm" className="font-semibold">
						割り込み強制終了
					</Typography>
					<form onSubmit={handleEndInterrupt}>
						<Stack direction="horizontal" gap={2} align="end">
							<div className="flex-1">
								<FormField label="参加者ID" htmlFor="interrupt-pid">
									<Input
										id="interrupt-pid"
										value={interruptParticipantId}
										onChange={(e) => setInterruptParticipantId(e.target.value)}
										placeholder="参加者IDを入力"
										inputSize="sm"
									/>
								</FormField>
							</div>
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								leftIcon={<UserX className="size-3.5" />}
								loading={endingInterrupt}
								disabled={!interruptParticipantId}
							>
								割り込み終了
							</Button>
						</Stack>
					</form>
				</Stack>
			</div>
		</Stack>
	);

	return (
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title="セッション進行"
				backHref={`/admin/rooms/${id}`}
				breadcrumbs={[
					{ label: "Dashboard", href: "/admin" },
					{ label: "ルーム詳細", href: `/admin/rooms/${id}` },
					{ label: "セッション進行" },
				]}
			/>

			{error && (
				<Alert variant="destructive" dismissible onDismiss={() => setError(null)}>
					{error}
				</Alert>
			)}

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					label="フェーズ数"
					value={phases.length}
					icon={<ListOrdered className="size-5" />}
					colorScheme="primary"
				/>
				<StatCard
					label="議論フェーズ"
					value={phaseTypes.discussion ?? 0}
					icon={<MessageSquare className="size-5" />}
					colorScheme="success"
				/>
				<StatCard label="動画フェーズ" value={phaseTypes.video ?? 0} />
				<StatCard
					label="投票/アンケート"
					value={(phaseTypes.voting ?? 0) + (phaseTypes.survey ?? 0)}
				/>
			</div>

			<div className="rounded-xl border bg-card shadow-sm p-6">
				<Tabs
					items={[
						{
							value: "phases",
							label: "フェーズ遷移",
							icon: <ArrowRightLeft className="size-4" />,
							content: phaseTab,
						},
						{
							value: "controls",
							label: "議論コントロール",
							icon: <MessageSquare className="size-4" />,
							content: controlTab,
						},
					]}
					defaultValue="phases"
					variant="underline"
				/>
			</div>
		</Stack>
	);
}
