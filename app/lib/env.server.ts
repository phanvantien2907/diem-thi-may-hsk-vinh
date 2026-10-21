/**
 * Môi trường và cấu hình dành riêng cho server.
 * Tách biệt rõ ràng giữa URL API nội bộ (Server-to-Server) và URL API công khai (Client/Browser).
 */
import fs from "node:fs";

// Nhận biết môi trường đang thực thi trong Docker container
const isDocker =
  fs.existsSync("/.dockerenv") ||
  process.env.IS_DOCKER === "true";

/**
 * URL API dùng cho Server-side fetch (Loaders, Actions bên trong server/container).
 * Nếu đang chạy trong Docker và URL là localhost, tự động trỏ về host.docker.internal
 * để giao tiếp với backend server trên host.
 */
export function getInternalApiBaseUrl(): string {
  let apiUrl =
    (typeof process !== "undefined" && (process.env?.INTERNAL_API_BASE_URL || process.env?.API_BASE_URL)) ||
    (typeof import.meta !== "undefined" && (import.meta.env?.INTERNAL_API_BASE_URL || import.meta.env?.VITE_API_BASE_URL)) ||
    "http://localhost:8080";

  if (isDocker && (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1"))) {
    apiUrl = apiUrl
      .replace("localhost", "host.docker.internal")
      .replace("127.0.0.1", "host.docker.internal");
  }

  return apiUrl as string;
}

/**
 * URL API công khai trả về cho trình duyệt (Client-side components, WebSocket, PayOS SDK).
 * Trình duyệt chạy trên máy người dùng nên luôn cần localhost hoặc domain công khai.
 */
export function getPublicApiBaseUrl(): string {
  let publicUrl =
    (typeof process !== "undefined" && (process.env?.PUBLIC_API_BASE_URL || process.env?.VITE_API_BASE_URL)) ||
    (typeof import.meta !== "undefined" && (import.meta.env?.PUBLIC_API_BASE_URL || import.meta.env?.VITE_API_BASE_URL)) ||
    "http://localhost:8080";

  // Tránh trả nhầm host.docker.internal về cho trình duyệt (browser không phân giải được host.docker.internal)
  if (publicUrl.includes("host.docker.internal")) {
    publicUrl = publicUrl.replace("host.docker.internal", "localhost");
  }

  return publicUrl as string;
}

// Server-side loader/action URL
export const API_BASE_URL = getInternalApiBaseUrl();

// Client-side browser URL (truyền qua loaderData)
export const PUBLIC_API_BASE_URL = getPublicApiBaseUrl();

// Giữ tương thích ngược với getApiBaseUrl
export function getApiBaseUrl(): string {
  return getInternalApiBaseUrl();
}
