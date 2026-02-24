import { Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { getApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import { Alert, Button, FormField, Input, Stack, Typography } from "~/components/design-system";

export function meta() {
	return [{ title: "Admin Login | OSODP" }];
}

export default function AdminLoginPage() {
	const navigate = useNavigate();
	const [apiKey, setApiKey] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		localStorage.setItem("admin_api_key", apiKey);

		try {
			// GET /api/rooms は admin 専用エンドポイント。200 なら認証成功、401 なら無効
			const result = await getApiRooms();
			if (result.status === 200) {
				navigate("/admin");
			} else {
				localStorage.removeItem("admin_api_key");
				setError("API Keyが正しくありません");
			}
		} catch (err: unknown) {
			const status = (err as { response?: { status?: number } })?.response?.status;
			if (status === 401) {
				localStorage.removeItem("admin_api_key");
				setError("API Keyが正しくありません");
			} else {
				localStorage.removeItem("admin_api_key");
				setError("接続エラーが発生しました。バックエンドが起動しているか確認してください。");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<Stack
			direction="vertical"
			align="center"
			justify="center"
			className="min-h-screen bg-muted/20 px-4"
		>
			<div className="w-full max-w-sm rounded-xl border bg-card shadow-sm">
				<div className="p-6 pb-2">
					<Stack direction="vertical" gap={2} align="center">
						<div className="rounded-full bg-primary/10 p-3">
							<Lock className="size-6 text-primary" />
						</div>
						<Typography variant="h2" align="center">
							OSODP Admin
						</Typography>
						<Typography variant="body" color="muted" align="center">
							Admin API Key を入力してください
						</Typography>
					</Stack>
				</div>
				<div className="p-6 pt-4">
					<form onSubmit={handleSubmit}>
						<Stack direction="vertical" gap={4}>
							<FormField label="API Key" htmlFor="api-key">
								<Input
									id="api-key"
									type="password"
									placeholder="Admin API Key"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									required
									autoFocus
								/>
							</FormField>
							{error && <Alert variant="destructive">{error}</Alert>}
							<Button
								type="submit"
								variant="primary"
								fullWidth
								loading={loading}
								disabled={!apiKey}
							>
								ログイン
							</Button>
						</Stack>
					</form>
				</div>
			</div>
		</Stack>
	);
}
