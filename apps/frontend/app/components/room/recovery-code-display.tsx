import { useState } from "react";
import { saveToken } from "../../hooks/use-participant";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

type RecoveryCodeDisplayProps = {
	recoveryCode: string;
};

export function RecoveryCodeDisplay({ recoveryCode }: RecoveryCodeDisplayProps) {
	const [copied, setCopied] = useState(false);
	const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
	const [recoveryInput, setRecoveryInput] = useState("");
	const [recovering, setRecovering] = useState(false);
	const [recoverySuccess, setRecoverySuccess] = useState(false);
	const [recoveryError, setRecoveryError] = useState<string | null>(null);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(recoveryCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback: ignore
		}
	};

	const handleRecover = async () => {
		const trimmed = recoveryInput.trim();
		if (!trimmed) return;

		setRecovering(true);
		setRecoveryError(null);
		setRecoverySuccess(false);

		try {
			const res = await fetch(`${API_BASE_URL}/api/participants/recover`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ recoveryCode: trimmed }),
			});

			if (!res.ok) {
				setRecoveryError("リカバリーコードが見つかりません");
				return;
			}

			const data = await res.json();
			saveToken(data.id);
			setRecoverySuccess(true);
			setRecoveryInput("");
		} catch {
			setRecoveryError("リカバリーコードが見つかりません");
		} finally {
			setRecovering(false);
		}
	};

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-medium">リカバリーコード</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<code className="flex-1 rounded bg-muted px-3 py-2 text-center font-mono text-lg tracking-wider">
						{recoveryCode}
					</code>
					<Button variant="outline" size="sm" onClick={handleCopy}>
						{copied ? "コピー済み" : "コピー"}
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					このコードを保存しておくと、別のデバイスからセッションを復元できます。
				</p>

				<button
					type="button"
					className="text-left text-sm text-muted-foreground underline underline-offset-2"
					onClick={() => setIsRecoveryOpen(!isRecoveryOpen)}
				>
					{isRecoveryOpen ? "閉じる" : "別のデバイスで復元"}
				</button>

				{isRecoveryOpen && (
					<div className="flex flex-col gap-2 rounded border p-3">
						<Input
							placeholder="リカバリーコードを入力"
							value={recoveryInput}
							onChange={(e) => setRecoveryInput(e.target.value)}
							disabled={recovering}
						/>
						{recoveryError && (
							<p role="alert" className="text-sm text-destructive">
								{recoveryError}
							</p>
						)}
						{recoverySuccess && (
							<p className="text-sm text-green-600">
								復元に成功しました。ページを再読み込みしてください。
							</p>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={handleRecover}
							disabled={recovering || !recoveryInput.trim()}
						>
							{recovering ? "復元中..." : "復元する"}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
