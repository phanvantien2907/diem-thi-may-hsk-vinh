/**
 * Types cho Module Candidate (Hồ sơ thí sinh)
 * Tham chiếu: API Documentation — Section 3. Module Candidate
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type CandidateGender = "male" | "female" | "other";
export type DocumentType = "cccd" | "passport";
export type VerificationStatus = "pending" | "verified" | "rejected";

// ─── Candidate Profile ────────────────────────────────────────────────────────

/** Request body cho POST /api/v1/me/candidate-profile */
export interface CreateCandidateRequest {
  full_name: string;
  full_name_cn?: string;
  dob: string; // YYYY-MM-DD
  gender: CandidateGender;
  ethnicity?: string;
  religion?: string;
  nationality?: string;
  chinese_study_years?: number;
}

/** Request body cho PATCH /api/v1/me/candidate-profile */
export interface UpdateCandidateRequest {
  full_name?: string;
  full_name_cn?: string;
  ethnicity?: string;
  religion?: string;
  nationality?: string;
  chinese_study_years?: number;
}

/** Response DTO từ GET/POST /api/v1/me/candidate-profile */
export interface CandidateResponseDTO {
  id: number;
  account_id: number;
  full_name: string;
  full_name_cn: string | null;
  dob: string; // ISO datetime
  gender: CandidateGender;
  ethnicity: string | null;
  religion: string | null;
  birthplace: string | null;
  nationality: string;
  mother_tongue: string | null;
  chinese_study_years: number | null;
}

// ─── Candidate Documents ──────────────────────────────────────────────────────

/** Request body cho POST /api/v1/me/candidate-profile/documents */
export interface CreateDocumentRequest {
  doc_type: DocumentType;
  doc_number: string;
  issue_date: string; // YYYY-MM-DD
  issue_place: string;
  front_image_url: string;
  back_image_url?: string;
  portrait_image_url: string;
  ward_id?: number;
  address_detail?: string;
}

/** Response DTO từ documents endpoint */
export interface DocumentResponseDTO {
  id: number;
  candidate_id: number;
  doc_type: DocumentType;
  doc_number: string;
  issue_date: string;
  issue_place: string;
  front_image_url: string;
  back_image_url: string | null;
  portrait_image_url: string;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
}

// ─── Cloudinary Upload ────────────────────────────────────────────────────────

/** Response từ GET /api/v1/me/candidate-profile/upload-signature */
export interface CloudinarySignatureDTO {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder: string;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface Province {
  id: number;
  code: string;
  name: string;
}

export interface Ward {
  id: number;
  province_id: number;
  code: string;
  name: string;
  type: string;
}
