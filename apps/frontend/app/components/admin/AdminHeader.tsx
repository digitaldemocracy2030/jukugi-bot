import { LayoutDashboard, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button, Stack, Typography } from "~/components/design-system";

export function AdminHeader() {
	const navigate = useNavigate();

	function handleLogout() {
		localStorage.removeItem("admin_api_key");
		navigate("/admin/login");
	}

	return (
		<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
			<div className="w-full max-w-[1400px] mx-auto px-6 flex items-center justify-between h-14">
				<Stack direction="horizontal" align="center" gap={6}>
					<Link to="/admin" className="flex items-center gap-2">
						<div className="size-8 rounded-lg bg-primary flex items-center justify-center">
							<LayoutDashboard className="size-4 text-primary-foreground" />
						</div>
						<Typography variant="h4" className="tracking-tight">
							OSODP Admin
						</Typography>
					</Link>
					<nav className="hidden sm:flex items-center gap-1">
						<Link
							to="/admin"
							className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
						>
							Dashboard
						</Link>
					</nav>
				</Stack>
				<Button
					variant="ghost"
					size="sm"
					leftIcon={<LogOut className="size-3.5" />}
					onClick={handleLogout}
				>
					ログアウト
				</Button>
			</div>
		</header>
	);
}
