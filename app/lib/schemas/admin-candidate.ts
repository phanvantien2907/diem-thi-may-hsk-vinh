/**
 * Zod validation schemas cho các thao tác quản trị hồ sơ thí sinh
 * Validation rules lấy từ API Documentation:
 * - Section 3.10c: [Admin] Từ chối / Thu hồi phê duyệt / Mở lại xét duyệt — `reason` bắt buộc (5–500 ký tự)
 * - Section 2.13: [Admin] Vô hiệu hóa tài khoản — `confirm_identity` và `reason` (5–500 ký tự)
 */
import { z } from "zod";

// ─── Từ chối / Thu hồi phê duyệt / Mở lại xét duyệt ──────────────────────────
export const rejectCandidateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Vui lòng nhập lý do rõ ràng (tối thiểu 5 ký tự)")
    .max(500, "Lý do không được vượt quá 500 ký tự"),
});

export type RejectCandidateFormValues = z.infer<typeof rejectCandidateSchema>;

// ─── Vô hiệu hóa tài khoản thí sinh (API §2.13) ──────────────────────────────
export const deactivateAccountSchema = z.object({
  confirm_identity: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập chính xác Họ và tên hoặc Số CCCD/Hộ chiếu của thí sinh")
    .max(150, "Thông tin xác nhận không được vượt quá 150 ký tự"),
  reason: z
    .string()
    .trim()
    .min(5, "Vui lòng nhập lý do vô hiệu hóa tài khoản (tối thiểu 5 ký tự)")
    .max(500, "Lý do không được vượt quá 500 ký tự"),
});

export type DeactivateAccountFormValues = z.infer<typeof deactivateAccountSchema>;
