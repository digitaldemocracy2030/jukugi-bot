import { nanoid } from "nanoid";

/** Generate a URL-safe nanoid (21 chars by default) */
export function generateId(size = 21): string {
	return nanoid(size);
}
