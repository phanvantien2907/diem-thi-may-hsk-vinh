/**
 * Logout Route — /logout
 *
 * Flow:
 * 1. Gọi backend POST /api/v1/auth/logout (nếu có token)
 * 2. Xóa session & refresh_token cookies
 * 3. Redirect về /dang-nhap
 */
import { redirect } from "react-router";
import { API_BASE_URL } from "~/lib/env.server";
import type { Route } from "./+types/dang-xuat";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (token) {
    try {
      await fetch(
        `${API_BASE_URL}/api/v1/auth/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch {
      // Bỏ qua lỗi network khi logout
    }
  }

  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  headers.append(
    "Set-Cookie",
    "refresh_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  headers.append(
    "Set-Cookie",
    "user_info=; Path=/; Max-Age=0; SameSite=Lax"
  );

  return redirect("/dang-nhap", { headers });
}

export default function LogoutRoute() {
  return null;
}
