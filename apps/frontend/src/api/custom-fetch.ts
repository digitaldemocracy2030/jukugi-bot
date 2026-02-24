import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await axios({
		url: `${API_BASE_URL}${url}`,
		method: options?.method ?? "GET",
		data: options?.body,
		headers: options?.headers as Record<string, string>,
		signal: options?.signal ?? undefined,
	});

	return res as T;
}

export type ErrorType<Error> = Error;
export type BodyType<Body> = Body;
