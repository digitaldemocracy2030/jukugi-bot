import { AccessToken } from "livekit-server-sdk";
import type { ParticipantMetadata } from "./types";

export interface TokenOptions {
	livekitApiKey: string;
	livekitApiSecret: string;
	roomName: string;
	participantId: string;
	displayName: string;
	role: "participant" | "facilitator" | "admin";
	/** Token TTL in seconds. Defaults to 6 hours. */
	ttlSeconds?: number;
}

/**
 * Generate a LiveKit AccessToken for a participant joining a room.
 * Encodes participant metadata into the token.
 */
export async function generateParticipantToken(opts: TokenOptions): Promise<string> {
	const metadata: ParticipantMetadata = {
		participantId: opts.participantId,
		role: opts.role,
		displayName: opts.displayName,
	};

	const at = new AccessToken(opts.livekitApiKey, opts.livekitApiSecret, {
		identity: opts.participantId,
		name: opts.displayName,
		ttl: opts.ttlSeconds ? `${opts.ttlSeconds}s` : "6h",
		metadata: JSON.stringify(metadata),
	});

	at.addGrant({
		room: opts.roomName,
		roomJoin: true,
		canPublish: true,
		canSubscribe: true,
		canPublishData: true,
		// facilitator and admin can update metadata
		roomAdmin: opts.role === "admin",
	});

	return at.toJwt();
}

/**
 * Generate an admin token for server-side LiveKit API calls.
 */
export async function generateAdminToken(opts: {
	livekitApiKey: string;
	livekitApiSecret: string;
	roomName: string;
}): Promise<string> {
	const at = new AccessToken(opts.livekitApiKey, opts.livekitApiSecret, {
		identity: "server-admin",
		ttl: "1h",
	});

	at.addGrant({
		room: opts.roomName,
		roomJoin: true,
		roomAdmin: true,
		canPublish: false,
		canSubscribe: true,
		canPublishData: true,
	});

	return at.toJwt();
}
