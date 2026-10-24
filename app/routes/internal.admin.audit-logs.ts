import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, pickSearchParams, proxyJson } from "~/lib/admin-proxy.server";

const ALLOWED_PARAMS = ["actor_id", "action", "entity_table", "entity_id", "from", "to", "page", "limit"] as const;

/**
 * Resource route: GET /internal/admin/audit-logs
 * Proxy tới API §11.1 `GET /api/v1/admin/audit-logs` — chỉ chuyển tiếp các tham số hợp lệ.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const params = pickSearchParams(new URL(request.url).searchParams, ALLOWED_PARAMS);
  if (!params.has("limit")) params.set("limit", "10"); // Rule 7: 10 bản ghi / trang
  return proxyJson(`/api/v1/admin/audit-logs?${params.toString()}`, token);
}
