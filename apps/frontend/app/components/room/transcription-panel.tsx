import { useParticipants } from "@livekit/components-react";
import { useState } from "react";
import type { TranscriptionEntry } from "../../hooks/use-transcription";
import { Badge, Button, Stack, Typography } from "../design-system";

type TranscriptionPanelProps = {
	entries: TranscriptionEntry[];
};

function resolveDisplayName(
	entry: { participantIdentity: string; displayName: string | null },
	participants: { identity: string; name?: string; metadata?: string }[],
): string {
	// Prefer displayName from backend API
	if (entry.displayName) return entry.displayName;
	// Fallback: LiveKit participant name
	const participant = participants.find((p) => p.identity === entry.participantIdentity);
	if (participant?.name) return participant.name;
	if (participant?.metadata) {
		try {
			const meta = JSON.parse(participant.metadata);
			if (meta.displayName) return meta.displayName;
		} catch {
			// ignore
		}
	}
	return entry.participantIdentity;
}

export function TranscriptionPanel({ entries }: TranscriptionPanelProps) {
	const [open, setOpen] = useState(false);
	const participants = useParticipants();

	if (entries.length === 0 && !open) {
		return null;
	}

	return (
		<section className="border-t pt-3">
			<Stack direction="horizontal" gap={2} align="center" className="mb-2">
				<Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
					{open ? "文字起こしを閉じる" : "文字起こしを表示"}
				</Button>
				{entries.length > 0 && (
					<Badge variant="subtle" colorScheme="info">
						{entries.length}
					</Badge>
				)}
			</Stack>

			{open && (
				<div className="max-h-48 overflow-y-auto rounded-md bg-muted/30 p-3 space-y-2">
					{entries.length === 0 ? (
						<Typography variant="body" color="muted">
							文字起こしはまだありません
						</Typography>
					) : (
						entries.map((entry) => (
							<div key={entry.id} className="flex gap-2 text-sm">
								<Typography variant="caption" weight="semibold" className="shrink-0 min-w-[5rem]">
									{resolveDisplayName(entry, participants)}
								</Typography>
								<Typography
									variant="body"
									color={entry.isFinal ? "default" : "muted"}
									className={entry.isFinal ? "" : "italic"}
								>
									{entry.text}
								</Typography>
							</div>
						))
					)}
				</div>
			)}
		</section>
	);
}
