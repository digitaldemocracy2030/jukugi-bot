import { useState } from "react";
import { saveToken } from "../../hooks/use-participant";
import { Alert, Button, FormField, Input, Stack, Typography } from "../design-system";

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
		<div className="w-full rounded-lg border bg-muted/30 p-4">
			<Stack direction="vertical" gap={3}>
				<Typography variant="label">リカバリーコード</Typography>

				<Stack direction="horizontal" gap={2} align="center">
					<code className="flex-1 rounded-md bg-muted px-3 py-2 text-center font-mono text-lg tracking-wider">
						{recoveryCode}
					</code>
					<Button variant="outline" size="sm" onClick={handleCopy}>
						{copied ? "コピー済み" : "コピー"}
					</Button>
				</Stack>

				<Typography variant="caption">
					このコードを保存しておくと、別のデバイスからセッションを復元できます。
				</Typography>

				<button
					type="button"
					className="text-left text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
					onClick={() => setIsRecoveryOpen(!isRecoveryOpen)}
				>
					{isRecoveryOpen ? "閉じる" : "別のデバイスで復元"}
				</button>

				{isRecoveryOpen && (
					<div className="rounded-lg border p-3">
						<Stack direction="vertical" gap={2}>
							<FormField label="リカバリーコード" htmlFor="recovery-input">
								<Input
									id="recovery-input"
									placeholder="リカバリーコードを入力"
									value={recoveryInput}
									onChange={(e) => setRecoveryInput(e.target.value)}
									disabled={recovering}
								/>
							</FormField>
							{recoveryError && <Alert variant="destructive">{recoveryError}</Alert>}
							{recoverySuccess && (
								<Alert variant="success">
									復元に成功しました。ページを再読み込みしてください。
								</Alert>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={handleRecover}
								loading={recovering}
								disabled={!recoveryInput.trim()}
							>
								復元する
							</Button>
						</Stack>
					</div>
				)}
			</Stack>
		</div>
	);
}
