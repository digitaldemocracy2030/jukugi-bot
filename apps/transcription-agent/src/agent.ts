import { fileURLToPath } from "node:url";
import {
	cli,
	defineAgent,
	type JobContext,
	type JobProcess,
	type llm,
	voice,
	WorkerOptions,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as silero from "@livekit/agents-plugin-silero";
import type { RemoteParticipant } from "@livekit/rtc-node";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8787";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

/**
 * Custom Agent that captures each completed user turn and persists it to the backend.
 * Throws StopResponse to prevent the AgentSession from attempting LLM inference.
 */
class Transcriber extends voice.Agent {
	private participantIdentity: string;
	private roomId: string;

	constructor(participantIdentity: string, roomId: string) {
		super({ instructions: "" });
		this.participantIdentity = participantIdentity;
		this.roomId = roomId;
	}

	override async onUserTurnCompleted(
		_chatCtx: llm.ChatContext,
		newMessage: llm.ChatMessage,
	): Promise<void> {
		const transcript = newMessage.textContent ?? "";

		if (transcript.trim()) {
			console.log(`[transcription-agent] Final turn [${this.participantIdentity}]: ${transcript}`);
			await persistTranscript(this.roomId, transcript, this.participantIdentity).catch((err) => {
				console.error("[transcription-agent] Failed to persist transcript:", err);
			});
		}

		throw new voice.StopResponse();
	}
}

/**
 * Manages one AgentSession per participant for multi-user transcription.
 */
class MultiUserTranscriber {
	private ctx: JobContext;
	private roomId: string;
	private sessions = new Map<string, voice.AgentSession>();
	private vad: silero.VAD;

	constructor(ctx: JobContext, roomId: string, vad: silero.VAD) {
		this.ctx = ctx;
		this.roomId = roomId;
		this.vad = vad;
	}

	start(): void {
		this.ctx.room.on("participantConnected", this.onParticipantConnected);
		this.ctx.room.on("participantDisconnected", this.onParticipantDisconnected);

		// Handle already-connected participants
		for (const p of this.ctx.room.remoteParticipants.values()) {
			this.onParticipantConnected(p);
		}
	}

	private onParticipantConnected = (participant: RemoteParticipant): void => {
		if (this.sessions.has(participant.identity)) return;
		console.log(`[transcription-agent] Starting session for participant: ${participant.identity}`);
		this.startSession(participant).catch((err) => {
			console.error(
				`[transcription-agent] Failed to start session for ${participant.identity}:`,
				err,
			);
		});
	};

	private onParticipantDisconnected = (participant: RemoteParticipant): void => {
		const session = this.sessions.get(participant.identity);
		if (session) {
			console.log(`[transcription-agent] Closing session for participant: ${participant.identity}`);
			this.sessions.delete(participant.identity);
			session.close().catch((err) => {
				console.error(
					`[transcription-agent] Error closing session for ${participant.identity}:`,
					err,
				);
			});
		}
	};

	private async startSession(participant: RemoteParticipant): Promise<void> {
		const session = new voice.AgentSession({
			vad: this.vad,
			stt: new deepgram.STT({
				model: "nova-3",
				language: "ja",
			}),
		});

		this.sessions.set(participant.identity, session);

		await session.start({
			agent: new Transcriber(participant.identity, this.roomId),
			room: this.ctx.room,
			inputOptions: {
				audioEnabled: true,
				textEnabled: false,
				participantIdentity: participant.identity,
				closeOnDisconnect: false,
			},
			outputOptions: {
				transcriptionEnabled: true,
				audioEnabled: false,
				syncTranscription: false,
			},
		});
	}
}

export default defineAgent({
	prewarm: async (proc: JobProcess) => {
		proc.userData.vad = await silero.VAD.load();
	},
	entry: async (ctx: JobContext) => {
		const vad = ctx.proc.userData.vad as silero.VAD;

		const roomId = ctx.job.metadata;
		if (!roomId) {
			console.error("[transcription-agent] No roomId in job metadata, exiting.");
			return;
		}

		console.log(`[transcription-agent] Starting for room: ${roomId}`);

		await ctx.connect();
		console.log(`[transcription-agent] Connected to room: ${roomId}`);

		const transcriber = new MultiUserTranscriber(ctx, roomId, vad);
		transcriber.start();
	},
});

async function persistTranscript(
	roomId: string,
	content: string,
	participantIdentity: string,
): Promise<void> {
	const url = `${BACKEND_URL}/api/rooms/${roomId}/transcripts`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Admin-Key": ADMIN_API_KEY,
		},
		body: JSON.stringify({
			content,
			language: "ja",
			isFinal: true,
			participantId: participantIdentity,
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`POST ${url} returned ${res.status}: ${text}`);
	}
}

cli.runApp(
	new WorkerOptions({
		agent: fileURLToPath(import.meta.url),
		agentName: "transcription-agent",
	}),
);
