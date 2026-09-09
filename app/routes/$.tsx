/**
 * app/routes/$.tsx — Catch-All Splat Route (404 Not Found)
 *
 * Route này đón nhận tất cả các đường dẫn không khớp trong hệ thống,
 * trả về HTTP 404 Status Code chuẩn SSR và hiển thị giao diện NotFound cao cấp.
 */
import { data } from "react-router";
import type { Route } from "./+types/$";
import { NotFound } from "~/components/layout/NotFound";

export const meta: Route.MetaFunction = () => [
  { title: "Không tìm thấy trang" },
  {
    name: "description",
    content: "Trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập.",
  },
];

export async function loader() {
  return data(null, { status: 404 });
}

export default function NotFoundRoute() {
  return <NotFound />;
}
