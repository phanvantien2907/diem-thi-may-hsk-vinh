import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/candidates/:id
 * Proxy tới API §3.10 `GET /api/v1/admin/candidates/:id` — lấy chi tiết hồ sơ mới nhất.
 * Chuyển tiếp `X-PII-Access-Token` (hoặc `?pii_token=`) để mở khóa URL ảnh gốc sau khi xác thực PIN 6 số.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json(
      { success: false, data: null, error: "ID thí sinh không hợp lệ" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const piiToken =
    request.headers.get("X-PII-Access-Token") ||
    url.searchParams.get("pii_token") ||
    "";

  const headers: Record<string, string> = {};
  if (piiToken.trim()) {
    headers["X-PII-Access-Token"] = piiToken.trim();
  }

  return proxyJson(`/api/v1/admin/candidates/${id}`, token, { headers });
}
