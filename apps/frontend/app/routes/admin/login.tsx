import { useState } from "react";
import { useNavigate } from "react-router";
import { getApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

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
		<div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>OSODP Admin</CardTitle>
					<CardDescription>Admin API Key を入力してください</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<Input
							type="password"
							placeholder="Admin API Key"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							required
							autoFocus
						/>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button type="submit" className="w-full" disabled={loading || !apiKey}>
							{loading ? "確認中..." : "ログイン"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
