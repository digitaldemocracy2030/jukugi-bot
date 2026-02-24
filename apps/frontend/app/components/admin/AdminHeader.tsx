import { Link, useNavigate } from "react-router";
import { Button, Typography } from "~/components/design-system";

export function AdminHeader() {
	const navigate = useNavigate();

	function handleLogout() {
		localStorage.removeItem("admin_api_key");
		navigate("/admin/login");
	}

	return (
		<header className="border-b bg-background px-6 py-3 flex items-center justify-between">
			<Link to="/admin">
				<Typography variant="h3" className="tracking-tight">
					OSODP Admin
				</Typography>
			</Link>
			<Button variant="outline" size="sm" onClick={handleLogout}>
				ログアウト
			</Button>
		</header>
	);
}
