import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/registration-results/sessions/:session_id/summary
 * Proxy tới API §5.11.3 `GET /api/v1/admin/registration-results/sessions/:session_id/summary`
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const sessionId = Number(params.session_id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return Response.json(
      { success: false, data: null, error: "ID ca thi không hợp lệ" },
      { status: 400 }
    );
  }

  return proxyJson(`/api/v1/admin/registration-results/sessions/${sessionId}/summary`, token);
}

