export type NotificationType =
  | "PROFILE_REJECTED"
  | "PROFILE_APPROVED"
  | "PROFILE_REOPENED"
  | "SHIFT_CHANGED"
  | "EXAM_RESCHEDULED"
  | "PAYMENT_CONFIRMED"
  | "SYSTEM"
  | string;

export interface ProfileStatusUpdatedPayload {
  status: "verified" | "rejected" | "pending" | "eligible" | string;
  eligible?: boolean;
  reason?: string;
}

export interface ForceLogoutPayload {
  code?: string;
  message?: string;
  reason?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  account_id?: number;
  role: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  channel?: string;
  status?: string;
  created_at: string;
}

export interface NotificationReadPayload {
  id: number;
  user_id?: number;
  is_read: boolean;
}

export interface WSNotificationEnvelope<T = unknown> {
  type?: string;
  event?: string;
  payload?: T;
  data?: T;
  timestamp?: string;
}

export interface WSTicketResponse {
  ticket: string;
  expires_in: number;
  expires_at?: string;
}

export const WS_CLOSE_CODE_TOKEN_EXPIRED = 4001;
export const WS_CLOSE_CODE_MAX_CONN_EVICTED = 4002;
export const WS_CLOSE_CODE_SESSION_TERMINATED = 4003;
