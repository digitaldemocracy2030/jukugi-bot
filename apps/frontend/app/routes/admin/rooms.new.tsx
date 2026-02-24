import { useState } from "react";
import { useNavigate } from "react-router";
import { usePostApiRooms } from "~/api/gen/breakoutDeliberationOSAPI";
import {
	Alert,
	Button,
	FormField,
	FormSection,
	Input,
	PageHeader,
	Stack,
	Textarea,
} from "~/components/design-system";

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
		<div className="max-w-2xl">
			<Stack direction="vertical" gap={6}>
				<PageHeader
					title="新規ルーム作成"
					backHref="/admin"
					breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "新規作成" }]}
				/>

				<div className="rounded-xl border bg-card shadow-sm p-6">
					<form onSubmit={handleSubmit}>
						<Stack direction="vertical" gap={0}>
							<FormSection title="基本情報" description="ルームのタイトルとURLスラッグを設定します">
								<Stack direction="vertical" gap={4}>
									<FormField label="タイトル" required htmlFor="title">
										<Input id="title" name="title" placeholder="第1回 市民討議会" required />
									</FormField>
									<FormField
										label="スラッグ"
										required
										htmlFor="slug"
										description="URLに使われます（小文字英数字・ハイフンのみ）"
									>
										<Input
											id="slug"
											name="slug"
											placeholder="my-room"
											pattern="[a-z0-9-]+"
											title="小文字英数字とハイフンのみ"
											required
										/>
									</FormField>
									<FormField label="説明" htmlFor="description">
										<Textarea
											id="description"
											name="description"
											minRows={3}
											placeholder="セッションの概要を記入..."
										/>
									</FormField>
								</Stack>
							</FormSection>

							<FormSection title="参加者設定" description="参加人数の上限を設定します">
								<FormField label="最大参加者数" htmlFor="maxParticipants">
									<Input
										id="maxParticipants"
										name="maxParticipants"
										type="number"
										min={2}
										max={100}
										defaultValue={10}
									/>
								</FormField>
							</FormSection>

							{error && <Alert variant="destructive">{error}</Alert>}

							<Stack direction="horizontal" gap={3} className="pt-4">
								<Button type="submit" variant="primary" loading={isPending}>
									ルームを作成
								</Button>
								<Button type="button" variant="outline" onClick={() => navigate("/admin")}>
									キャンセル
								</Button>
							</Stack>
						</Stack>
					</form>
				</div>
			</Stack>
		</div>
	);
}
