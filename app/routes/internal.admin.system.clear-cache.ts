import type { ActionFunctionArgs } from "react-router";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let token = "";
  try {
    const session = await requireAdminAuth(request);
    token = session.token;
  } catch (error: any) {
    if (error instanceof Response) throw error;
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/system/clear-cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to clear cache: ${res.status}`);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error: any) {
    console.error("Error clearing cache:", error);
    return Response.json({ error: "Không thể xóa bộ nhớ đệm server", details: error.message }, { status: 500 });
  }
}
