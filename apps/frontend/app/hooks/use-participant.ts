import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const STORAGE_KEY = "osodp_participant_token";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type Participant = {
	id: string;
	displayName: string;
	recoveryCode: string;
};

function getToken(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveToken(token: string): void {
	localStorage.setItem(STORAGE_KEY, token);
}

async function fetchMe(token: string): Promise<Participant> {
	const res = await fetch(`${API_BASE_URL}/api/participants/me`, {
		headers: { "X-Participant-Token": token },
	});
	if (!res.ok) {
		throw new Error(`${res.status}`);
	}
	return res.json();
}

export function useParticipant() {
	const queryClient = useQueryClient();
	const token = getToken();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["participant", "me"],
		queryFn: () => fetchMe(token as string),
		enabled: !!token,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

	const isKnown = !!data && !isError;

	const clearParticipant = useCallback(() => {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore
		}
		queryClient.setQueryData(["participant", "me"], null);
		queryClient.invalidateQueries({ queryKey: ["participant", "me"] });
	}, [queryClient]);

	return {
		participant: isKnown ? data : null,
		isKnown,
		isLoading: !!token && isLoading,
		clearParticipant,
	};
}
