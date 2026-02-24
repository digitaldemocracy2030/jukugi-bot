/**
 * LiveKit SDK mock helpers for tests.
 *
 * Usage in test files:
 *   import { setupLiveKitMocks, mockRoomMetadata } from "./helpers/livekit-mock";
 *   vi.mock("livekit-server-sdk", () => setupLiveKitMocks());
 */

import { vi } from "vitest";
import type { RoomMetadata } from "../../src/livekit/types";

/** In-memory store for metadata updated during tests */
let _storedMetadata: string | null = null;

export function getStoredMetadata(): string | null {
	return _storedMetadata;
}

export function setStoredMetadata(meta: string | null): void {
	_storedMetadata = meta;
}

export function resetLiveKitMockState(): void {
	_storedMetadata = null;
}

/**
 * Build a minimal RoomMetadata object for mock responses.
 */
export function buildMockRoomMetadata(
	roomId: string,
	overrides: Partial<RoomMetadata> = {},
): RoomMetadata {
	return {
		roomId,
		currentPhaseId: null,
		currentPhaseType: null,
		featureFlags: {
			canSpeak: false,
			canInterrupt: false,
			canVote: false,
		},
		speakerQueue: {
			currentSpeaker: null,
			queue: [],
			interruptions: [],
		},
		...overrides,
	};
}

/**
 * Returns a vi.mock factory for livekit-server-sdk.
 * Call this inside vi.mock("livekit-server-sdk", () => setupLiveKitMocks()).
 */
export function setupLiveKitMocks(initialMetadata?: RoomMetadata) {
	if (initialMetadata) {
		_storedMetadata = JSON.stringify(initialMetadata);
	}

	const mockUpdateParticipant = vi.fn().mockResolvedValue({});
	const mockCreateRoom = vi.fn().mockResolvedValue({});
	const mockUpdateRoomMetadata = vi
		.fn()
		.mockImplementation(async (_roomName: string, meta: string) => {
			_storedMetadata = meta;
			return {};
		});
	const mockListRooms = vi.fn().mockImplementation(async () => {
		if (_storedMetadata === null) return [];
		return [{ metadata: _storedMetadata }];
	});

	const RoomServiceClientMock = vi.fn().mockImplementation(() => ({
		createRoom: mockCreateRoom,
		updateRoomMetadata: mockUpdateRoomMetadata,
		listRooms: mockListRooms,
		updateParticipant: mockUpdateParticipant,
		listParticipants: vi.fn().mockResolvedValue([]),
		removeParticipant: vi.fn().mockResolvedValue({}),
		mutePublishedTrack: vi.fn().mockResolvedValue({}),
		sendData: vi.fn().mockResolvedValue({}),
	}));

	const mockToJwt = vi.fn().mockResolvedValue("mock-livekit-token");
	const mockAddGrant = vi.fn();

	const AccessTokenMock = vi.fn().mockImplementation(() => ({
		addGrant: mockAddGrant,
		toJwt: mockToJwt,
	}));

	return {
		RoomServiceClient: RoomServiceClientMock,
		AccessToken: AccessTokenMock,
		// expose mocks for assertion in tests
		_mocks: {
			mockCreateRoom,
			mockUpdateRoomMetadata,
			mockListRooms,
			mockUpdateParticipant,
			mockToJwt,
			mockAddGrant,
		},
	};
}
