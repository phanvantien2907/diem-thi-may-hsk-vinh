import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // ── Protected app routes — bọc bởi _app.tsx layout (AuthGuard) ────────────
  layout("routes/_app.tsx", [
    index("routes/_app.index.tsx"),
    route("thong-tin-thi-sinh", "routes/_app.thong-tin-thi-sinh.tsx"),
    route("ket-qua-thi", "routes/_app.ket-qua-thi.tsx"),
    route("van-chuyen-chung-chi", "routes/_app.van-chuyen-chung-chi.tsx"),
  ]),

  layout("routes/(auth)/layout.tsx", [
    route("dang-nhap", "routes/(auth)/dang-nhap.tsx"),
    route("dang-ky", "routes/(auth)/dang-ky.tsx"),
  ]),

  route("dang-xuat", "routes/dang-xuat.tsx"),

  // ── Catch-all 404 route ───────────────────────────────────────────────────
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
