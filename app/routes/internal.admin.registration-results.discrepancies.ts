import type { LoaderFunctionArgs } from "react-router";
import { getAdminToken, pickSearchParams, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: GET /internal/admin/registration-results/discrepancies
 * Proxy tới API §5.11.6 `GET /api/v1/admin/registration-results/discrepancies`
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const url = new URL(request.url);
  const query = pickSearchParams(url.searchParams, ["period_id", "session_id"]);
  const queryString = query.toString();
  const path = `/api/v1/admin/registration-results/discrepancies${
    queryString ? `?${queryString}` : ""
  }`;

  return proxyJson(path, token);
}

