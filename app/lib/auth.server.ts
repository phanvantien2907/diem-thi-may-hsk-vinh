import { redirect } from "react-router";
import { API_BASE_URL } from "./env.server";
import type { UserProfile, JwtPayload } from "~/types/auth";

/**
 * Giải mã chuỗi JWT Payload an toàn cho môi trường Edge.
 * Không dùng Buffer (Node.js API) để tránh crash trên Cloudflare/Vercel Edge.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Chuẩn hóa Base64URL sang Base64
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    
    // Decode base64. Dùng decodeURIComponent + escape để bảo toàn chuỗi Unicode (ví dụ tiếng Việt)
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error("[Auth] Error decoding JWT payload:", error);
    return null;
  }
}

/**
 * Lấy token từ header Cookie của request.
 */
export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Đọc thông tin user cơ bản đã lưu trữ từ cookie (nếu có).
 */
export function getUserInfoFromCookie(request: Request): Partial<UserProfile> | null {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)user_info=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as Partial<UserProfile>;
  } catch {
    return null;
  }
}

/**
 * Hàm AuthGuard cốt lõi dùng cho các Route Loaders.
 * - Kiểm tra session token, nếu không có sẽ tự động redirect về /dang-nhap.
 * - Đồng bộ với /api/v1/me để lấy dữ liệu mới nhất.
 * - Trả về session hợp lệ gồm { user, token }.
 */
export async function requireAuth(request: Request): Promise<{ user: UserProfile; token: string }> {
  const token = getTokenFromRequest(request);

  if (!token) {
    const url = new URL(request.url);
    let returnTo = url.pathname + url.search;
    
    if (!returnTo || returnTo === "/" || returnTo.startsWith("/_") || returnTo.includes(".data")) {
      returnTo = "/thong-tin-thi-sinh";
    }

    throw redirect(
      `/dang-nhap${returnTo !== "/" && returnTo !== "/thong-tin-thi-sinh" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
    );
  }

  // Thông tin mặc định
  let user: UserProfile = {
    name: "Thí sinh dự thi",
    role: "Thí sinh",
  };

  // 1. Phục hồi thông tin từ cookie
  const cachedUser = getUserInfoFromCookie(request);
  if (cachedUser) {
    user = { ...user, ...cachedUser };
  }

  // 2. Lấy thông tin cơ bản từ JWT Token (đảm bảo an toàn môi trường Edge)
  const payload = decodeJwtPayload(token);
  if (payload) {
    if (payload.user_id && !user.username) {
      user.username = String(payload.user_id);
    }
    if (payload.user_role) {
      user.role = payload.user_role === "candidate" ? "Thí sinh" : String(payload.user_role);
    }
  }

  // 3. Đồng bộ hóa với API hệ thống
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const result = (await response.json()) as { data?: Record<string, unknown> };
      const data = result.data;
      if (data) {
        user = {
          name: typeof data.full_name === "string" ? data.full_name : user.name,
          email: typeof data.email === "string" ? data.email : user.email,
          username: typeof data.username === "string" ? data.username : user.username,
          cccd: typeof data.username === "string" ? data.username : user.cccd, // Theo logic cũ
          phone: typeof data.phone === "string" ? data.phone : user.phone,
          role: data.role_id === 1 ? "Quản trị viên" : "Thí sinh",
        };
      }
    }
  } catch (error) {
    // Không ném lỗi để tránh làm hỏng trải nghiệm người dùng khi API gián đoạn
    console.error("[Auth] Sync with /me API failed:", error);
  }

  return { user, token };
}
