import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Container, FormField, Input, Stack, Typography } from "~/components/design-system";

export function meta() {
	return [
		{ title: "OSODP — Breakout Deliberation OS" },
		{
			name: "description",
			content:
				"オープンソースの少人数熟議プラットフォーム。市民討議・ワークショップをオンラインで実施できます。",
		},
	];
}

export default function Home() {
	const navigate = useNavigate();
	const [slug, setSlug] = useState("");

	const handleJoin = () => {
		const trimmed = slug.trim().toLowerCase();
		if (trimmed) {
			navigate(`/room/${trimmed}`);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleJoin();
	};

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<header className="border-b">
				<Container maxWidth="xl" padding="md">
					<Stack direction="horizontal" align="center" justify="between" className="h-14">
						<Typography variant="h4" className="tracking-tight">
							OSODP
						</Typography>
						<Button variant="ghost" size="sm" onClick={() => navigate("/admin/login")}>
							管理者ログイン
						</Button>
					</Stack>
				</Container>
			</header>

			<main className="flex-1 flex items-center justify-center">
				<Container maxWidth="sm" padding="md">
					<Stack direction="vertical" gap={8} align="center" className="py-16">
						<Stack direction="vertical" gap={3} align="center">
							<div className="rounded-full bg-primary/10 p-4">
								<MessageCircle className="size-10 text-primary" />
							</div>
							<Typography variant="h1" className="text-center">
								Breakout Deliberation OS
							</Typography>
							<Typography variant="body" className="text-center text-muted-foreground max-w-md">
								オープンソースの少人数熟議プラットフォーム。
								ルームコードを入力して、対話セッションに参加しましょう。
							</Typography>
						</Stack>

						<Stack direction="vertical" gap={3} fullWidth className="max-w-sm">
							<FormField label="ルームコード" htmlFor="room-slug">
								<Input
									id="room-slug"
									placeholder="例: my-room"
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									onKeyDown={handleKeyDown}
									autoComplete="off"
								/>
							</FormField>
							<Button variant="primary" fullWidth onClick={handleJoin} disabled={!slug.trim()}>
								ルームに参加する
							</Button>
						</Stack>
					</Stack>
				</Container>
			</main>

			<footer className="border-t py-6">
				<Container maxWidth="xl" padding="md">
					<Typography variant="caption" className="text-center text-muted-foreground block">
						OSODP is open-source software for deliberative democracy.
					</Typography>
				</Container>
			</footer>
		</div>
	);
}
