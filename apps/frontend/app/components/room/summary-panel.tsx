import { useState } from "react";
import { useGetApiRoomsRoomIdPhasesPhaseIdSummariesLatest } from "../../../src/api/gen/breakoutDeliberationOSAPI";
import { Badge, Button, Spinner, Stack, Typography } from "../design-system";

type SummaryPanelProps = {
	roomId: string;
	phaseId: string | null;
};

export function SummaryPanel({ roomId, phaseId }: SummaryPanelProps) {
	const [open, setOpen] = useState(true);

	const { data: summaryData, isLoading } = useGetApiRoomsRoomIdPhasesPhaseIdSummariesLatest(
		roomId,
		phaseId ?? "",
		{
			query: {
				enabled: !!phaseId,
				refetchInterval: 5000,
				staleTime: 4000,
			},
		},
	);

	const summary = summaryData?.status === 200 ? summaryData.data.summary : null;

	return (
		<section className="border-t pt-3">
			<Stack direction="horizontal" gap={2} align="center" className="mb-2 px-4">
				<Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
					{open ? "要約を閉じる" : "議論の要約を表示"}
				</Button>
				{isLoading && <Spinner size="sm" />}
				{summary && (
					<Badge variant="subtle" colorScheme="success">
						更新済み
					</Badge>
				)}
			</Stack>

			{open && (
				<div className="mx-4 rounded-md bg-muted/30 p-3">
					{!summary ? (
						<Typography variant="body" color="muted">
							要約はまだ生成されていません
						</Typography>
					) : (
						<Stack direction="vertical" gap={2}>
							<Typography variant="body" className="whitespace-pre-wrap">
								{summary.content}
							</Typography>
							<Typography variant="caption" color="muted">
								最終更新: {new Date(summary.updatedAt).toLocaleTimeString("ja-JP")}
							</Typography>
						</Stack>
					)}
				</div>
			)}
		</section>
	);
}
