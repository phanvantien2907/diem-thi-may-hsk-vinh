import type { LoaderFunctionArgs } from "react-router";
import { API_BASE_URL } from "~/lib/env.server";
import { extractApiErrorMessage, getAdminToken, pickSearchParams } from "~/lib/admin-proxy.server";

const ALLOWED_PARAMS = ["exam_date", "status", "level", "search"] as const;

/**
 * Resource route: GET /internal/admin/candidates/export
 * Proxy tới API §3.9 `GET /api/v1/admin/candidates/export` — stream tệp PDF về trình duyệt.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const params = pickSearchParams(new URL(request.url).searchParams, ALLOWED_PARAMS);

  // Nghiệp vụ: API bắt buộc có exam_date định dạng YYYY-MM-DD
  const examDate = params.get("exam_date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return Response.json(
      { success: false, data: null, error: "Vui lòng chọn ngày thi hợp lệ (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/candidates/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const json: unknown = await res.json().catch(() => null);
      return Response.json(
        { success: false, data: null, error: extractApiErrorMessage(json, "Lỗi tải file PDF từ máy chủ.") },
        { status: res.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("content-type") ?? "application/pdf");
    const disposition = res.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    headers.set("Cache-Control", "no-store");

    return new Response(res.body, { status: 200, headers });
  } catch (error: unknown) {
    console.error("[internal/admin/candidates/export]", error);
    return Response.json(
      { success: false, data: null, error: "Không thể kết nối tới máy chủ API" },
      { status: 503 }
    );
  }
}
