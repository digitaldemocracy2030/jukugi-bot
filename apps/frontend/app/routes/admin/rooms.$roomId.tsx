import { useQueryClient } from "@tanstack/react-query";
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
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";

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
		<div className="flex items-center gap-3 rounded-md border px-4 py-3 bg-background">
			<div className="flex flex-col gap-0.5">
				<button
					type="button"
					onClick={onMoveUp}
					disabled={index === 0}
					className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
				>
					▲
				</button>
				<button
					type="button"
					onClick={onMoveDown}
					disabled={index === total - 1}
					className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
				>
					▼
				</button>
			</div>
			<span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>
			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm">{phase.title}</p>
				<PhaseTypeIcon type={phase.type} />
			</div>
			<div className="flex gap-1">
				<Button variant="ghost" size="sm" onClick={onEdit}>
					編集
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={onDelete}
					className="text-destructive hover:text-destructive"
				>
					削除
				</Button>
			</div>
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
		<div className="space-y-6">
			<div>
				<Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
					← ルーム一覧
				</Link>
			</div>

			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">ルーム詳細</h1>
					<p className="text-muted-foreground text-sm mt-0.5">ID: {id}</p>
				</div>
				<div className="flex gap-2 flex-wrap justify-end">
					<Button onClick={handleActivate} disabled={activating}>
						{activating ? "アクティベート中..." : "アクティベート"}
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
					<Button variant="secondary" asChild>
						<Link to={`/admin/rooms/${id}/session`}>セッション進行へ →</Link>
					</Button>
				</div>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}

			{/* フェーズ一覧 */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">フェーズ一覧</CardTitle>
						<Dialog open={addOpen} onOpenChange={setAddOpen}>
							<DialogTrigger asChild>
								<Button size="sm">+ フェーズ追加</Button>
							</DialogTrigger>
							<DialogContent className="max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>フェーズを追加</DialogTitle>
								</DialogHeader>
								<PhaseForm
									onSubmit={handleAddPhase}
									onCancel={() => setAddOpen(false)}
									submitLabel="追加"
								/>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					{phasesLoading && <p className="text-muted-foreground text-sm">読み込み中...</p>}
					{!phasesLoading && phases.length === 0 && (
						<p className="text-muted-foreground text-sm">フェーズがありません</p>
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
				</CardContent>
			</Card>

			{/* 編集ダイアログ */}
			<Dialog open={!!editingPhase} onOpenChange={(open) => !open && setEditingPhase(null)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>フェーズを編集</DialogTitle>
					</DialogHeader>
					{editingPhase && (
						<PhaseForm
							initial={editingPhase}
							onSubmit={handleEditPhase}
							onCancel={() => setEditingPhase(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
