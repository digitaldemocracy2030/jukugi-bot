import { useLocalParticipant, useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect } from "react";
import { Button, Stack, Tooltip } from "../design-system";

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
		<Stack direction="horizontal" gap={2} align="center" className={className}>
			<Tooltip
				content={
					micAllowed
						? micEnabled
							? "マイクをオフにする"
							: "マイクをオンにする"
						: "発言順番が来るとマイクをオンにできます"
				}
			>
				<Button
					variant={micEnabled ? "primary" : "secondary"}
					size="sm"
					disabled={!micAllowed || micPending}
					onClick={() => toggleMic()}
					leftIcon={micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
				>
					{micEnabled ? "マイクON" : "マイクOFF"}
				</Button>
			</Tooltip>
			<Button
				variant={cameraEnabled ? "primary" : "secondary"}
				size="sm"
				disabled={cameraPending}
				onClick={() => toggleCamera()}
				leftIcon={cameraEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
			>
				{cameraEnabled ? "カメラON" : "カメラOFF"}
			</Button>
		</Stack>
	);
}
