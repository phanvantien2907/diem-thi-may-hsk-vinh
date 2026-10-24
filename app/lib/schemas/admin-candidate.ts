/**
 * Zod validation schemas cho các thao tác quản trị hồ sơ thí sinh
 * Validation rules lấy từ API Documentation:
 * - Section 3.10: [Admin] Từ chối giấy tờ — `reason` bắt buộc, tối đa 500 ký tự
 */
import { z } from "zod";

// ─── Từ chối / Thu hồi phê duyệt (POST /api/v1/admin/candidates/:id/reject) ──
export const rejectCandidateSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập lý do từ chối hồ sơ")
    .max(500, "Lý do từ chối không được vượt quá 500 ký tự"),
});

export type RejectCandidateFormValues = z.infer<typeof rejectCandidateSchema>;
