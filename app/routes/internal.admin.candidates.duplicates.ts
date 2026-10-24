import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/candidates/duplicates
 * Proxy tới API §3.11 `GET /api/v1/admin/candidates/duplicates` — phát hiện giấy tờ dùng chung.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  return proxyJson("/api/v1/admin/candidates/duplicates", token);
}
