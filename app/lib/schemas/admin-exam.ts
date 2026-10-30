import { z } from "zod";

/**
 * Validation Schemas cho Module Quản Lý Kỳ Thi & Đợt Thi
 * Dựa theo API_DOCUMENTATION.md §4.10 – §4.18 (v1.2.3)
 */

// ─── 1. Schema Tạo Mới Đợt Thi (§4.12) ─────────────────────────────────────────
export const createExamPeriodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên đợt thi")
    .max(255, "Tên đợt thi tối đa 255 ký tự"),
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã đợt thi")
    .max(50, "Mã đợt thi tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9\-_]+$/, "Mã đợt thi chỉ gồm chữ cái, số, gạch ngang và gạch dưới"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  start_date: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày bắt đầu phải có định dạng YYYY-MM-DD")
    .optional(),
  end_date: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày kết thúc phải có định dạng YYYY-MM-DD")
    .optional(),
  registration_start: z.string().optional(),
  registration_deadline: z.string().optional(),
});

export type CreateExamPeriodInput = z.input<typeof createExamPeriodSchema>;
export type CreateExamPeriodFormValues = z.output<typeof createExamPeriodSchema>;

// ─── 2. Schema Chỉnh Sửa Đợt Thi (§4.13) ───────────────────────────────────────
export const updateExamPeriodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên đợt thi không được để trống")
    .max(255, "Tên đợt thi tối đa 255 ký tự"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  start_date: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày bắt đầu phải có định dạng YYYY-MM-DD")
    .optional(),
  end_date: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày kết thúc phải có định dạng YYYY-MM-DD")
    .optional(),
  registration_start: z.string().optional(),
  registration_deadline: z.string().optional(),
});

export type UpdateExamPeriodInput = z.input<typeof updateExamPeriodSchema>;
export type UpdateExamPeriodFormValues = z.output<typeof updateExamPeriodSchema>;

// ─── 3. Schema Nhân Bản Đợt Thi (§4.14) ────────────────────────────────────────
export const duplicateExamPeriodSchema = z.object({
  name: z
    .string()
    .trim()
    .max(255, "Tên đợt thi mới tối đa 255 ký tự")
    .optional(),
  code: z
    .string()
    .trim()
    .max(50, "Mã đợt thi mới tối đa 50 ký tự")
    .refine((val) => !val || /^[A-Za-z0-9\-_]+$/.test(val), "Mã đợt thi chỉ gồm chữ cái, số, gạch nối")
    .optional(),
});

export type DuplicateExamPeriodInput = z.input<typeof duplicateExamPeriodSchema>;
export type DuplicateExamPeriodFormValues = z.output<typeof duplicateExamPeriodSchema>;

// ─── 4. Schema Dời Lịch Thi Bất Khả Kháng (§4.15) ──────────────────────────────
export const rescheduleExamPeriodSchema = z.object({
  new_start_date: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ngày bắt đầu thi mới")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày thi phải có định dạng YYYY-MM-DD"),
  new_end_date: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), "Ngày kết thúc phải có định dạng YYYY-MM-DD")
    .optional(),
  new_registration_deadline: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(5, "Lý do dời lịch bắt buộc phải có ít nhất 5 ký tự để phục vụ nhật ký kiểm toán")
    .max(500, "Lý do tối đa 500 ký tự"),
  send_notification: z.boolean(),
});

export type RescheduleExamPeriodInput = z.input<typeof rescheduleExamPeriodSchema>;
export type RescheduleExamPeriodFormValues = z.output<typeof rescheduleExamPeriodSchema>;

// ─── 5. Schema Đóng Đăng Ký Sớm (§4.16, §4.17) ─────────────────────────────────
export const closeRegistrationSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "Lý do tối đa 500 ký tự")
    .optional(),
});

export type CloseRegistrationInput = z.input<typeof closeRegistrationSchema>;
export type CloseRegistrationFormValues = z.output<typeof closeRegistrationSchema>;

// ─── 6. Schema Chỉnh Sửa Ca Thi (§4.18) ────────────────────────────────────────
export const updateExamSessionSchema = z.object({
  date: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ngày tổ chức ca thi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày thi phải có định dạng YYYY-MM-DD"),
  shift: z.enum(["morning", "afternoon", "evening"]),
  capacity: z.coerce.number().int().min(1, "Sức chứa tối thiểu 1 thí sinh"),
  fee: z.coerce.number().int().min(0, "Lệ phí thi không được là số âm"),
  registration_deadline: z.string().trim().min(1, "Vui lòng chọn hạn chót nộp hồ sơ"),
  exam_session_check_in_at: z.string().optional(),
});

export type UpdateExamSessionInput = z.input<typeof updateExamSessionSchema>;
export type UpdateExamSessionFormValues = z.output<typeof updateExamSessionSchema>;

// ─── 7. Schema Mở Lại Cổng Đăng Ký (§4.13, §4.27) ─────────────────────────────
export const reopenRegistrationSchema = z.object({
  registration_deadline: z
    .string()
    .trim()
    .optional(),
});

export type ReopenRegistrationInput = z.input<typeof reopenRegistrationSchema>;
export type ReopenRegistrationFormValues = z.output<typeof reopenRegistrationSchema>;


