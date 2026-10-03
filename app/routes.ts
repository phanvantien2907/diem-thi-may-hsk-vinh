import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // ── Protected app routes — bọc bởi _app.tsx layout (AuthGuard) ────────────
  layout("routes/_app.tsx", [
    index("routes/_app.index.tsx"),
    route("thong-tin-thi-sinh", "routes/_app.thong-tin-thi-sinh.tsx"),
    route("dang-ky-thi", "routes/_app.dang-ky-thi.tsx"),
    route("ket-qua-thi", "routes/_app.ket-qua-thi.tsx"),
    route("van-chuyen-chung-chi", "routes/_app.van-chuyen-chung-chi.tsx"),
    route("tai-khoan-cua-toi", "routes/_app.tai-khoan-cua-toi.tsx"),
  ]),

  // ── Protected admin routes — bọc bởi routes/admin/layout.tsx (AdminAuthGuard) ───
  layout("routes/admin/layout.tsx", [
    route("trang-quan-tri", "routes/admin/trang-quan-tri.tsx"),
    route("quan-ly-ky-thi-ca-thi", "routes/admin/quan-ly-ky-thi-ca-thi.tsx"),
    route("quan-ly-ho-so-dang-ky", "routes/admin/quan-ly-ho-so-dang-ky.tsx"),
    route("quan-ly-giao-dich-thanh-toan", "routes/admin/quan-ly-giao-dich-thanh-toan.tsx"),
  ]),

  layout("routes/(auth)/layout.tsx", [
    route("dang-nhap", "routes/(auth)/dang-nhap.tsx"),
    route("dang-ky", "routes/(auth)/dang-ky.tsx"),
  ]),

  route("dang-xuat", "routes/dang-xuat.tsx"),

  // ── API routes ────────────────────────────────────────────────────────────
  route("internal/admin/system/clear-cache", "routes/internal.admin.system.clear-cache.ts"),
  route("internal/admin/users/me/audit-log", "routes/internal.admin.users.me.audit-log.ts"),

  // ── Catch-all 404 route ───────────────────────────────────────────────────
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
