import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "../ui/button";

export function MediaControls({ className }: { className?: string }) {
	const {
		toggle: toggleCamera,
		enabled: cameraEnabled,
		pending: cameraPending,
	} = useTrackToggle({
		source: Track.Source.Camera,
	});

	return (
		<div className={`flex items-center gap-2 ${className ?? ""}`}>
			<Button
				variant={cameraEnabled ? "default" : "secondary"}
				size="sm"
				disabled={cameraPending}
				onClick={() => toggleCamera()}
			>
				{cameraEnabled ? "📷 カメラON" : "📷 カメラOFF"}
			</Button>
		</div>
	);
}
