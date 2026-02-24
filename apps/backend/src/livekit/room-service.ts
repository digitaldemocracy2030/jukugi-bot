import { RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { deserializeMetadata } from "./metadata";
import type { RoomMetadata } from "./types";

/** Cloudflare Workers env bindings required for LiveKit. */
export interface LiveKitEnv {
	LIVEKIT_URL: string;
	LIVEKIT_API_KEY: string;
	LIVEKIT_API_SECRET: string;
}

let _client: RoomServiceClient | null = null;

/**
 * Initialize the module-level LiveKit RoomServiceClient.
 * Call this once per request in Hono middleware via `initLiveKit(c.env)`.
 * CF Workers env bindings are deploy-time constants, so reinitializing each
 * request with the same values is safe and idempotent.
 */
export function initLiveKit(env: LiveKitEnv): void {
	_client = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
}

function getClient(): RoomServiceClient {
	if (!_client) throw new Error("LiveKit not initialized. Call initLiveKit(env) first.");
	return _client;
}

/**
 * Create (or ensure existence of) a LiveKit room.
 * LiveKit auto-creates rooms on first join, but explicit creation lets us
 * configure max participants and set initial metadata.
 */
export async function ensureLiveKitRoom(
	roomName: string,
	options: {
		maxParticipants?: number;
		emptyTimeoutSeconds?: number;
		metadata?: string;
	} = {},
): Promise<void> {
	await getClient().createRoom({
		name: roomName,
		maxParticipants: options.maxParticipants,
		emptyTimeout: options.emptyTimeoutSeconds ?? 300,
		metadata: options.metadata,
	});
}

/**
 * Update the metadata string on an active LiveKit room.
 */
export async function updateRoomMetadata(roomName: string, metadata: string): Promise<void> {
	await getClient().updateRoomMetadata(roomName, metadata);
}

/**
 * Fetch and deserialize the current LiveKit room metadata.
 * Returns null if the room does not exist or has no metadata.
 */
export async function fetchRoomMetadata(roomName: string): Promise<RoomMetadata | null> {
	try {
		const rooms = await getClient().listRooms([roomName]);
		if (!rooms.length) return null;
		return deserializeMetadata(rooms[0].metadata);
	} catch {
		return null;
	}
}

/**
 * Mute or unmute a specific track kind for a participant.
 * Used when transitioning phases (e.g. muting microphones on video phase).
 */
export async function setParticipantMute(
	roomName: string,
	participantIdentity: string,
	trackSid: string,
	muted: boolean,
): Promise<void> {
	await getClient().mutePublishedTrack(roomName, participantIdentity, trackSid, muted);
}

/**
 * Send a data message to all participants in a room via the server.
 */
export async function sendDataToRoom(roomName: string, data: Uint8Array): Promise<void> {
	await getClient().sendData(roomName, data, 0);
}

/**
 * List all participants currently in a room.
 */
export async function listRoomParticipants(roomName: string) {
	return getClient().listParticipants(roomName);
}

/**
 * Delete a LiveKit room, disconnecting all participants immediately.
 * Throws if the room does not exist; callers should catch if needed.
 */
export async function deleteRoom(roomName: string): Promise<void> {
	await getClient().deleteRoom(roomName);
}

/**
 * Remove a participant from a room.
 */
export async function removeParticipant(
	roomName: string,
	participantIdentity: string,
): Promise<void> {
	await getClient().removeParticipant(roomName, participantIdentity);
}

/**
 * Grant or revoke microphone publishing for a participant.
 * Camera is always allowed; only the microphone is toggled by the speaking queue.
 *
 * canMic: true  → camera + microphone allowed (speaking turn)
 * canMic: false → camera only (waiting / not speaking)
 */
export async function setParticipantMicPermission(
	roomName: string,
	participantIdentity: string,
	canMic: boolean,
): Promise<void> {
	await getClient().updateParticipant(roomName, participantIdentity, {
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
