import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";

export interface StorageConfig {
	endpoint: string;
	bucket: string;
	region: string;
	accessKey: string;
	secretKey: string;
}

export interface LiveKitEgressConfig {
	url: string;
	apiKey: string;
	apiSecret: string;
}

export interface StartRecordingResult {
	egressId: string;
	storageKey: string;
}

/**
 * Create a configured EgressClient instance.
 */
export function createEgressClient(config: LiveKitEgressConfig): EgressClient {
	return new EgressClient(config.url, config.apiKey, config.apiSecret);
}

/**
 * Start a room composite egress recording to Cloudflare R2 (S3-compatible).
 * Returns the egressId and the storage key (path within the bucket).
 */
export async function startRoomRecording(
	client: EgressClient,
	roomName: string,
	storage: StorageConfig,
	roomId: string,
): Promise<StartRecordingResult> {
	const timestamp = Date.now();
	const storageKey = `recordings/${roomId}/${timestamp}.mp4`;

	const s3Upload = new S3Upload({
		accessKey: storage.accessKey,
		secret: storage.secretKey,
		bucket: storage.bucket,
		region: storage.region,
		endpoint: storage.endpoint,
	});

	const fileOutput = new EncodedFileOutput({
		fileType: EncodedFileType.MP4,
		filepath: storageKey,
		output: {
			case: "s3",
			value: s3Upload,
		},
	});

	const egress = await client.startRoomCompositeEgress(roomName, fileOutput);

	const egressId = egress.egressId;
	if (!egressId) {
		throw new Error("EgressClient returned no egressId");
	}

	return { egressId, storageKey };
}

/**
 * Stop an active egress recording by its egressId.
 */
export async function stopEgressRecording(client: EgressClient, egressId: string): Promise<void> {
	await client.stopEgress(egressId);
}
