import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const adminKey = typeof window !== "undefined" ? localStorage.getItem("admin_api_key") : null;
	const extraHeaders: Record<string, string> = adminKey ? { "X-Admin-Key": adminKey } : {};

	try {
		const res = await axios({
			url: `${API_BASE_URL}${url}`,
			method: options?.method ?? "GET",
			data: options?.body,
			headers: {
				...(options?.headers as Record<string, string>),
				...extraHeaders,
			},
			signal: options?.signal ?? undefined,
		});

		return res as T;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			if (typeof window !== "undefined") {
				localStorage.removeItem("admin_api_key");
				if (
					window.location.pathname.startsWith("/admin") &&
					window.location.pathname !== "/admin/login"
				) {
					window.location.href = "/admin/login";
				}
			}
		}
		throw error;
	}
}

export type ErrorType<Error> = Error;
export type BodyType<Body> = Body;
