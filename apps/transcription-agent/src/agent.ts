import { fileURLToPath } from "node:url";
import {
	cli,
	defineAgent,
	type JobContext,
	type JobProcess,
	voice,
	WorkerOptions,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as silero from "@livekit/agents-plugin-silero";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://backend:8787";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY ?? "";

export default defineAgent({
	prewarm: async (proc: JobProcess) => {
		proc.userData.vad = await silero.VAD.load();
	},
	entry: async (ctx: JobContext) => {
		const vad = ctx.proc.userData.vad as silero.VAD;

		// Extract roomId from job metadata (set by AgentDispatchClient)
		const roomId = ctx.job.metadata;
		if (!roomId) {
			console.error("[transcription-agent] No roomId in job metadata, exiting.");
			return;
		}

		console.log(`[transcription-agent] Starting for room: ${roomId}`);

		const session = new voice.AgentSession({
			vad,
			stt: new deepgram.STT({
				model: "nova-3",
				language: "ja",
			}),
		});

		// Listen for user transcription events and persist to backend
		session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
			const transcript = ev.transcript;
			const isFinal = ev.isFinal;

			if (!transcript || transcript.trim() === "") return;

			// Only persist final transcriptions to the backend
			if (isFinal) {
				persistTranscript(roomId, transcript).catch((err) => {
					console.error("[transcription-agent] Failed to persist transcript:", err);
				});
			}
		});

		await session.start({
			agent: new voice.Agent({ instructions: "" }),
			room: ctx.room,
		});

		await ctx.connect();
		console.log(`[transcription-agent] Connected to room: ${roomId}`);
	},
});

async function persistTranscript(roomId: string, content: string): Promise<void> {
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
