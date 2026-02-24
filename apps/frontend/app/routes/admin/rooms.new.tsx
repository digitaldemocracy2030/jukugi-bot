import { useState } from "react";
import { useNavigate } from "react-router";
import { usePostApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function meta() {
	return [{ title: "ルーム作成 | OSODP Admin" }];
}

export default function AdminRoomsNewPage() {
	const navigate = useNavigate();
	const { mutateAsync, isPending } = usePostApiRooms();
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);

		try {
			const result = await mutateAsync({
				data: {
					slug: form.get("slug") as string,
					title: form.get("title") as string,
					description: (form.get("description") as string) || undefined,
					maxParticipants: Number(form.get("maxParticipants")) || 10,
				},
			});

			if (result.status === 201) {
				navigate(`/admin/rooms/${result.data.id}`);
			} else if (result.status === 409) {
				setError("このスラッグは既に使われています");
			} else {
				setError("作成に失敗しました");
			}
		} catch {
			setError("作成に失敗しました");
		}
	}

	return (
		<div className="max-w-lg">
			<h1 className="text-2xl font-bold mb-6">新規ルーム作成</h1>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">基本情報</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="slug">
								スラッグ <span className="text-destructive">*</span>
							</label>
							<Input
								id="slug"
								name="slug"
								placeholder="my-room"
								pattern="[a-z0-9-]+"
								title="小文字英数字とハイフンのみ"
								required
							/>
							<p className="text-xs text-muted-foreground">
								URLに使われます（小文字英数字・ハイフンのみ）
							</p>
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="title">
								タイトル <span className="text-destructive">*</span>
							</label>
							<Input id="title" name="title" placeholder="第1回 市民討議会" required />
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="description">
								説明
							</label>
							<textarea
								id="description"
								name="description"
								rows={3}
								placeholder="セッションの概要を記入..."
								className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-sm font-medium" htmlFor="maxParticipants">
								最大参加者数
							</label>
							<Input
								id="maxParticipants"
								name="maxParticipants"
								type="number"
								min={2}
								max={100}
								defaultValue={10}
							/>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<div className="flex gap-3 pt-2">
							<Button type="submit" disabled={isPending}>
								{isPending ? "作成中..." : "作成"}
							</Button>
							<Button type="button" variant="outline" onClick={() => navigate("/admin")}>
								キャンセル
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
