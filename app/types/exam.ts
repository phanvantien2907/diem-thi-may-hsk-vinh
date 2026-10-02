/**
 * Types cho Module Exam & Registration
 *
 * Dựa theo API_DOCUMENTATION.md — Module 4 (Exam) & Module 5 (Registration)
 */

// ─── Exam Types ────────────────────────────────────────────────────────────────

/** Loại kỳ thi (HSK 1, HSK 2, ...) */
export interface ExamType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

/** Phòng thi */
export interface ExamRoom {
  id: number;
  name: string;
  location: string;
  capacity: number;
}

/** Ca thi (Shift) */
export type ExamShift = "morning" | "afternoon" | "evening";

/** Trạng thái ca thi */
export type ExamSessionStatus = "open" | "closed" | "cancelled";

/** Ca thi — ExamSessionResponseDTO */
export interface ExamSession {
  id: number;
  exam_type_id: number;
  exam_room_id: number;
  date: string;
  shift: ExamShift;
  capacity: number;
  fee: number;
  registration_deadline: string;
  status: ExamSessionStatus;
}

/** Ghế thi */
export type SeatStatus = "available" | "held" | "booked";

export interface ExamSeat {
  id: number;
  session_id: number;
  number: number;
  status: SeatStatus;
  held_until: string | null;
}

// ─── Registration Types ────────────────────────────────────────────────────────

/** Trạng thái đăng ký thi */
export type RegistrationStatus = "pending_payment" | "confirmed" | "cancelled";

/** Đăng ký thi — ExamRegistrationResponseDTO */
export interface ExamRegistration {
  id: number;
  candidate_id: number;
  exam_session_id: number;
  exam_seat_id: number;
  status: RegistrationStatus;
  registered_at: string;
}

// ─── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  meta: ApiMeta | null;
}

export interface ApiMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  msg: string;
}

// ─── Enriched Types (for UI display) ───────────────────────────────────────────

/** Ca thi với thông tin ghế trống đã tính */
export interface ExamSessionWithSlots extends ExamSession {
  available_slots: number;
  exam_type_name?: string;
  exam_room_name?: string;
  exam_room_location?: string;
}

/** Thông tin Thẻ dự thi chính thức */
export interface AdmissionSlip {
  registration_id: number;
  candidate_name: string;
  id_number: string;
  exam_date: string;
  shift: string;
  room_name: string;
  room_location: string;
  seat_number: number;
  exam_type_name: string;
}

/** Giao dịch thanh toán */
export interface PaymentRecord {
  id: number;
  exam_registration_id: number;
  amount: number;
  method: string;
  transaction_ref: string;
  status: "pending" | "success" | "failed" | "refunded";
  paid_at?: string | null;
  created_at: string;
}

/** Dữ liệu hiển thị chi tiết thanh toán cho dialog */
export interface PaymentDetailData {
  payment?: PaymentRecord | null;
  registration: ExamRegistration;
  session?: ExamSessionWithSlots | null;
  examTypeName?: string;
  candidateName?: string;
  idNumber?: string;
  roomName?: string;
  roomLocation?: string;
}

