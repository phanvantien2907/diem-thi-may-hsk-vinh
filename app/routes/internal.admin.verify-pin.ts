import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getAdminToken, proxyJson } from "~/lib/admin-proxy.server";

/**
 * Resource route: /internal/admin/verify-pin
 * - GET: Proxy tới `GET /api/v1/admin/me/pin/status` (kiểm tra trạng thái PIN 6 số & thời gian khóa chống dò mã)
 * - POST (intent="setup"): Proxy tới `POST /api/v1/admin/me/pin/setup` (thiết lập / đổi mã PIN 6 số)
 * - POST (intent="verify" | default): Proxy tới `POST /api/v1/admin/verify-pin` (xác thực mã PIN 6 số -> cấp pii_access_token 5 phút)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getAdminToken(request);
  return proxyJson("/api/v1/admin/me/pin/status", token);
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await getAdminToken(request);
  let body: Record<string, unknown> = {};
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    body = ((await request.json().catch(() => ({}))) as Record<string, unknown>) || {};
  } else {
    const formData = await request.formData();
    body = {
      intent: formData.get("intent")?.toString(),
      pin: formData.get("pin")?.toString(),
      current_password: formData.get("current_password")?.toString(),
    };
  }

  const intent = String(body.intent || "verify").trim();
  const pin = String(body.pin || "").trim();

  if (!/^\d{6}$/.test(pin)) {
    return Response.json(
      {
        success: false,
        data: null,
        error: "Mã PIN bảo mật phải bao gồm đúng 6 chữ số (0–9).",
      },
      { status: 400 }
    );
  }

  if (intent === "setup") {
    const currentPassword =
      typeof body.current_password === "string" ? body.current_password : "";
    return proxyJson("/api/v1/admin/me/pin/setup", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        current_password: currentPassword || undefined,
      }),
    });
  }

  return proxyJson("/api/v1/admin/verify-pin", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
}

