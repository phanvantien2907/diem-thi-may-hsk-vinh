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
    const url = new URL(request.url);
    let target = url.searchParams.get("target") || "";

    if (!target) {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.clone().json().catch(() => ({}));
        target = body.target || "";
      } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await request.clone().formData().catch(() => null);
        target = formData?.get("target")?.toString() || "";
      }
    }

    let endpoint = "/api/v1/admin/system/clear-cache";
    if (target === "candidates" || target === "candidate") {
      endpoint = "/api/v1/admin/candidates/clear-cache";
    } else if (target === "exam-sessions" || target === "exams" || target === "exam") {
      endpoint = "/api/v1/admin/exam-sessions/clear-cache";
    } else if (target === "locations" || target === "location") {
      endpoint = "/api/v1/admin/locations/clear-cache";
    } else if (target === "results" || target === "result") {
      endpoint = "/api/v1/admin/results/clear-cache";
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.msg || errJson?.error || `Failed to clear cache: ${res.status}`);
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error: any) {
    console.error("Error clearing cache:", error);
    return Response.json({ error: "Không thể xóa bộ nhớ đệm server", details: error.message }, { status: 500 });
  }
}
