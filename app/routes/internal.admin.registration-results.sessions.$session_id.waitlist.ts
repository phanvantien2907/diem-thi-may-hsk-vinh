import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, pickSearchParams, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/registration-results/sessions/:session_id/waitlist
 * Proxy tới API §5.11.5 `GET /api/v1/admin/registration-results/sessions/:session_id/waitlist`
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

  const url = new URL(request.url);
  const query = pickSearchParams(url.searchParams, ["page", "limit"]);
  const queryString = query.toString();
  const path = `/api/v1/admin/registration-results/sessions/${sessionId}/waitlist${
    queryString ? `?${queryString}` : ""
  }`;

  return proxyJson(path, token);
}

