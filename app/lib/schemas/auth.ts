/**
 * Zod validation schemas cho Auth forms
 * Validation rules lấy chính xác từ API Documentation:
 * - Section 1.5: Quy tắc mật khẩu (Password Policy)
 * - Section 2.1: Register — field constraints
 * - Section 2.2: Login — field constraints
 */
import { z } from "zod";

// ─── Password Policy (API docs 1.5) ───────────────────────────────────────────
// min=8, max=72, phải có: chữ hoa + chữ thường + số + ký tự đặc biệt
const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(72, "Mật khẩu không được vượt quá 72 ký tự")
  .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa (A-Z)")
  .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường (a-z)")
  .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số (0-9)")
  .regex(
    /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/,
    "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%...)"
  );

// ─── Login Schema (POST /api/v1/auth/login) ───────────────────────────────────
// identifier: không rỗng (CCCD hoặc Email, server tự detect)
// password: không rỗng
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Vui lòng nhập CCCD hoặc địa chỉ Email"),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu"),
});

// ─── Register Schema (POST /api/v1/auth/register) ────────────────────────────
// cccd: đúng 12 ký tự, chỉ chứa số
// phone: tối đa 20 ký tự
// full_name: tối đa 150 ký tự
// email: email hợp lệ, tối đa 150 ký tự
// password: theo password policy
export const registerSchema = z.object({
  full_name: z
    .string()
    .min(1, "Vui lòng nhập họ và tên")
    .max(150, "Họ tên không được vượt quá 150 ký tự"),
  cccd: z
    .string()
    .length(12, "Số CCCD phải đúng 12 chữ số")
    .regex(/^\d{12}$/, "Số CCCD chỉ được chứa chữ số (0-9)"),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .max(20, "Số điện thoại không được vượt quá 20 ký tự"),
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Địa chỉ email không hợp lệ")
    .max(150, "Email không được vượt quá 150 ký tự"),
  password: passwordSchema,
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
