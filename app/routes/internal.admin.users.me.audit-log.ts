import type { LoaderFunctionArgs } from "react-router";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";

export async function loader({ request }: LoaderFunctionArgs) {
  let token = "";
  try {
    const session = await requireAdminAuth(request);
    token = session.token;
  } catch (error: any) {
    if (error instanceof Response) throw error;
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const apiUrl = `${API_BASE_URL}/api/v1/admin/users/me/audit-log${searchParams ? `?${searchParams}` : "?limit=100"}`;

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch audit logs: ${res.status}`);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return Response.json({ error: "Không thể lấy lịch sử thao tác", details: error.message }, { status: 500 });
  }
}
