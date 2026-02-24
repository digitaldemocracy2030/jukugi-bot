import type { RoomMetadata } from "~/types/room-metadata";

type Props = {
	speakerQueue: RoomMetadata["speakerQueue"];
};

export function SpeakerQueue({ speakerQueue }: Props) {
	const { currentSpeaker, queue, interruptions } = speakerQueue;

	return (
		<div className="space-y-4">
			<div>
				<p className="text-xs font-medium text-muted-foreground mb-1">現在の発言者</p>
				{currentSpeaker ? (
					<div className="rounded-md border px-3 py-2 text-sm bg-teal-50 border-teal-200">
						<span className="font-medium">{currentSpeaker.participantId}</span>
						<span className="text-muted-foreground ml-2 text-xs">
							〜 {new Date(currentSpeaker.speakingUntil).toLocaleTimeString()}
						</span>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">発言者なし</p>
				)}
			</div>

			{queue.length > 0 && (
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-1">
						発言キュー ({queue.length})
					</p>
					<ul className="space-y-1">
						{queue.map((item, idx) => (
							<li
								key={item.participantId}
								className="rounded-md border px-3 py-2 text-sm flex items-center gap-2"
							>
								<span className="text-muted-foreground text-xs">{idx + 1}</span>
								<span>{item.displayName}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{interruptions.length > 0 && (
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-1">
						割り込み ({interruptions.length})
					</p>
					<ul className="space-y-1">
						{interruptions.map((item) => (
							<li
								key={item.participantId}
								className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
							>
								{item.displayName}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
