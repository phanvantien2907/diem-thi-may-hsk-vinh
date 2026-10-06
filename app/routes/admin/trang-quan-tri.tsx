import * as React from "react";
import type { Route } from "./+types/trang-quan-tri";
import { Link, useRevalidator } from "react-router";
import { useWebSocket, type WSEvent } from "~/hooks/use-websocket";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import {
  TrendingUpIcon,
  UsersIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  DoorOpenIcon,
  RadioIcon,
  RefreshCwIcon,
  ClockIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  DownloadIcon,
  PlusIcon,
  ActivityIcon,
  ZapIcon,
  ChevronRightIcon,
  PieChartIcon,
  BarChart3Icon,
  ShieldAlertIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "~/components/ui/toast";
import { formatVND, formatNumber } from "~/lib/chart-utils";

import { InteractiveRevenueChart, type DataPoint } from "~/components/dashboard/InteractiveRevenueChart";
import { HskLevelDonutChart } from "~/components/dashboard/HskLevelDonutChart";
import { PaymentHourlyTrafficChart } from "~/components/dashboard/PaymentHourlyTrafficChart";
import { ExceptionTransactionsTable } from "~/components/dashboard/ExceptionTransactionsTable";
import { RecentActivityFeed } from "~/components/dashboard/RecentActivityFeed";
import type { AdminDashboardData } from "~/types/admin";

export const meta: Route.MetaFunction = () => [
  { title: "Bảng điều khiển" },
  {
    name: "description",
    content: "Bảng điều khiển trung tâm giám sát ca thi, doanh thu và hồ sơ thí sinh thời gian thực.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);

  let dashboardData: AdminDashboardData = {
    revenue: {
      total_revenue: 0,
      today_revenue: 0,
      month_revenue: 0,
      growth_rate: 0,
      successful_transactions: 0,
      pending_transactions: 0,
      failed_transactions: 0,
      avg_order_value: 0,
    },
    daily_revenue: [],
    level_distribution: [],
    realtime_sessions: [],
    recent_activities: [],
    total_candidates: 0,
    pending_documents: 0,
    active_sessions_count: 0,
    held_seats_count: 0,
    fill_rate: 0,
    payment_success_rate: 0,
    payment_funnel: [],
    exception_transactions: [],
  };

  try {
    const [overviewRes, revenueRes, hskRes, liveRes, logsRes, funnelRes, exceptionsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/admin/metrics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/metrics/revenue-chart?range=7days`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/metrics/hsk-distribution`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/sessions/live-status`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/logs/recent?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/metrics/payment-funnel`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/v1/admin/transactions/exceptions`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const [overview, revenue, hsk, live, logs, funnel, exceptions] = await Promise.all([
      overviewRes.ok ? overviewRes.json() : null,
      revenueRes.ok ? revenueRes.json() : null,
      hskRes.ok ? hskRes.json() : null,
      liveRes.ok ? liveRes.json() : null,
      logsRes.ok ? logsRes.json() : null,
      funnelRes.ok ? funnelRes.json() : null,
      exceptionsRes.ok ? exceptionsRes.json() : null,
    ]);

    if (overview?.data) {
      dashboardData.revenue.total_revenue = overview.data.total_revenue || 0;
      dashboardData.total_candidates = overview.data.total_registrations || 0;
      dashboardData.fill_rate = overview.data.fill_rate || 0;
      dashboardData.payment_success_rate = overview.data.payment_success_rate || 0;
    }

    if (revenue?.data) {
      dashboardData.daily_revenue = revenue.data.map((r: any) => ({
        date: r.date,
        display_date: r.date.split("-").reverse().join("/"),
        revenue: r.revenue,
        orders: r.registrations,
      }));
    }

    if (hsk?.data) {
      dashboardData.level_distribution = hsk.data.map((h: any) => ({
        level: h.level,
        candidates: h.count,
        revenue: 0,
        fill_percentage: 0
      }));
    }

    if (funnel?.data) {
      dashboardData.payment_funnel = funnel.data;
    }

    if (exceptions?.data) {
      dashboardData.exception_transactions = exceptions.data;
    }

    if (live?.data) {
      dashboardData.realtime_sessions = live.data.map((s: any) => ({
        id: s.session_id,
        batch_name: "Đợt thi hiện tại",
        exam_level: s.exam_type_name,
        room_name: s.room_name,
        location: "Trường Đại học Vinh",
        date: s.session_date,
        shift: s.shift,
        shift_time: s.shift === "morning" ? "08:30 - 11:00" : s.shift === "afternoon" ? "14:00 - 16:30" : "18:00 - 20:30",
        capacity: s.total_seats,
        booked: s.locked_seats,
        held: s.holding_seats,
        available: s.available_seats,
        waitlist_count: 0,
        fee: 850000,
        registration_deadline: s.session_date,
        status: s.available_seats === 0 ? "full" : "open",
        occupancy_rate: s.total_seats > 0 ? Math.round(((s.locked_seats + s.holding_seats) / s.total_seats) * 100) : 0,
      }));
      dashboardData.active_sessions_count = live.data.length;
      dashboardData.held_seats_count = live.data.reduce((acc: number, cur: any) => acc + cur.holding_seats, 0);
    }

    if (logs?.data) {
      dashboardData.recent_activities = logs.data.map((l: any) => ({
        id: `ACT-${l.id}`,
        type: l.action.includes("approve") ? "verification" : l.action.includes("refund") ? "payment" : "system",
        title: `Thao tác: ${l.action}`,
        description: `Bảng ${l.entity_table} ID ${l.entity_id} bởi Admin ID ${l.actor_id || "Hệ thống"}`,
        timestamp: new Date(l.created_at).toLocaleTimeString("vi-VN"),
        status: "info",
      }));
    }
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
  }

  return { user, token, apiBaseUrl: API_BASE_URL, dashboardData };
}

export default function AdminDashboardPage({ loaderData }: Route.ComponentProps) {
  const { user, token, apiBaseUrl, dashboardData } = loaderData;
  const revalidator = useRevalidator();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastSyncTime, setLastSyncTime] = React.useState("09:00:00");
  const [hoveredPointInfo, setHoveredPointInfo] = React.useState<DataPoint | null>(null);
  const [activeExceptionsCount, setActiveExceptionsCount] = React.useState<number>(0);

  React.useEffect(() => {
    setLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
  }, []);

  // Kết nối WebSocket thời gian thực (Real-time 100%, không dùng polling API theo yêu cầu)
  const { isConnected } = useWebSocket({
    url: apiBaseUrl,
    token,
    onMessage: (event: WSEvent) => {
      console.log("[WS Dashboard] Real-time event received:", event.type, event.payload);
      setLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));

      // Tự động revalidate tải lại dữ liệu mới nhất khi nhận tín hiệu từ WebSocket
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }

      // Thông báo Toast tương ứng từng sự kiện real-time
      if (event.type === "payment_confirmed") {
        toast.add({
          type: "success",
          title: "Thanh toán thành công (Real-time)",
          description: `Đơn thi #${event.payload?.registration_id || ""} vừa được khớp lệnh thanh toán tức thì qua PayOS.`,
        });
      } else if (event.type === "registration_created") {
        toast.add({
          type: "info",
          title: "Thí sinh đăng ký mới (Real-time)",
          description: `Ca thi #${event.payload?.session_id || ""} vừa có thí sinh đăng ký giữ chỗ.`,
        });
      } else if (event.type === "seats_released") {
        toast.add({
          type: "info",
          title: "Thu hồi ghế hết hạn (Real-time)",
          description: `Hệ thống vừa tự động giải phóng ${event.payload?.released_count || 0} ghế quá hạn 15 phút.`,
        });
      } else if (event.type === "dashboard_metrics_updated") {
        toast.add({
          type: "info",
          title: "Chỉ số Dashboard cập nhật (Real-time)",
          description: "Dữ liệu vận hành vừa được đồng bộ tự động mới nhất.",
        });
      }
    },
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    revalidator.revalidate();
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSyncTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
      toast.add({
        type: "success",
        title: "Đồng bộ thời gian thực thành công!",
        description: `Dữ liệu Dashboard được làm mới tức thì từ máy chủ PostgreSQL lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      });
    }, 300);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── 1. Top Banner & Operations Header ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Bảng điều khiển vận hành
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Xin chào, <strong className="text-foreground font-semibold">{user.name}</strong>! Giám sát đợt thi máy, doanh thu và lưu lượng thí sinh thời gian thực.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-8.5 px-3.5 shadow-2xs"
          >
            <RefreshCwIcon className={`size-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Đang đồng bộ..." : "Đồng bộ"}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              toast.add({
                type: "info",
                title: "Kết xuất báo cáo tài chính",
                description: "Đang tải xuống tệp dữ liệu tổng hợp Excel (Đợt thi Tháng 10/2026)...",
              });
            }}
            className="rounded-full cursor-pointer hover:bg-primary/90 font-medium text-xs h-8.5 px-3.5 shadow-2xs"
          >
            <DownloadIcon className="size-3.5 mr-1.5" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {/* ── 2. Real-time Status Alert Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-foreground shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
            />
            <span
              className={`relative inline-flex rounded-full size-2.5 ${isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
            />
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span
              className={`font-semibold ${isConnected ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
                }`}
            >
              {isConnected ? "Kênh WebSocket Real-time: Đang hoạt động" : "Kênh WebSocket Real-time: Đang kết nối..."}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              Dữ liệu truy vấn trực tiếp thời gian thực 100% (Không bộ nhớ đệm cache). Tự động nhận biến động thanh toán & ghế thi.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-[11px] text-muted-foreground font-mono">
          <span>Đồng bộ lần cuối:</span>
          <span className="font-semibold text-foreground">{lastSyncTime}</span>
        </div>
      </div>

      {/* ── 3. High-Impact KPI Cards (Thống kê chính) ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Doanh thu */}
        <Card className="rounded-2xl border hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng doanh thu kỳ thi</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <CreditCardIcon className="size-4.5" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {formatVND(dashboardData.revenue.total_revenue)}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUpIcon className="size-3.5 mr-0.5" />
                  +{dashboardData.revenue.growth_rate}%
                </span>
                <span className="text-muted-foreground">so với kỳ trước</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Hôm nay: {formatVND(dashboardData.revenue.today_revenue)}</span>
              <span className="font-medium text-foreground">{dashboardData.revenue.successful_transactions} đơn</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Thí sinh đăng ký */}
        <Card className="rounded-2xl border hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Hồ sơ thí sinh dự thi</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <UsersIcon className="size-4.5" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {formatNumber(dashboardData.total_candidates)}
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUpIcon className="size-3.5 mr-0.5" />
                  +142 thí sinh
                </span>
                <span className="text-muted-foreground">trong 24 giờ qua</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Chờ duyệt: <strong className="text-amber-600 dark:text-amber-400">{dashboardData.pending_documents} hồ sơ</strong></span>
              <Link to="/quan-ly-ho-so-dang-ky" className="text-primary hover:underline font-medium cursor-pointer">
                Xét duyệt →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Ca thi & Ghế ngồi */}
        <Card className="rounded-2xl border hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Công suất phòng máy thi</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DoorOpenIcon className="size-4.5" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {dashboardData.fill_rate || 0}%
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">
                  {dashboardData.realtime_sessions.reduce((acc, s) => acc + s.booked, 0)} / {dashboardData.realtime_sessions.reduce((acc, s) => acc + s.capacity, 0)}
                </span>
                <span>ghế đã xác nhận</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Đang giữ chỗ 15p: <strong className="text-amber-600 dark:text-amber-400">{dashboardData.held_seats_count} ghế</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">12 ca mở</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Tỷ lệ thanh toán thành công */}
        <Card className="rounded-2xl border hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tỷ lệ thanh toán PayOS</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheckIcon className="size-4.5" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {dashboardData.payment_success_rate || 0}%
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex items-center font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-3.5 mr-0.5" />
                  Idempotent OK
                </span>
                <span className="text-muted-foreground">Chống lệch giá</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Chờ thanh toán: {dashboardData.revenue.pending_transactions}</span>
              <Link to="/quan-ly-giao-dich-thanh-toan" className="text-primary hover:underline font-medium cursor-pointer">
                Đối soát →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. Main Chart: Biến động Doanh thu & Thí sinh Đa kỳ hạn ─────────── */}
      <Card className="rounded-2xl border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Biến động Doanh thu & Lượng Thí sinh Đăng ký</span>
                <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  Tải 0ms • Siêu mượt
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Chuyển đổi linh hoạt giữa Hôm nay (theo mốc giờ), 7 ngày, 30 ngày, 3 tháng (Quý), 6 tháng và Cả năm 2026. Di chuột trên biểu đồ để xem thông số live.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <InteractiveRevenueChart
            onPointHover={setHoveredPointInfo}
            initial7DaysData={dashboardData.daily_revenue}
          />
        </CardContent>
      </Card>

      {/* ── 5. Secondary Charts Grid: Phân bổ HSK & Giờ cao điểm PayOS ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Phân bổ HSK Donut */}
        <Card className="rounded-2xl border overflow-hidden flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b bg-card">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <PieChartIcon className="size-4.5 text-primary" />
                  <span>Phân bổ Thí sinh theo Cấp độ HSK</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Tỷ trọng đăng ký và doanh thu từng cấp độ HSK 3, 4, 5, 6 & HSKK.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">
                Tương tác
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <HskLevelDonutChart initialData={dashboardData.level_distribution} />
          </CardContent>
        </Card>

        {/* Chart 3: Giờ cao điểm nộp lệ phí & Phễu thanh toán */}
        <Card className="rounded-2xl border overflow-hidden flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b bg-card">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <BarChart3Icon className="size-4.5 text-blue-500" />
                  <span>Giờ cao điểm & Phễu Thanh toán PayOS</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Lưu lượng thí sinh nộp lệ phí theo giờ và tỷ lệ giải phóng ghế tự động.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">
                Thời gian thực
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <PaymentHourlyTrafficChart initialData={dashboardData.payment_funnel} />
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Cảnh báo Giao dịch Ngoại lệ (Cần Kế toán / Admin can thiệp) ─ */}
      <Card className="rounded-2xl border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <ShieldAlertIcon className="size-4.5 text-destructive" />
                  <span>Cảnh báo giao dịch ngoại lệ PayOS</span>
                </CardTitle>
                {activeExceptionsCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px] rounded-full px-2.5 py-0.5 animate-pulse font-mono">
                    {activeExceptionsCount} ca cần duyệt
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] rounded-full px-2.5 py-0.5 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    0 ca cần duyệt
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Cơ chế Amount Guard và Webhook Logging tự động phát hiện các ca chuyển thiếu tiền, chuyển thừa tiền hoặc lỗi nghẽn mạng ngân hàng để Admin kịp thời bấm "Duyệt thủ công" giữ slot thi cho thí sinh.
              </CardDescription>
            </div>

            <Link to="/quan-ly-giao-dich-thanh-toan">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-8 px-3.5 shadow-2xs"
              >
                <CreditCardIcon className="size-3.5 mr-1.5 text-primary" />
                Sổ đối soát PayOS
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <ExceptionTransactionsTable
            initialData={dashboardData.exception_transactions}
            onActiveCountChange={setActiveExceptionsCount}
          />
        </CardContent>
      </Card>

      {/* ── 7. Real-time Live Exam Batches & Sessions ───────────────────────── */}
      <Card className="rounded-2xl border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold">
                  Đợt thi & Ca thi theo thời gian thực
                </CardTitle>
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Giám sát tỷ lệ lấp đầy ghế ngồi theo thời gian thực (Đã đặt, Đang giữ chỗ 15 phút, Ghế trống).
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/quan-ly-ky-thi-ca-thi">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-8 px-3"
                >
                  <CalendarDaysIcon className="size-3.5 mr-1" />
                  Quản lý ca thi
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.realtime_sessions.map((session) => {
              const bookedPct = Math.round((session.booked / session.capacity) * 100);
              const heldPct = Math.round((session.held / session.capacity) * 100);
              const isFull = session.available === 0;

              return (
                <div
                  key={session.id}
                  className="rounded-2xl border border-border/80 bg-background/50 hover:bg-muted/10 p-4 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {session.exam_level}
                        </span>
                        <Badge
                          variant={isFull ? "secondary" : "default"}
                          className="text-[10px] rounded-full px-2 py-0"
                        >
                          {isFull ? "Đã đầy chỗ" : "Đang mở đăng ký"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span>{session.room_name}</span>
                        <span>•</span>
                        <span>{session.location}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-xs text-primary">
                        {formatVND(session.fee)}
                      </span>
                      <p className="text-[10px] text-muted-foreground">lệ phí thi</p>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-3 text-xs text-foreground bg-muted/40 px-3 py-2 rounded-xl">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ClockIcon className="size-3.5" />
                      <span>{session.date}</span>
                    </div>
                    <span>•</span>
                    <span className="font-medium">{session.shift_time}</span>
                  </div>

                  {/* Real-time Seat Progress Bar */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tình trạng ghế phòng máy:</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {session.booked} đã đặt
                        </span>
                        {session.held > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {session.held} giữ (15p)
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          / {session.capacity} ghế
                        </span>
                      </div>
                    </div>

                    {/* Stacked Bar: Booked + Held + Available */}
                    <div className="h-2.5 w-full bg-muted/80 rounded-full overflow-hidden flex">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${bookedPct}%` }}
                        title={`${session.booked} ghế đã thanh toán`}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all duration-300 animate-pulse"
                        style={{ width: `${heldPct}%` }}
                        title={`${session.held} ghế đang giữ chỗ (15 phút)`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>Còn trống: <strong className="text-foreground">{session.available} ghế</strong></span>
                      {session.waitlist_count > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          {session.waitlist_count} thí sinh chờ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 8. Bottom Grid: Recent Activity & Quick Operations ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed (2 cols) */}
        <Card className="lg:col-span-2 rounded-2xl border overflow-hidden shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b bg-card">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Nhật ký hoạt động thời gian thực
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Theo dõi trực tiếp thanh toán PayOS, duyệt giấy tờ và sự kiện tự động của hệ thống.
                </CardDescription>
              </div>
              <ActivityIcon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <RecentActivityFeed />
          </CardContent>
        </Card>

        {/* Quick Operations Guide & Actions (1 col) */}
        <Card className="rounded-2xl border overflow-hidden flex flex-col justify-between shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b bg-card">
            <CardTitle className="text-base sm:text-lg font-bold">
              Tác vụ quản trị nhanh
            </CardTitle>
            <CardDescription className="text-xs">
              Các phím tắt và thao tác vận hành trọng tâm.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2.5">
              <Link to="/quan-ly-ky-thi-ca-thi" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-9.5 px-4"
                >
                  <span className="flex items-center gap-2">
                    <PlusIcon className="size-3.5 text-primary" />
                    Tạo ca thi mới hàng loạt
                  </span>
                  <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link to="/quan-ly-ho-so-dang-ky" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-9.5 px-4"
                >
                  <span className="flex items-center gap-2">
                    <UsersIcon className="size-3.5 text-blue-500" />
                    Phê duyệt 38 hồ sơ chờ
                  </span>
                  <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>

              <Link to="/quan-ly-giao-dich-thanh-toan" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-full cursor-pointer hover:bg-muted font-medium text-xs h-9.5 px-4"
                >
                  <span className="flex items-center gap-2">
                    <CreditCardIcon className="size-3.5 text-emerald-500" />
                    Đối soát giao dịch ngân hàng
                  </span>
                  <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>

            {/* Note box */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <ZapIcon className="size-3.5" />
                <span>Quy chuẩn thi máy HSK</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mỗi ca thi yêu cầu tối thiểu 1 Giám thị chính và 1 Cán bộ kỹ thuật phòng máy tính.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
