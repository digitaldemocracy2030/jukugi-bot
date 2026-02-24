import { useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	ChevronDown,
	ChevronUp,
	Copy,
	ListOrdered,
	Pencil,
	Play,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
	useDeleteApiRoomsRoomIdPhasesPhaseId,
	useGetApiRooms,
	useGetApiRoomsRoomIdPhases,
	usePatchApiRoomsRoomId,
	usePatchApiRoomsRoomIdPhasesPhaseId,
	usePostApiRoomsRoomIdActivate,
	usePostApiRoomsRoomIdPhases,
	usePutApiRoomsRoomIdPhasesReorder,
} from "~/api/gen/breakoutDeliberationOSAPI";
import type { Phase } from "~/api/models";
import { PhaseForm, type PhaseFormValues } from "~/components/admin/PhaseForm";
import { PhaseTypeIcon } from "~/components/admin/PhaseTypeIcon";
import { RoomStatusBadge } from "~/components/admin/RoomStatusBadge";
import {
	Alert,
	Badge,
	Button,
	ConfirmDialog,
	EmptyState,
	FormField,
	FormSection,
	IconButton,
	Input,
	Modal,
	PageHeader,
	Spinner,
	Stack,
	StatCard,
	Tabs,
	Typography,
} from "~/components/design-system";

export function meta() {
	return [{ title: "ルーム詳細 | OSODP Admin" }];
}

function PhaseListItem({
	phase,
	index,
	total,
	onMoveUp,
	onMoveDown,
	onDelete,
	onEdit,
}: {
	phase: Phase;
	index: number;
	total: number;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
	onEdit: () => void;
}) {
	return (
		<div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-background hover:bg-muted/30 transition-colors group">
			<Stack direction="vertical" gap={0}>
				<IconButton
					variant="ghost"
					size="sm"
					icon={<ChevronUp className="size-3" />}
					onClick={onMoveUp}
					disabled={index === 0}
					aria-label="上に移動"
				/>
				<IconButton
					variant="ghost"
					size="sm"
					icon={<ChevronDown className="size-3" />}
					onClick={onMoveDown}
					disabled={index === total - 1}
					aria-label="下に移動"
				/>
			</Stack>
			<div className="flex items-center justify-center size-7 rounded-md bg-muted text-xs font-bold tabular-nums">
				{index + 1}
			</div>
			<div className="flex-1 min-w-0">
				<Stack direction="horizontal" align="center" gap={2}>
					<Typography variant="body" className="font-medium truncate">
						{phase.title}
					</Typography>
					<Badge variant="outline" colorScheme="default">
						<PhaseTypeIcon type={phase.type} />
					</Badge>
				</Stack>
			</div>
			<Stack
				direction="horizontal"
				gap={1}
				className="opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<IconButton
					variant="ghost"
					size="sm"
					icon={<Pencil className="size-3.5" />}
					onClick={onEdit}
					aria-label="編集"
				/>
				<IconButton
					variant="ghost"
					size="sm"
					icon={<Trash2 className="size-3.5 text-destructive" />}
					onClick={onDelete}
					aria-label="削除"
				/>
			</Stack>
		</div>
	);
}

