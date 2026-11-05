import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, pickSearchParams, proxyJson } from "~/lib/admin-proxy.server";

const ALLOWED_PARAMS = ["scope", "page", "limit"] as const;

/**
 * Resource route: GET /internal/admin/candidates/:id/audit-logs
 * Proxy tới API §3.10d `GET /api/v1/admin/candidates/:id/audit-logs`
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const candidateId = params.id;
  if (!candidateId || !/^\d+$/.test(candidateId)) {
    return Response.json(
      { success: false, data: [], error: "ID thí sinh không hợp lệ" },
      { status: 400 }
    );
  }
  const queryParams = pickSearchParams(new URL(request.url).searchParams, ALLOWED_PARAMS);
  if (!queryParams.has("limit")) {
    queryParams.set("limit", "10");
  }
  return proxyJson(
    `/api/v1/admin/candidates/${candidateId}/audit-logs?${queryParams.toString()}`,
    token
  );
}

