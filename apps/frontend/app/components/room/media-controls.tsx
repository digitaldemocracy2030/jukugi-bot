import { useLocalParticipant, useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect } from "react";
import { Button } from "../ui/button";

type MediaControlsProps = {
	className?: string;
	/** true のとき（自分の発言番）だけマイクONを許可する */
	micAllowed?: boolean;
};

export function MediaControls({ className, micAllowed = false }: MediaControlsProps) {
	const { localParticipant } = useLocalParticipant();

	const {
		toggle: toggleCamera,
		enabled: cameraEnabled,
		pending: cameraPending,
	} = useTrackToggle({ source: Track.Source.Camera });

	const {
		toggle: toggleMic,
		enabled: micEnabled,
		pending: micPending,
	} = useTrackToggle({ source: Track.Source.Microphone });

	// 発言権が来たら自動でON、失ったら自動でOFF
	// micEnabled は依存に含めない → 手動OFFを保持するため
	useEffect(() => {
		localParticipant.setMicrophoneEnabled(micAllowed);
	}, [micAllowed, localParticipant]);

	return (
		<div className={`flex items-center gap-2 ${className ?? ""}`}>
			<Button
				variant={micEnabled ? "default" : "secondary"}
				size="sm"
				disabled={!micAllowed || micPending}
				onClick={() => toggleMic()}
				title={micAllowed ? undefined : "発言順番が来るとマイクをオンにできます"}
			>
				{micEnabled ? "🎙️ マイクON" : "🎙️ マイクOFF"}
			</Button>
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