export default function AdminRoomDetailPage() {
	const { roomId } = useParams<{ roomId: string }>();
	const queryClient = useQueryClient();

	const { data: roomsData } = useGetApiRooms(undefined);
	const { data: phasesData, isLoading: phasesLoading } = useGetApiRoomsRoomIdPhases(roomId ?? "", {
		query: { enabled: !!roomId },
	});
	const { mutateAsync: activateRoom, isPending: activating } = usePostApiRoomsRoomIdActivate();
	const { mutateAsync: updateRoom, isPending: updatingRoom } = usePatchApiRoomsRoomId();
	const { mutateAsync: createPhase } = usePostApiRoomsRoomIdPhases();
	const { mutateAsync: updatePhase } = usePatchApiRoomsRoomIdPhasesPhaseId();
	const { mutateAsync: deletePhase } = useDeleteApiRoomsRoomIdPhasesPhaseId();
	const { mutateAsync: reorderPhases } = usePutApiRoomsRoomIdPhasesReorder();

	const [addOpen, setAddOpen] = useState(false);
	const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Phase | null>(null);
	const [error, setError] = useState<string | null>(null);

	const allRooms = roomsData?.status === 200 ? roomsData.data : [];
	const room = allRooms.find((r) => r.id === roomId) ?? null;
	const phases = phasesData?.status === 200 ? phasesData.data : [];

	if (!roomId) return null;
	const id = roomId;

	function invalidate() {
		queryClient.invalidateQueries();
	}

	async function handleActivate() {
		setError(null);
		try {
			await activateRoom({ roomId: id });
			invalidate();
		} catch {
			setError("アクティベートに失敗しました");
		}
	}

	async function handleStatusChange(status: "completed" | "archived") {
		setError(null);
		try {
			await updateRoom({ roomId: id, data: { status } });
			invalidate();
		} catch {
			setError("ステータス変更に失敗しました");
		}
	}

	async function handleAddPhase(values: PhaseFormValues) {
		await createPhase({
			roomId: id,
			data: {
				type: values.type,
				title: values.title,
				sortOrder: phases.length,
				config: values.config,
				featureFlags: values.featureFlags,
			} as Parameters<typeof createPhase>[0]["data"],
		});
		invalidate();
		setAddOpen(false);
	}

	async function handleEditPhase(values: PhaseFormValues) {
		if (!editingPhase) return;
		await updatePhase({
			roomId: id,
			phaseId: editingPhase.id,
			data: {
				title: values.title,
				config: values.config,
				featureFlags: values.featureFlags,
			},
		});
		invalidate();
		setEditingPhase(null);
	}

	async function handleDeletePhase() {
		if (!deleteTarget) return;
		setError(null);
		try {
			await deletePhase({ roomId: id, phaseId: deleteTarget.id });
			invalidate();
		} catch {
			setError("フェーズ削除に失敗しました");
		}
		setDeleteTarget(null);
	}

	async function handleMove(fromIndex: number, toIndex: number) {
		const reordered = [...phases];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);
		try {
			await reorderPhases({
				roomId: id,
				data: { orderedIds: reordered.map((p) => p.id) },
			});
			invalidate();
		} catch {
			setError("並び替えに失敗しました");
		}
	}

	const phasesTab = (
		<Stack direction="vertical" gap={4} className="mt-4">
			<Stack direction="horizontal" align="center" justify="between">
				<Stack direction="horizontal" align="center" gap={2}>
					<ListOrdered className="size-4 text-muted-foreground" />
					<Typography variant="body" className="font-medium">
						フェーズ一覧
					</Typography>
					<Badge variant="subtle" colorScheme="default">
						{phases.length}
					</Badge>
				</Stack>
				<Button
					size="sm"
					variant="primary"
					leftIcon={<Plus className="size-3.5" />}
					onClick={() => setAddOpen(true)}
				>
					フェーズ追加
				</Button>
			</Stack>

			{phasesLoading && (
				<Stack direction="vertical" align="center" className="py-8">
					<Spinner label="読み込み中..." />
				</Stack>
			)}
			{!phasesLoading && phases.length === 0 && (
				<EmptyState
					title="フェーズがありません"
					description="フェーズを追加してセッションの流れを設計しましょう。"
					action={
						<Button
							size="sm"
							variant="primary"
							leftIcon={<Plus className="size-3.5" />}
							onClick={() => setAddOpen(true)}
						>
							フェーズ追加
						</Button>
					}
				/>
			)}
			<Stack direction="vertical" gap={2}>
				{phases.map((phase, idx) => (
					<PhaseListItem
						key={phase.id}
						phase={phase}
						index={idx}
						total={phases.length}
						onMoveUp={() => handleMove(idx, idx - 1)}
						onMoveDown={() => handleMove(idx, idx + 1)}
						onDelete={() => setDeleteTarget(phase)}
						onEdit={() => setEditingPhase(phase)}
					/>
				))}
			</Stack>
		</Stack>
	);

	const settingsTab = (
		<Stack direction="vertical" gap={0} className="mt-4">
			<FormSection title="基本情報" description="ルームの基本設定を管理します">
				<Stack direction="vertical" gap={3}>
					<FormField label="ルームID">
						<Stack direction="horizontal" gap={2} align="center">
							<Input value={id} readOnly inputSize="sm" className="font-mono" />
							<IconButton
								variant="outline"
								size="sm"
								icon={<Copy className="size-3.5" />}
								onClick={() => navigator.clipboard.writeText(id)}
								aria-label="IDをコピー"
							/>
						</Stack>
					</FormField>
					{room && (
						<>
							<FormField label="タイトル">
								<Typography variant="body">{room.title}</Typography>
							</FormField>
							<FormField label="スラッグ">
								<Typography variant="body" className="font-mono">
									/{room.slug}
								</Typography>
							</FormField>
							{room.description && (
								<FormField label="説明">
									<Typography variant="body" color="muted">
										{room.description}
									</Typography>
								</FormField>
							)}
							<FormField label="最大参加者数">
								<Typography variant="body">{room.maxParticipants}人</Typography>
							</FormField>
						</>
					)}
				</Stack>
			</FormSection>
			<FormSection title="ステータス管理" description="ルームのライフサイクルを操作します">
				<Stack direction="horizontal" gap={3} wrap>
					<Button
						variant="primary"
						leftIcon={<Play className="size-3.5" />}
						onClick={handleActivate}
						loading={activating}
						disabled={room?.status === "active"}
					>
						アクティベート
					</Button>
					<Button
						variant="outline"
						onClick={() => handleStatusChange("completed")}
						disabled={updatingRoom || room?.status === "completed"}
					>
						完了にする
					</Button>
					<Button
						variant="outline"
						onClick={() => handleStatusChange("archived")}
						disabled={updatingRoom || room?.status === "archived"}
					>
						アーカイブ
					</Button>
				</Stack>
			</FormSection>
		</Stack>
	);

	return (
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title={room?.title ?? "ルーム詳細"}
				subtitle={room ? `/${room.slug}` : `ID: ${id}`}
				backHref="/admin"
				breadcrumbs={[
					{ label: "Dashboard", href: "/admin" },
					{ label: room?.title ?? "ルーム詳細" },
				]}
				badge={room ? <RoomStatusBadge status={room.status} /> : undefined}
				actions={
					<Button variant="secondary" rightIcon={<ArrowRight className="size-4" />} asChild>
						<Link to={`/admin/rooms/${id}/session`}>セッション進行</Link>
					</Button>
				}
			/>

			{error && (
				<Alert variant="destructive" dismissible onDismiss={() => setError(null)}>
					{error}
				</Alert>
			)}

			<div className="grid grid-cols-3 gap-4">
				<StatCard
					label="フェーズ数"
					value={phases.length}
					icon={<ListOrdered className="size-5" />}
					colorScheme="primary"
				/>
				<StatCard
					label="ステータス"
					value={
						room
							? { draft: "下書き", active: "開催中", completed: "完了", archived: "アーカイブ" }[
									room.status
								]
							: "-"
					}
					colorScheme={
						room?.status === "active"
							? "success"
							: room?.status === "completed"
								? "primary"
								: "default"
					}
				/>
				<StatCard label="最大参加者数" value={room?.maxParticipants ?? "-"} unit="人" />
			</div>

			<div className="rounded-xl border bg-card shadow-sm p-6">
				<Tabs
					items={[
						{
							value: "phases",
							label: "フェーズ設計",
							icon: <ListOrdered className="size-4" />,
							badge: phases.length,
							content: phasesTab,
						},
						{
							value: "settings",
							label: "設定",
							icon: <Settings className="size-4" />,
							content: settingsTab,
						},
					]}
					defaultValue="phases"
					variant="underline"
				/>
			</div>

			<Modal open={addOpen} onOpenChange={setAddOpen} title="フェーズを追加" size="lg">
				<PhaseForm
					onSubmit={handleAddPhase}
					onCancel={() => setAddOpen(false)}
					submitLabel="追加"
				/>
			</Modal>

			<Modal
				open={!!editingPhase}
				onOpenChange={(open) => !open && setEditingPhase(null)}
				title="フェーズを編集"
				size="lg"
			>
				{editingPhase && (
					<PhaseForm
						initial={editingPhase}
						onSubmit={handleEditPhase}
						onCancel={() => setEditingPhase(null)}
					/>
				)}
			</Modal>

			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				title="フェーズを削除"
				description={`「${deleteTarget?.title}」を削除します。この操作は取り消せません。`}
				confirmVariant="destructive"
				onConfirm={handleDeletePhase}
			/>
		</Stack>
	);
}
