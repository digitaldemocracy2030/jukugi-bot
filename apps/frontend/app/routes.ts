import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("room/:slug", "routes/room.tsx"),

	// Admin routes
	route("admin/login", "routes/admin/login.tsx"),
	layout("components/admin/AdminLayout.tsx", [
		route("admin", "routes/admin/index.tsx"),
		route("admin/rooms/new", "routes/admin/rooms.new.tsx"),
		route("admin/rooms/:roomId", "routes/admin/rooms.$roomId.tsx"),
		route("admin/rooms/:roomId/session", "routes/admin/rooms.$roomId.session.tsx"),
	]),
] satisfies RouteConfig;
