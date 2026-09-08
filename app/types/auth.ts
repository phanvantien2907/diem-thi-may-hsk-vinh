/**
 * Types cho Module Auth (Xác thực)
 * Tham chiếu: API Documentation — Section 2. Module Auth
 */

// ─── Request DTOs ──────────────────────────────────────────────────────────────

/** POST /api/v1/auth/login */
export interface LoginRequest {
  /** CCCD (12 số) hoặc Email */
  identifier: string;
  password: string;
}

/** POST /api/v1/auth/register */
export interface RegisterRequest {
  /** Số CCCD — đúng 12 ký tự, chỉ chứa số */
  cccd: string;
  /** Số điện thoại — tối đa 20 ký tự */
  phone: string;
  /** Họ và tên đầy đủ — tối đa 150 ký tự */
  full_name: string;
  /** Địa chỉ email hợp lệ — tối đa 150 ký tự */
  email: string;
  /** Mật khẩu — min 8, max 72, có chữ hoa + thường + số + ký tự đặc biệt */
  password: string;
}

// ─── Response DTOs ─────────────────────────────────────────────────────────────

/** AccountResponseDTO — trả về từ register và GET /me */
export interface AccountResponseDTO {
  id: number;
  /** Username = CCCD */
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "active" | "locked" | "pending";
  role_id: number;
  created_at: string;
  updated_at: string;
}

/** Response data từ POST /api/v1/auth/login (200 OK) */
export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  /** Thời gian sống của access token (giây), thường 86400 = 24h */
  expires_in: number;
  /** true nếu nhân viên lần đầu đăng nhập cần đổi mật khẩu tạm */
  must_change_password: boolean;
}

/** Response data từ POST /api/v1/auth/register (201 Created) */
export interface RegisterResponseData {
  account: AccountResponseDTO;
  message: string;
}

// ─── API Response Envelope ─────────────────────────────────────────────────────

/** Cấu trúc response thành công chung của API */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta: null;
}

/** Cấu trúc response lỗi chung của API (4xx, 5xx) */
export interface ApiErrorResponse {
  statusCode: number;
  /** Thời điểm lỗi, format ISO 8601 */
  timestamp: string;
  /** Đường dẫn API đã gọi */
  path: string;
  /** Thông báo lỗi bằng Tiếng Việt */
  msg: string;
}

// ─── Action return types cho React Router ─────────────────────────────────────

/** Dữ liệu trả về từ login action khi có lỗi */
export interface LoginActionError {
  error: string;
  fieldErrors?: {
    identifier?: string;
    password?: string;
  };
}

/** Dữ liệu trả về từ register action khi có lỗi */
export interface RegisterActionError {
  error: string;
  fieldErrors?: {
    cccd?: string;
    phone?: string;
    full_name?: string;
    email?: string;
    password?: string;
  };
}
