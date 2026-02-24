import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import {
	useDeleteApiRoomsRoomIdPhasesPhaseId,
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
import {
	Alert,
	Button,
	EmptyState,
	IconButton,
	Modal,
	PageHeader,
	Spinner,
	Stack,
	Typography,
} from "~/components/design-system";

export function meta() {
	return [{ title: "ルーム詳細 | OSODP Admin" }];
}

// ─── フェーズ行 ────────────────────────────────────────────────────────────────
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
		<div className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-background hover:bg-muted/30 transition-colors">
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
			<Typography variant="caption" className="w-5 text-center">
				{index + 1}
			</Typography>
			<div className="flex-1 min-w-0">
				<Typography variant="h4" className="truncate">
					{phase.title}
				</Typography>
				<PhaseTypeIcon type={phase.type} />
			</div>
			<Stack direction="horizontal" gap={1}>
				<Button
					variant="ghost"
					size="sm"
					leftIcon={<Pencil className="size-3.5" />}
					onClick={onEdit}
				>
					編集
				</Button>
				<Button
					variant="ghost"
					size="sm"
					leftIcon={<Trash2 className="size-3.5" />}
					onClick={onDelete}
					className="text-destructive hover:text-destructive"
				>
					削除
				</Button>
			</Stack>
		</div>
	);
}

// ─── メインページ ──────────────────────────────────────────────────────────────
export default function AdminRoomDetailPage() {
	const { roomId } = useParams<{ roomId: string }>();
	const queryClient = useQueryClient();

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
	const [error, setError] = useState<string | null>(null);

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

	async function handleDeletePhase(phaseId: string) {
		setError(null);
		try {
			await deletePhase({ roomId: id, phaseId });
			invalidate();
		} catch {
			setError("フェーズ削除に失敗しました");
		}
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

	return (
		<Stack direction="vertical" gap={6}>
			<PageHeader
				title="ルーム詳細"
				subtitle={`ID: ${id}`}
				backHref="/admin"
				breadcrumbs={[{ label: "ルーム一覧", href: "/admin" }, { label: "ルーム詳細" }]}
				actions={
					<Stack direction="horizontal" gap={2} wrap>
						<Button variant="primary" onClick={handleActivate} loading={activating}>
							アクティベート
						</Button>
						<Button
							variant="outline"
							onClick={() => handleStatusChange("completed")}
							disabled={updatingRoom}
						>
							完了にする
						</Button>
						<Button
							variant="outline"
							onClick={() => handleStatusChange("archived")}
							disabled={updatingRoom}
						>
							アーカイブ
						</Button>
						<Button variant="secondary" rightIcon={<ArrowRight className="size-4" />} asChild>
							<Link to={`/admin/rooms/${id}/session`}>セッション進行へ</Link>
						</Button>
					</Stack>
				}
			/>

			{error && <Alert variant="destructive">{error}</Alert>}

			{/* フェーズ一覧 */}
			<div className="rounded-xl border bg-card shadow-sm">
				<div className="p-4 border-b">
					<Stack direction="horizontal" align="center" justify="between">
						<Typography variant="h4">フェーズ一覧</Typography>
						<Button
							size="sm"
							variant="primary"
							leftIcon={<Plus className="size-3.5" />}
							onClick={() => setAddOpen(true)}
						>
							フェーズ追加
						</Button>
					</Stack>
				</div>
				<div className="p-4">
					<Stack direction="vertical" gap={2}>
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
						{phases.map((phase, idx) => (
							<PhaseListItem
								key={phase.id}
								phase={phase}
								index={idx}
								total={phases.length}
								onMoveUp={() => handleMove(idx, idx - 1)}
								onMoveDown={() => handleMove(idx, idx + 1)}
								onDelete={() => handleDeletePhase(phase.id)}
								onEdit={() => setEditingPhase(phase)}
							/>
						))}
					</Stack>
				</div>
			</div>

			{/* 追加モーダル */}
			<Modal open={addOpen} onOpenChange={setAddOpen} title="フェーズを追加" size="lg">
				<PhaseForm
					onSubmit={handleAddPhase}
					onCancel={() => setAddOpen(false)}
					submitLabel="追加"
				/>
			</Modal>

			{/* 編集モーダル */}
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
		</Stack>
	);
}
