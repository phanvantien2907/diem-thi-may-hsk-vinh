/**
 * TypeScript types for Registration Results module (API §5.11)
 * Đối chiếu 100% với Backend Go DTOs tại `internal/registration/dto/`
 */

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface SessionAlertDTO {
  type: "nearly_full" | "too_few_registrants" | "ineligible_docs_near_exam" | "seat_discrepancy" | string;
  severity: "info" | "warning" | "critical" | string;
  session_id: number;
  period_id?: number | null;
  message: string;
}

export interface SlotDiscrepancyDTO {
  session_id: number;
  period_id?: number | null;
  exam_type_name: string;
  exam_date: string;
  shift: string;
  confirmed_registrations: number;
  booked_seats: number;
  confirmed_seat_diff: number; // ConfirmedRegistrations - BookedSeats
  pending_payment_registrations: number;
  held_seats: number;
  pending_hold_diff: number; // PendingPaymentRegs - HeldSeats
  unpaid_confirmed_registrations: number;
  message: string;
}

export interface SlotRegistrationStatsDTO {
  session_id: number;
  period_id?: number | null;
  exam_type_id: number;
  exam_type_code: string;
  exam_type_name: string;
  room_id?: number | null;
  room_name: string;
  exam_date: string;
  shift: "morning" | "afternoon" | "evening" | string;
  exam_time_start?: string | null;
  exam_time_end?: string | null;
  fee: number;
  status: string;
  effective_status: string;
  capacity: number;
  confirmed_count: number;
  pending_payment_count: number;
  cancelled_count: number;
  attended_count: number;
  booked_seats: number;
  held_seats: number;
  available_seats: number;
  waitlist_count: number;
  fill_rate_percent: number;
  single_slot_count: number;
  multi_slot_count: number;
  eligible_count: number;
  ineligible_count: number;
  pending_review_count: number;
  has_discrepancy: boolean;
  discrepancy?: SlotDiscrepancyDTO | null;
  alerts: SessionAlertDTO[];
}

export interface PeriodRegistrationSummaryDTO {
  period_id: number;
  period_code: string;
  period_name: string;
  status: string;
  effective_status: string;
  start_date: string;
  end_date: string;
  registration_start?: string | null;
  registration_deadline?: string | null;
  total_slots: number;
  total_capacity: number;
  total_confirmed: number;
  total_pending_payment: number;
  total_cancelled: number;
  total_booked_seats: number;
  total_held_seats: number;
  total_available_seats: number;
  total_waitlist: number;
  multi_slot_candidates: number;
  single_slot_candidates: number;
  eligible_confirmed_count: number;
  ineligible_active_count: number;
  discrepancy_count: number;
  alerts: SessionAlertDTO[];
  slots: SlotRegistrationStatsDTO[];
}

export interface CandidateShortcutLinksDTO {
  detail_and_acquire_lock_url: string; // GET /api/v1/admin/candidates/:id
  approve_document_url: string;        // POST /api/v1/admin/candidates/:id/approve
  reject_document_url: string;         // POST /api/v1/admin/candidates/:id/reject
  revoke_approval_url: string;         // POST /api/v1/admin/candidates/:id/revoke-approval
  reopen_review_url: string;           // POST /api/v1/admin/candidates/:id/reopen-review
  release_lock_url: string;            // DELETE /api/v1/admin/candidates/:id/lock
}

export interface SlotRegisteredCandidateItemDTO {
  registration_id: number;
  session_id: number;
  period_id?: number | null;
  seat_id: number;
  seat_number: string;
  seat_status: string;
  registration_status: "pending_payment" | "confirmed" | "cancelled" | string;
  registered_at: string;
  is_attended: boolean;
  candidate_id: number;
  account_id: number;
  full_name: string;
  full_name_cn?: string | null;
  dob: string;
  gender: string;
  masked_phone: string;
  email: string;
  doc_id?: number | null;
  doc_type: string;
  masked_doc_number: string;
  verification_status: "pending" | "verified" | "rejected" | "missing" | string;
  rejection_reason?: string | null;
  has_portrait_photo: boolean;
  has_identity_photos: boolean;
  payment_id?: number | null;
  payment_status: "success" | "pending" | "pending_refund" | "refunded" | "cancelled" | "none" | string;
  payment_amount?: number | null;
  eligibility_status: "eligible" | "pending_review" | "ineligible" | string;
  eligibility_reasons: string[];
  registered_slot_count: number;
  is_multi_slot: boolean;
  registered_session_ids?: number[];
  profile_shortcuts: CandidateShortcutLinksDTO;
}

export interface AdminWaitlistItemDTO {
  waitlist_id: number;
  session_id: number;
  queue_position: number;
  joined_at: string;
  candidate_id: number;
  account_id: number;
  full_name: string;
  dob: string;
  gender: string;
  masked_phone: string;
  email: string;
  masked_doc_number: string;
  verification_status: string;
  registered_slot_count: number;
  is_multi_slot: boolean;
  profile_shortcuts: CandidateShortcutLinksDTO;
}

export interface AdminCancelRegistrationResponseDTO {
  registration_id: number;
  session_id: number;
  seat_id: number;
  status: string;
  payment_id?: number | null;
  payment_status: string;
  refund_amount?: number | null;
  message: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface AdminListPeriodResultsRequestDTO {
  page?: number;
  limit?: number;
  status?: "draft" | "published" | "registration_open" | "registration_closed" | "completed" | "cancelled" | "all";
  search?: string;
}

export interface AdminListSlotRegistrationsRequestDTO {
  page?: number;
  limit?: number;
  search?: string;
  registration_status?: "pending_payment" | "confirmed" | "cancelled" | "all";
  verification_status?: "pending" | "verified" | "rejected" | "missing" | "all";
  eligibility?: "eligible" | "ineligible" | "pending_review" | "all";
  slot_scope?: "single" | "multiple" | "all";
}

export interface AdminExportRegistrationsRequestDTO {
  period_id?: number;
  session_id?: number;
  format: "pdf" | "excel" | "csv";
  eligibility?: "eligible" | "ineligible" | "pending_review" | "all";
  registration_status?: "confirmed" | "pending_payment" | "cancelled" | "all";
  slot_scope?: "single" | "multiple" | "all";
  search?: string;
}

export interface AdminCancelRegistrationRequestDTO {
  reason: string;
  evidence_urls?: string[];
}

export interface AdminTransferRegistrationRequestDTO {
  new_exam_session_id: number;
  reason?: string;
}

export interface AdminListWaitlistRequestDTO {
  page?: number;
  limit?: number;
}

