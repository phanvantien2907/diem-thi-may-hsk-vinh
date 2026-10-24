export interface ExamSessionDashboardDTO {
  session_id: number;
  capacity: number;
  booked: number;
  held: number;
  available: number;
  waitlist_count: number;
  attended_count: number;
  status: "open" | "closed" | "cancelled" | "in_progress";
}

export interface RealtimeExamSession {
  id: number;
  batch_name: string;
  exam_level: string; // e.g., "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSKK Trung cấp"
  room_name: string;
  location: string;
  date: string;
  shift: "morning" | "afternoon" | "evening";
  shift_time: string;
  capacity: number;
  booked: number;
  held: number;
  available: number;
  waitlist_count: number;
  fee: number;
  registration_deadline: string;
  status: "open" | "full" | "in_progress" | "closed" | "cancelled";
  occupancy_rate: number;
}

export interface RevenueMetric {
  total_revenue: number;
  today_revenue: number;
  month_revenue: number;
  growth_rate: number;
  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  avg_order_value: number;
}

export interface DailyRevenuePoint {
  date: string;
  display_date: string;
  revenue: number;
  orders: number;
}

export interface LevelDistributionPoint {
  level: string;
  candidates: number;
  revenue: number;
  fill_percentage: number;
}

export interface RecentAdminActivity {
  id: string;
  type: "payment" | "registration" | "seat_release" | "verification" | "system";
  title: string;
  description: string;
  timestamp: string;
  badge_text?: string;
  status?: "success" | "warning" | "info" | "danger";
}

export interface AdminDashboardData {
  revenue: RevenueMetric;
  daily_revenue: DailyRevenuePoint[];
  level_distribution: LevelDistributionPoint[];
  realtime_sessions: RealtimeExamSession[];
  recent_activities: RecentAdminActivity[];
  total_candidates: number;
  pending_documents: number;
  active_sessions_count: number;
  held_seats_count: number;
  fill_rate: number;
  payment_success_rate: number;
  payment_funnel: any[];
  exception_transactions: any[];
}

// ─── Hồ sơ thí sinh (Admin) — theo API_DOCUMENTATION.md §3.8 – §3.11 ─────────
export type DocumentVerificationStatus = "pending" | "verified" | "rejected";

export interface CandidateDocument {
  id: number;
  candidate_id: number;
  doc_type: "cccd" | "passport" | string;
  doc_number: string;
  issue_date?: string | null;
  issue_place?: string | null;
  front_image_url?: string | null;
  back_image_url?: string | null;
  portrait_image_url?: string | null;
  verification_status: DocumentVerificationStatus;
  rejection_reason?: string | null;
  ward_id?: number | null;
  province_id?: number | null;
  address_detail?: string | null;
}

export interface AdminCandidateResponseDTO {
  id: number;
  account_id: number;
  full_name: string;
  full_name_cn?: string | null;
  dob: string;
  gender: "male" | "female" | "other" | string;
  nationality: string;
  ethnicity?: string | null;
  religion?: string | null;
  chinese_study_years?: number | null;
  phone?: string | null;
  email?: string | null;
  latest_document?: CandidateDocument | null;
  exam_level?: string | null;
  target_exam_level?: string | null;
  created_at?: string;
}

export interface CandidateMetrics {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface DuplicateCandidateItem {
  doc_number: string;
  doc_type: string;
  candidate_ids: number[];
  count: number;
}

/** Ma trận hành động hiển thị trong dropdown của từng hồ sơ */
export interface CandidateRowActions {
  canApprove: boolean;
  canReject: boolean;
  canReapprove: boolean;
  canRevoke: boolean;
  canCheckDuplicate: boolean;
  canCopyDocNumber: boolean;
  canCopyPhone: boolean;
  canEmail: boolean;
  canDisableAccount: boolean;
}

// ─── Nhật ký hệ thống — API_DOCUMENTATION.md §11.1 ───────────────────────────
export type AuditLogAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SOFT_DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PAYMENT"
  | "REFUND"
  | "EXPORT"
  | "APPROVE"
  | "REJECT"
  | "RECHECK";

export type AuditLogEntityTable =
  | "accounts"
  | "candidates"
  | "candidate_documents"
  | "exam_rooms"
  | "exam_sessions"
  | "exam_seats"
  | "exam_registrations"
  | "payments"
  | "exam_results"
  | "exam_recheck_requests"
  | "certificates"
  | "certificate_deliveries";

export interface AuditLogEntryDTO {
  id: number;
  actor_id: number | null;
  action: AuditLogAction | string;
  entity_table: AuditLogEntityTable | string;
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

/** Envelope chuẩn của API (§1.1) */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code?: string; message?: string } | string | null;
  meta?: PaginationMeta | null;
  msg?: string;
}
