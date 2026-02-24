import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

export function AdminHeader() {
	const navigate = useNavigate();

	function handleLogout() {
		localStorage.removeItem("admin_api_key");
		navigate("/admin/login");
	}

	return (
		<header className="border-b bg-background px-6 py-3 flex items-center justify-between">
			<Link to="/admin" className="font-semibold text-lg tracking-tight">
				OSODP Admin
			</Link>
			<Button variant="outline" size="sm" onClick={handleLogout}>
				ログアウト
			</Button>
		</header>
	);
}
