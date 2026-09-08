import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Auth routes — dùng layout route để share split-screen layout
  layout("routes/(auth)/layout.tsx", [
    route("login", "routes/(auth)/login.tsx"),
    route("register", "routes/(auth)/register.tsx"),
  ]),
] satisfies RouteConfig;

