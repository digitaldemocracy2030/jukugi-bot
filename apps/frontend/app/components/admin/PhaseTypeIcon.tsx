import type { PhaseType } from "~/api/models/phaseType";

const icons: Record<PhaseType, string> = {
	video: "▶",
	discussion: "💬",
	voting: "🗳",
	survey: "📋",
};

const labels: Record<PhaseType, string> = {
	video: "動画",
	discussion: "議論",
	voting: "投票",
	survey: "アンケート",
};

export function PhaseTypeIcon({ type }: { type: PhaseType }) {
	return (
		<span title={labels[type]} className="text-sm">
			{icons[type]} {labels[type]}
		</span>
	);
}
