import type { LoaderFunctionArgs } from "react-router";
import { API_BASE_URL } from "~/lib/env.server";
import { extractApiErrorMessage, getAdminToken, pickSearchParams } from "~/lib/admin-proxy.server";

const ALLOWED_EXPORT_PARAMS = [
  "period_id",
  "session_id",
  "format",
  "eligibility",
  "registration_status",
  "slot_scope",
  "search",
  "search_query",
] as const;

/**
 * Resource route: GET /internal/admin/registration-results/export
 * Proxy tới API §5.11.7 `GET /api/v1/admin/registration-results/export` — xuất file PDF hoặc Excel (CSV UTF-8 BOM).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  const params = pickSearchParams(new URL(request.url).searchParams, ALLOWED_EXPORT_PARAMS);

  const format = params.get("format") ?? "excel";
  const periodId = params.get("period_id");
  const sessionId = params.get("session_id");

  if (!periodId && !sessionId) {
    return Response.json(
      { success: false, data: null, error: "Bắt buộc chọn đợt thi hoặc ca thi cần xuất danh sách." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/registration-results/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const json: unknown = await res.json().catch(() => null);
      return Response.json(
        { success: false, data: null, error: extractApiErrorMessage(json, "Không thể xuất danh sách từ máy chủ.") },
        { status: res.status }
      );
    }

    const headers = new Headers();
    const contentType =
      res.headers.get("content-type") ??
      (format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8");
    headers.set("Content-Type", contentType);

    const disposition = res.headers.get("content-disposition");
    if (disposition) {
      headers.set("Content-Disposition", disposition);
    } else {
      const filename = `danh_sach_dang_ky_${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "csv"}`;
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }
    headers.set("Cache-Control", "no-store");

    return new Response(res.body, { status: 200, headers });
  } catch (error: unknown) {
    console.error("[internal/admin/registration-results/export]", error);
    return Response.json(
      { success: false, data: null, error: "Không thể kết nối tới máy chủ API" },
      { status: 503 }
    );
  }
}

