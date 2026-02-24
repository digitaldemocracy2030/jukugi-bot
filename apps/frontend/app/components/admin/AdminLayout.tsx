import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { AdminHeader } from "./AdminHeader";

export function AdminLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		const key = localStorage.getItem("admin_api_key");
		if (!key) {
			navigate("/admin/login");
		}
	}, [navigate]);

	return (
		<div className="min-h-screen flex flex-col bg-muted/20">
			<AdminHeader />
			<main className="flex-1 w-full max-w-6xl mx-auto px-8 lg:px-12 py-8">
				<Outlet />
			</main>
		</div>
	);
}
