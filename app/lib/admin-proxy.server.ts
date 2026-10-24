import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";

/**
 * Helper dùng chung cho các resource route `internal/admin/*`.
 * Mục đích: gọi Backend API phía server để JWT quản trị KHÔNG bao giờ lộ ra trình duyệt.
 */

/** Xác thực admin; ném lại Response redirect nếu có, ngược lại trả 401 JSON */
export async function getAdminToken(request: Request): Promise<string> {
  try {
    const { token } = await requireAdminAuth(request);
    return token;
  } catch (error: unknown) {
    if (error instanceof Response) throw error;
    throw Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

/** Sao chép các query param được cho phép sang URLSearchParams mới */
export function pickSearchParams(source: URLSearchParams, allowed: readonly string[]): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of allowed) {
    const value = source.get(key);
    if (value !== null && value.trim() !== "") params.set(key, value.trim());
  }
  return params;
}

/** Gọi API dạng JSON và chuyển tiếp nguyên envelope + status code */
export async function proxyJson(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const json: unknown = await res.json().catch(() => null);
    if (json === null) {
      return Response.json(
        { success: false, data: null, error: "Máy chủ trả về dữ liệu không hợp lệ" },
        { status: res.ok ? 502 : res.status }
      );
    }
    return Response.json(json, { status: res.status });
  } catch (error: unknown) {
    console.error(`[admin-proxy] ${path}`, error);
    return Response.json(
      { success: false, data: null, error: "Không thể kết nối tới máy chủ API" },
      { status: 503 }
    );
  }
}

/** Đọc thông báo lỗi từ envelope API (msg | error.message | error) */
export function extractApiErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const obj = json as Record<string, unknown>;
  if (typeof obj.msg === "string" && obj.msg) return obj.msg;
  const err = obj.error;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object") {
    const message = (err as Record<string, unknown>).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
