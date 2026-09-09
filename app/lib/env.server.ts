/**
 * Môi trường và cấu hình dành riêng cho server.
 * Việc gom các biến môi trường vào đây giúp kiểm soát và tránh lỗi typo trên toàn hệ thống.
 */

// Hàm trả về URL API. 
// Đặt dưới dạng function hoặc getter để tương thích với các môi trường serverless/edge nếu cần reload biến môi trường.
export function getApiBaseUrl(): string {
  // Lấy giá trị từ process.env (Node/Edge/Bun) hoặc import.meta.env (Vite server)
  const apiUrl =
    (typeof process !== "undefined" && process.env?.API_BASE_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "http://localhost:8080";

  return apiUrl as string;
}

export const API_BASE_URL = getApiBaseUrl();
