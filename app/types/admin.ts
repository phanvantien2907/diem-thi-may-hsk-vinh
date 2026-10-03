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
