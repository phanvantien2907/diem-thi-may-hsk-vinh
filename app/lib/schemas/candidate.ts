/**
 * Zod validation schemas cho Candidate forms
 * Validation rules lấy chính xác từ API Documentation:
 * - Section 3.1: Tạo hồ sơ thí sinh — field constraints
 * - Section 3.4: Upload giấy tờ tùy thân — field constraints
 *
 * Zod v4 API: dùng `error` thay vì `errorMap` / `invalid_type_error`
 */
import { z } from "zod";

// ─── Profile Schema (POST /api/v1/me/candidate-profile) ───────────────────────
export const candidateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Vui lòng nhập họ và tên")
    .max(150, "Họ và tên không được vượt quá 150 ký tự"),
  full_name_cn: z
    .string()
    .max(150, "Họ tên tiếng Trung không được vượt quá 150 ký tự")
    .optional()
    .or(z.literal("")),
  dob: z
    .string()
    .min(1, "Vui lòng chọn ngày sinh")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải có định dạng YYYY-MM-DD"),
  gender: z.enum(["male", "female", "other"], {
    error: "Vui lòng chọn giới tính",
  }),
  ethnicity: z
    .string()
    .max(50, "Dân tộc không được vượt quá 50 ký tự")
    .optional()
    .or(z.literal("")),
  religion: z
    .string()
    .max(50, "Tôn giáo không được vượt quá 50 ký tự")
    .optional()
    .or(z.literal("")),
  nationality: z
    .string()
    .max(50, "Quốc tịch không được vượt quá 50 ký tự")
    .optional()
    .or(z.literal("")),
  chinese_study_years: z
    .number({ error: "Vui lòng nhập số" })
    .int("Phải là số nguyên")
    .min(0, "Số năm không được âm")
    .optional()
    .or(z.nan()),
});

export type CandidateProfileFormValues = z.infer<typeof candidateProfileSchema>;

// ─── Document Schema (POST /api/v1/me/candidate-profile/documents) ────────────
export const candidateDocumentSchema = z.object({
  doc_type: z.enum(["cccd", "passport"], {
    error: "Vui lòng chọn loại giấy tờ",
  }),
  doc_number: z
    .string()
    .min(1, "Vui lòng nhập số giấy tờ")
    .max(30, "Số giấy tờ không được vượt quá 30 ký tự"),
  issue_date: z
    .string()
    .min(1, "Vui lòng nhập ngày cấp")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày cấp phải có định dạng YYYY-MM-DD"),
  issue_place: z
    .string()
    .min(1, "Vui lòng nhập nơi cấp")
    .max(150, "Nơi cấp không được vượt quá 150 ký tự"),
  front_image_url: z
    .string()
    .url("URL ảnh mặt trước không hợp lệ")
    .min(1, "Vui lòng upload ảnh mặt trước"),
  back_image_url: z
    .string()
    .url("URL ảnh mặt sau không hợp lệ")
    .optional()
    .or(z.literal("")),
  portrait_image_url: z
    .string()
    .url("URL ảnh chân dung không hợp lệ")
    .min(1, "Vui lòng upload ảnh chân dung"),
  ward_id: z
    .number()
    .int()
    .min(1, "Vui lòng chọn xã/phường")
    .optional()
    .or(z.nan()),
  address_detail: z
    .string()
    .max(255, "Địa chỉ không được vượt quá 255 ký tự")
    .optional()
    .or(z.literal("")),
});

export type CandidateDocumentFormValues = z.infer<typeof candidateDocumentSchema>;
