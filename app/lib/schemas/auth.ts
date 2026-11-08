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

// ─── Legacy 9-Digit CMND & Modern 12-Digit CCCD Regex ─────────────────────────
export const ID_NUMBER_REGEX = /^(\d{9}|\d{12})$/;

// ─── Login Schema (POST /api/v1/auth/login) ───────────────────────────────────
// identifier: không rỗng (CMND 9 số, CCCD 12 số hoặc Email, server tự detect)
// password: không rỗng
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập CMND/CCCD hoặc địa chỉ Email")
    .refine(
      (val) => !/^\d+$/.test(val) || ID_NUMBER_REGEX.test(val),
      "Số CMND/CCCD phải gồm đúng 9 chữ số (CMND cũ) hoặc 12 chữ số (CCCD mới)"
    ),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu"),
});

// ─── Register Schema (POST /api/v1/auth/register) ────────────────────────────
// cccd: đúng 9 chữ số (CMND) hoặc 12 chữ số (CCCD), chỉ chứa số
// phone: tối đa 20 ký tự
// full_name: tối đa 150 ký tự
// email: email hợp lệ, tối đa 150 ký tự
// password: theo password policy
export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên")
    .max(150, "Họ tên không được vượt quá 150 ký tự"),
  cccd: z
    .string()
    .trim()
    .regex(
      ID_NUMBER_REGEX,
      "Số CMND/CCCD phải gồm đúng 9 chữ số (CMND cũ) hoặc 12 chữ số (CCCD mới)"
    ),
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

// ─── Update Profile Schema (PUT /api/v1/me) ────────────────────────────
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Vui lòng nhập họ và tên")
    .max(100, "Họ tên không được vượt quá 100 ký tự"),
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Địa chỉ email không hợp lệ")
    .max(150, "Email không được vượt quá 150 ký tự"),
  phone: z
    .string()
    .max(20, "Số điện thoại không được vượt quá 20 ký tự")
    .optional()
    .or(z.literal("")),
});

// ─── Change Password Schema (PATCH /api/v1/me/password) ────────────────────────────
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
    path: ["newPassword"],
  });

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
