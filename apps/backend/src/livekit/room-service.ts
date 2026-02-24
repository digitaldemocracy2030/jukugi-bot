import { RoomServiceClient, TrackSource } from "livekit-server-sdk";

export interface LiveKitConfig {
	url: string;
	apiKey: string;
	apiSecret: string;
}

/**
 * Create a configured RoomServiceClient instance.
 */
export function createRoomServiceClient(config: LiveKitConfig): RoomServiceClient {
	return new RoomServiceClient(config.url, config.apiKey, config.apiSecret);
}

/**
 * Create (or ensure existence of) a LiveKit room.
 * LiveKit auto-creates rooms on first join, but explicit creation lets us
 * configure max participants and set initial metadata.
 */
export async function ensureLiveKitRoom(
	client: RoomServiceClient,
	roomName: string,
	options: {
		maxParticipants?: number;
		emptyTimeoutSeconds?: number;
		metadata?: string;
	} = {},
): Promise<void> {
	await client.createRoom({
		name: roomName,
		maxParticipants: options.maxParticipants,
		emptyTimeout: options.emptyTimeoutSeconds ?? 300,
		metadata: options.metadata,
	});
}

/**
 * Update the metadata string on an active LiveKit room.
 */
export async function updateRoomMetadata(
	client: RoomServiceClient,
	roomName: string,
	metadata: string,
): Promise<void> {
	await client.updateRoomMetadata(roomName, metadata);
}

/**
 * Mute or unmute a specific track kind for a participant.
 * Used when transitioning phases (e.g. muting microphones on video phase).
 */
export async function setParticipantMute(
	client: RoomServiceClient,
	roomName: string,
	participantIdentity: string,
	trackSid: string,
	muted: boolean,
): Promise<void> {
	await client.mutePublishedTrack(roomName, participantIdentity, trackSid, muted);
}

/**
 * Send a data message to all participants in a room via the server.
 */
export async function sendDataToRoom(
	client: RoomServiceClient,
	roomName: string,
	data: Uint8Array,
): Promise<void> {
	await client.sendData(roomName, data, 0);
}

/**
 * List all participants currently in a room.
 */
export async function listRoomParticipants(client: RoomServiceClient, roomName: string) {
	return client.listParticipants(roomName);
}

/**
 * Remove a participant from a room.
 */
export async function removeParticipant(
	client: RoomServiceClient,
	roomName: string,
	participantIdentity: string,
): Promise<void> {
	await client.removeParticipant(roomName, participantIdentity);
}

/**
 * Grant or revoke microphone publishing for a participant.
 * Camera is always allowed; only the microphone is toggled by the speaking queue.
 *
 * canMic: true  → camera + microphone allowed (speaking turn)
 * canMic: false → camera only (waiting / not speaking)
 */
export async function setParticipantMicPermission(
	client: RoomServiceClient,
	roomName: string,
	participantIdentity: string,
	canMic: boolean,
): Promise<void> {
	await client.updateParticipant(roomName, participantIdentity, {
		permission: {
			canPublish: true,
			canSubscribe: true,
			canPublishData: true,
			canPublishSources: canMic
				? [
						TrackSource.CAMERA,
						TrackSource.MICROPHONE,
						TrackSource.SCREEN_SHARE,
						TrackSource.SCREEN_SHARE_AUDIO,
					]
				: [TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
		},
	});
}
