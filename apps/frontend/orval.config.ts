import { defineConfig } from "orval";

export default defineConfig({
	api: {
		input: {
			target: "http://localhost:8787/api/openapi.json",
		},
		output: {
			target: "src/api/gen",
			schemas: "src/api/models",
			client: "react-query",
			override: {
				mutator: {
					path: "./src/api/custom-fetch.ts",
					name: "customFetch",
				},
				query: {
					useQuery: true,
					useMutation: true,
				},
			},
		},
	},
});
