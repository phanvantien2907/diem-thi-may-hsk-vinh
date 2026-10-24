import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/exam-periods/:id
 * Proxy tới API §4.11 `GET /api/v1/admin/exam-periods/:id` — lấy chi tiết đợt thi kèm danh sách ca thi con.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ success: false, data: null, error: "ID đợt thi không hợp lệ" }, { status: 400 });
  }
  return proxyJson(`/api/v1/admin/exam-periods/${id}`, token);
}
