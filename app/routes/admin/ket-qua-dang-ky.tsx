import * as React from "react";
import {
  useLoaderData,
  useRevalidator,
  type MetaFunction,
} from "react-router";
import type { Route } from "./+types/ket-qua-dang-ky";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowRightLeftIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  FileCheck2Icon,
  FilterIcon,
  LayersIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import { toast } from "~/components/ui/toast";
import type {
  PeriodRegistrationSummaryDTO,
  SlotDiscrepancyDTO,
  SlotRegisteredCandidateItemDTO,
  SlotRegistrationStatsDTO,
} from "~/types/registration-results";
import { ExportRegistrationsDialog } from "~/components/dashboard/registration-results/ExportRegistrationsDialog";
import { AdminCancelRegistrationDialog } from "~/components/dashboard/registration-results/AdminCancelRegistrationDialog";
import { AdminTransferRegistrationDialog } from "~/components/dashboard/registration-results/AdminTransferRegistrationDialog";
import { SlotWaitlistDialog } from "~/components/dashboard/registration-results/SlotWaitlistDialog";
import { DiscrepancyCheckDialog } from "~/components/dashboard/registration-results/DiscrepancyCheckDialog";
import { CandidateQuickReviewModal } from "~/components/dashboard/registration-results/CandidateQuickReviewModal";

// ─── Meta function — Project Rule 8 (Ngắn gọn, trực diện) ─────────────────────
export const meta: MetaFunction = () => {
  return [{ title: "Kết quả Đăng ký" }];
};

// ─── Date & Currency formatters — Project Rule 6 ──────────────────────────────
function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(isoString?: string | null, includeSeconds = true): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  if (!includeSeconds) {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Helper màu sắc rực rỡ cho Trạng thái (Vibrant Status Badges) ──────────────
function getPeriodStatusBadge(status?: string | null) {
  switch (status) {
    case "completed":
      return {
        label: "Hoàn thành",
        className: "bg-emerald-600 text-white font-semibold shadow-xs hover:bg-emerald-700 border-transparent",
      };
    case "draft":
      return {
        label: "Bản nháp",
        className: "bg-purple-600 text-white font-semibold shadow-xs hover:bg-purple-700 border-transparent",
      };
    case "registration_open":
      return {
        label: "Đang mở ĐK",
        className: "bg-sky-600 text-white font-semibold shadow-xs hover:bg-sky-700 border-transparent",
      };
    case "registration_closed":
      return {
        label: "Đã đóng ĐK",
        className: "bg-amber-600 text-white font-semibold shadow-xs hover:bg-amber-700 border-transparent",
      };
    case "published":
      return {
        label: "Đã công bố",
        className: "bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700 border-transparent",
      };
    case "cancelled":
      return {
        label: "Đã hủy",
        className: "bg-rose-600 text-white font-semibold shadow-xs hover:bg-rose-700 border-transparent",
      };
    default:
      return {
        label: status || "Không xác định",
        className: "bg-muted text-muted-foreground",
      };
  }
}

// ─── Server Loader ────────────────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const [periodsRes, discrepanciesRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/admin/registration-results/periods?page=1&limit=50&status=all`, { headers })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] })),
    fetch(`${API_BASE_URL}/api/v1/admin/registration-results/discrepancies`, { headers })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .catch(() => ({ data: [] })),
  ]);

  const periods: PeriodRegistrationSummaryDTO[] = periodsRes.data ?? [];
  const discrepancies: SlotDiscrepancyDTO[] = discrepanciesRes.data ?? [];

  return {
    user,
    token,
    periods,
    discrepancies,
  };
}

// ─── Component Chính ──────────────────────────────────────────────────────────
export default function RegistrationResultsRoute() {
  const { periods, discrepancies: initialDiscrepancies } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // Search & Period filtering
  const [periodSearch, setPeriodSearch] = React.useState("");
  const [periodStatusFilter, setPeriodStatusFilter] = React.useState("all");

  // Master-Detail 3-Level hierarchy state
  // Level 1: !selectedPeriod && !selectedSession
  // Level 2: selectedPeriod && !selectedSession
  // Level 3: selectedSession
  const [selectedPeriod, setSelectedPeriod] = React.useState<PeriodRegistrationSummaryDTO | null>(null);
  const [selectedSession, setSelectedSession] = React.useState<SlotRegistrationStatsDTO | null>(null);

  // Period table strict pagination state (Level 1)
  const [periodPage, setPeriodPage] = React.useState(1);
  const periodPageSize = 10;

  // Slot Candidates State (Level 3)
  const [candidates, setCandidates] = React.useState<SlotRegisteredCandidateItemDTO[]>([]);
  const [isCandidatesLoading, setIsCandidatesLoading] = React.useState(false);
  const [candidatePage, setCandidatePage] = React.useState(1);
  const [candidateTotalPages, setCandidateTotalPages] = React.useState(1);
  const [candidateTotalItems, setCandidateTotalItems] = React.useState(0);
  const candidatePageSize = 10;

  // Candidate Filters (Level 3)
  const [candidateSearch, setCandidateSearch] = React.useState("");
  const [candidateRegStatus, setCandidateRegStatus] = React.useState("all");
  const [candidateVerifStatus, setCandidateVerifStatus] = React.useState("all");
  const [candidateEligibility, setCandidateEligibility] = React.useState("all");
  const [candidateSlotScope, setCandidateSlotScope] = React.useState("all");

  // Dialog Controls
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportTargetPeriod, setExportTargetPeriod] = React.useState<PeriodRegistrationSummaryDTO | null>(null);
  const [exportTargetSession, setExportTargetSession] = React.useState<SlotRegistrationStatsDTO | null>(null);

  const [discrepanciesOpen, setDiscrepanciesOpen] = React.useState(false);
  const [discrepanciesList, setDiscrepanciesList] = React.useState<SlotDiscrepancyDTO[]>(initialDiscrepancies);
  const [isRefreshingDiscrepancies, setIsRefreshingDiscrepancies] = React.useState(false);

  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [waitlistSession, setWaitlistSession] = React.useState<SlotRegistrationStatsDTO | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = React.useState(false);
  const [reviewCandidateId, setReviewCandidateId] = React.useState<number | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelTargetCandidate, setCancelTargetCandidate] = React.useState<SlotRegisteredCandidateItemDTO | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [transferTargetCandidate, setTransferTargetCandidate] = React.useState<SlotRegisteredCandidateItemDTO | null>(null);
  const [isTransferring, setIsTransferring] = React.useState(false);

  // Load slot candidates when selectedSession or candidate filters change
  const loadCandidates = React.useCallback(
    async (sessionId: number, targetPage = 1) => {
      setIsCandidatesLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("limit", String(candidatePageSize));
        if (candidateSearch.trim()) params.set("search", candidateSearch.trim());
        if (candidateRegStatus !== "all") params.set("registration_status", candidateRegStatus);
        if (candidateVerifStatus !== "all") params.set("verification_status", candidateVerifStatus);
        if (candidateEligibility !== "all") params.set("eligibility", candidateEligibility);
        if (candidateSlotScope !== "all") params.set("slot_scope", candidateSlotScope);

        const res = await fetch(
          `/internal/admin/registration-results/sessions/${sessionId}/registrations?${params.toString()}`
        );
        if (!res.ok) throw new Error("Không thể tải danh sách thí sinh.");
        const json = await res.json();
        setCandidates(json.data ?? []);
        if (json.meta) {
          setCandidatePage(json.meta.page ?? 1);
          setCandidateTotalPages(Math.max(1, json.meta.total_pages ?? 1));
          setCandidateTotalItems(json.meta.total_items ?? 0);
        }
      } catch (err) {
        console.error(err);
        setCandidates([]);
      } finally {
        setIsCandidatesLoading(false);
      }
    },
    [candidateSearch, candidateRegStatus, candidateVerifStatus, candidateEligibility, candidateSlotScope]
  );

  React.useEffect(() => {
    if (selectedSession?.session_id) {
      loadCandidates(selectedSession.session_id, 1);
    } else {
      setCandidates([]);
    }
  }, [selectedSession?.session_id, loadCandidates]);

  // Refresh discrepancies list
  const refreshDiscrepancies = async () => {
    setIsRefreshingDiscrepancies(true);
    try {
      const res = await fetch("/internal/admin/registration-results/discrepancies");
      if (!res.ok) throw new Error("Không thể tải đối soát.");
      const json = await res.json();
      setDiscrepanciesList(json.data ?? []);
      toast.add({
        type: "success",
        title: "Đối soát thành công",
        description: `Đã cập nhật danh sách sai lệch (${json.data?.length ?? 0} ca có vấn đề).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi làm mới";
      toast.add({ type: "error", title: "Lỗi", description: msg });
    } finally {
      setIsRefreshingDiscrepancies(false);
    }
  };

  // Handle Cancel Registration Action
  const handleCancelRegistration = async (payload: { reason: string; evidence_urls: string[] }) => {
    if (!cancelTargetCandidate) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/admin/registrations/${cancelTargetCandidate.registration_id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Hủy đăng ký thất bại.");
      }

      toast.add({
        type: "success",
        title: "Hủy đăng ký thành công",
        description: json?.data?.message || "Đã giải phóng ghế và xử lý hoàn tiền thành công.",
      });

      setCancelDialogOpen(false);
      setCancelTargetCandidate(null);
      if (selectedSession) {
        loadCandidates(selectedSession.session_id, candidatePage);
      }
      revalidator.revalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi.";
      toast.add({ type: "error", title: "Thao tác thất bại", description: msg });
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Transfer Registration Action
  const handleTransferRegistration = async (payload: { new_exam_session_id: number; reason: string }) => {
    if (!transferTargetCandidate) return;
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/v1/admin/registrations/${transferTargetCandidate.registration_id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Chuyển ca thi thất bại.");
      }

      toast.add({
        type: "success",
        title: "Chuyển ca thi thành công",
        description: "Đã cập nhật ca thi mới cho thí sinh và hoán đổi ghế nguyên tử.",
      });

      setTransferDialogOpen(false);
      setTransferTargetCandidate(null);
      if (selectedSession) {
        loadCandidates(selectedSession.session_id, candidatePage);
      }
      revalidator.revalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi.";
      toast.add({ type: "error", title: "Thao tác thất bại", description: msg });
    } finally {
      setIsTransferring(false);
    }
  };

  // Calculate Overall Metrics across all periods
  const totalPeriods = periods.length;
  const totalSlots = periods.reduce((sum, p) => sum + p.total_slots, 0);
  const totalCapacity = periods.reduce((sum, p) => sum + p.total_capacity, 0);
  const totalConfirmed = periods.reduce((sum, p) => sum + p.total_confirmed, 0);
  const totalPendingPayment = periods.reduce((sum, p) => sum + p.total_pending_payment, 0);
  const totalWaitlist = periods.reduce((sum, p) => sum + p.total_waitlist, 0);
  const overallFillRate = totalCapacity > 0 ? Math.round((totalConfirmed / totalCapacity) * 100) : 0;
  const totalDiscrepancies = discrepanciesList.length;

  // Filter periods by search & status
  const filteredPeriods = periods.filter((p) => {
    const matchesSearch =
      periodSearch.trim() === "" ||
      p.period_name.toLowerCase().includes(periodSearch.toLowerCase()) ||
      p.period_code.toLowerCase().includes(periodSearch.toLowerCase());

    const matchesStatus =
      periodStatusFilter === "all" ||
      p.status === periodStatusFilter ||
      p.effective_status === periodStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Strict paginated periods for Level 1 table
  const totalPeriodPages = Math.max(1, Math.ceil(filteredPeriods.length / periodPageSize));
  const paginatedPeriods = filteredPeriods.slice((periodPage - 1) * periodPageSize, periodPage * periodPageSize);
  const periodStartItem = filteredPeriods.length === 0 ? 0 : (periodPage - 1) * periodPageSize + 1;
  const periodEndItem = Math.min(filteredPeriods.length, periodPage * periodPageSize);

  // Pagination item indices for Level 3 candidate table
  const candidateStartItem = candidateTotalItems === 0 ? 0 : (candidatePage - 1) * candidatePageSize + 1;
  const candidateEndItem = Math.min(candidateTotalItems, candidatePage * candidatePageSize);

  // Collect all available sessions from the current period for transferring
  const allPeriodSessions = selectedPeriod?.slots ?? [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Header: Tiêu đề trang + Hành động tổng thể ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <FileCheck2Icon className="size-6" />
            </div>
            <span>Kết quả Đăng ký</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Theo dõi dữ liệu đăng ký theo đợt thi & ca thi, tỷ lệ lấp đầy, hàng đợi chờ và đối soát sai lệch ghế.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 gap-1.5"
            onClick={() => {
              setDiscrepanciesOpen(true);
            }}
          >
            <AlertTriangleIcon
              className={`size-4 ${totalDiscrepancies > 0 ? "text-destructive" : "text-emerald-500"}`}
            />
            <span>Kiểm tra lệch ghế</span>
            {totalDiscrepancies > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {totalDiscrepancies}
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            className="rounded-full cursor-pointer hover:bg-primary/90 text-xs h-9 gap-1.5"
            onClick={() => {
              setExportTargetPeriod(selectedPeriod);
              setExportTargetSession(selectedSession);
              setExportOpen(true);
            }}
          >
            <DownloadIcon className="size-4" />
            <span>Xuất báo cáo</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metrics Cards Banner ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Đợt thi / Ca thi</div>
          <div className="text-xl font-bold tracking-tight mt-1 text-foreground">
            {totalPeriods} <span className="text-xs font-normal text-muted-foreground">đợt</span> • {totalSlots}{" "}
            <span className="text-xs font-normal text-muted-foreground">ca</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Đã xác nhận</div>
          <div className="text-xl font-bold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
            {totalConfirmed}{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {totalCapacity} chỗ</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Chờ nộp phí</div>
          <div className="text-xl font-bold tracking-tight mt-1 text-amber-600 dark:text-amber-400">
            {totalPendingPayment}{" "}
            <span className="text-xs font-normal text-muted-foreground">ghế giữ</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tỷ lệ lấp đầy</div>
          <div className="text-xl font-bold tracking-tight mt-1 text-primary">
            {overallFillRate}%
          </div>
        </Card>

        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Danh sách chờ</div>
          <div className="text-xl font-bold tracking-tight mt-1 text-foreground">
            {totalWaitlist}{" "}
            <span className="text-xs font-normal text-muted-foreground">thí sinh</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-card/60 backdrop-blur-sm border shadow-xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Lệch ghế cần xử lý</div>
          <div
            className={`text-xl font-bold tracking-tight mt-1 ${
              totalDiscrepancies > 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {totalDiscrepancies}{" "}
            <span className="text-xs font-normal text-muted-foreground">ca lệch</span>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
         CẤP 1: BẢNG TỔNG HỢP CÁC ĐỢT THI (MASTER TABLE)
         (Hiển thị khi chưa chọn đợt thi nào: !selectedPeriod && !selectedSession)
         ══════════════════════════════════════════════════════════════════════════ */}
      {!selectedPeriod && !selectedSession && (
        <div className="space-y-4">
          {/* Thanh tìm kiếm & lọc trạng thái đợt */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/30 border rounded-xl">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên đợt thi..."
                  value={periodSearch}
                  onChange={(e) => {
                    setPeriodSearch(e.target.value);
                    setPeriodPage(1);
                  }}
                  className="pl-8.5 h-9 text-xs w-full bg-background"
                />
              </div>

              <Select
                value={periodStatusFilter}
                onValueChange={(val) => {
                  setPeriodStatusFilter(val ?? "all");
                  setPeriodPage(1);
                }}
              >
                <SelectTrigger className="w-48 h-9 text-xs bg-background">
                  <SelectValue placeholder="Trạng thái đợt">
                    {(val) => {
                      switch (val) {
                        case "all":
                          return "Tất cả trạng thái";
                        case "registration_open":
                          return "Đang mở đăng ký";
                        case "registration_closed":
                          return "Đã đóng đăng ký";
                        case "published":
                          return "Đã công bố";
                        case "completed":
                          return "Hoàn thành";
                        case "draft":
                          return "Bản nháp";
                        case "cancelled":
                          return "Đã hủy";
                        default:
                          return val ?? "Trạng thái đợt";
                      }
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="registration_open">Đang mở đăng ký</SelectItem>
                  <SelectItem value="registration_closed">Đã đóng đăng ký</SelectItem>
                  <SelectItem value="published">Đã công bố</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs text-muted-foreground self-center">
              Hiển thị <strong>{filteredPeriods.length}</strong> / {periods.length} đợt thi
            </span>
          </div>

          {/* Bảng Đợt thi Master Table (Không lồng overflow-x-auto, căn lề cột tường minh) */}
          <div className="rounded-xl border overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs">
                  <TableHead className="w-[150px] min-w-[140px] font-semibold">Mã đợt thi</TableHead>
                  <TableHead className="min-w-[200px] max-w-[280px] font-semibold">Tên đợt thi</TableHead>
                  <TableHead className="w-[180px] min-w-[170px] font-semibold">Thời gian thi & Hạn chót</TableHead>
                  <TableHead className="w-[90px] min-w-[80px] font-semibold text-center">Số ca thi</TableHead>
                  <TableHead className="w-[170px] min-w-[150px] font-semibold">Tiến độ lấp đầy</TableHead>
                  <TableHead className="w-[130px] min-w-[120px] font-semibold text-center">Trạng thái</TableHead>
                  <TableHead className="w-[110px] min-w-[100px] font-semibold text-center">Lệch ghế</TableHead>
                  <TableHead className="w-[120px] min-w-[110px] text-right font-semibold">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPeriods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                      Không tìm thấy đợt thi nào phù hợp với bộ lọc tìm kiếm.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPeriods.map((period) => {
                    const fillPercent =
                      period.total_capacity > 0
                        ? Math.round((period.total_confirmed / period.total_capacity) * 100)
                        : 0;
                    const badgeInfo = getPeriodStatusBadge(period.effective_status || period.status);

                    return (
                      <TableRow
                        key={period.period_id}
                        className="text-xs hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          setSelectedPeriod(period);
                          setSelectedSession(null);
                        }}
                      >
                        {/* Mã đợt */}
                        <TableCell className="w-[150px] min-w-[140px] font-mono font-medium">
                          <Badge variant="outline" className="font-mono text-xs">
                            {period.period_code}
                          </Badge>
                        </TableCell>

                        {/* Tên đợt */}
                        <TableCell className="min-w-[200px] max-w-[280px]">
                          <div className="font-semibold text-foreground hover:text-primary transition-colors truncate" title={period.period_name}>
                            {period.period_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            ID: #{period.period_id}
                          </div>
                        </TableCell>

                        {/* Thời gian thi & Hạn chót */}
                        <TableCell className="w-[180px] min-w-[170px]">
                          <div className="flex items-center gap-1 text-[11px] text-foreground">
                            <CalendarDaysIcon className="size-3 text-muted-foreground shrink-0" />
                            <span>{formatDateOnly(period.start_date)} – {formatDateOnly(period.end_date)}</span>
                          </div>
                          {period.registration_deadline && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <ClockIcon className="size-3 shrink-0" />
                              <span>Hạn: {formatDateTime(period.registration_deadline, false)}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Số ca thi */}
                        <TableCell className="w-[90px] min-w-[80px] text-center font-medium">
                          <Badge variant="secondary" className="font-semibold text-xs">
                            {period.total_slots} ca
                          </Badge>
                        </TableCell>

                        {/* Tiến độ lấp đầy */}
                        <TableCell className="w-[170px] min-w-[150px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-foreground">
                                {period.total_confirmed} / {period.total_capacity} chỗ
                              </span>
                              <span
                                className={`font-semibold ${
                                  fillPercent >= 100
                                    ? "text-rose-600 dark:text-rose-400"
                                    : fillPercent >= 80
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-primary"
                                }`}
                              >
                                {fillPercent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  fillPercent >= 100
                                    ? "bg-rose-500"
                                    : fillPercent >= 80
                                    ? "bg-amber-500"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(fillPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* Trạng thái đợt (Vibrant Badge rực rỡ) */}
                        <TableCell className="w-[130px] min-w-[120px] text-center">
                          <Badge className={`text-xs px-2.5 py-0.5 ${badgeInfo.className}`}>
                            {badgeInfo.label}
                          </Badge>
                        </TableCell>

                        {/* Lệch ghế */}
                        <TableCell className="w-[110px] min-w-[100px] text-center">
                          {period.discrepancy_count > 0 ? (
                            <Badge variant="destructive" className="text-[11px] gap-1 px-2 py-0.5 animate-pulse">
                              <AlertTriangleIcon className="size-3" />
                              <span>{period.discrepancy_count} ca lệch</span>
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                              <CheckCircle2Icon className="size-3 text-emerald-500" />
                              <span>Khớp chuẩn</span>
                            </span>
                          )}
                        </TableCell>

                        {/* Hành động */}
                        <TableCell className="w-[120px] min-w-[110px] text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="rounded-full cursor-pointer hover:bg-primary/90 text-xs h-7 px-2.5 gap-1"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setSelectedSession(null);
                              }}
                            >
                              <span>Xem ca</span>
                              <ArrowRightIcon className="size-3" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon-sm"
                              className="rounded-full cursor-pointer hover:bg-muted size-7"
                              title="Xuất báo cáo đợt này"
                              onClick={() => {
                                setExportTargetPeriod(period);
                                setExportTargetSession(null);
                                setExportOpen(true);
                              }}
                            >
                              <DownloadIcon className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Phân trang danh sách Đợt thi thường trực (Luôn hiển thị chân trang) */}
            <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Hiển thị <strong>{periodStartItem} - {periodEndItem}</strong> trên tổng số <strong>{filteredPeriods.length}</strong> đợt thi
              </span>

              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className="rounded-full cursor-pointer text-xs h-8"
                      onClick={() => setPeriodPage((p) => Math.max(1, p - 1))}
                      disabled={periodPage <= 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPeriodPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationButton
                        className="size-8 rounded-full cursor-pointer text-xs"
                        isActive={p === periodPage}
                        onClick={() => setPeriodPage(p)}
                      >
                        {p}
                      </PaginationButton>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      className="rounded-full cursor-pointer text-xs h-8"
                      onClick={() => setPeriodPage((p) => Math.min(totalPeriodPages, p + 1))}
                      disabled={periodPage >= totalPeriodPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         CẤP 2: LƯỚI CÁC CA THI CỦA ĐỢT ĐÃ CHỌN (SLOTS VIEW)
         (Hiển thị khi đã chọn đợt thi nhưng chưa chọn ca thi: selectedPeriod && !selectedSession)
         ══════════════════════════════════════════════════════════════════════════ */}
      {selectedPeriod && !selectedSession && (
        <div className="space-y-4">
          {/* Header đợt thi đang xem + Nút Quay lại cấp 1 */}
          <div className="p-4 bg-muted/20 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full cursor-pointer hover:bg-muted text-xs h-8 gap-1.5"
                  onClick={() => {
                    setSelectedPeriod(null);
                    setSelectedSession(null);
                  }}
                >
                  <ArrowLeftIcon className="size-3.5" />
                  <span>Quay lại danh sách đợt thi</span>
                </Button>

                <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
                  <ChevronRightIcon className="size-3.5" />
                  <span>Đang xem các ca thi của đợt</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <h2 className="text-lg font-bold text-foreground">
                  {selectedPeriod.period_name}
                </h2>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedPeriod.period_code}
                </Badge>
                {(() => {
                  const b = getPeriodStatusBadge(selectedPeriod.effective_status || selectedPeriod.status);
                  return (
                    <Badge className={`text-xs px-2.5 py-0.5 ${b.className}`}>
                      {b.label}
                    </Badge>
                  );
                })()}
                {selectedPeriod.discrepancy_count > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangleIcon className="size-3" />
                    <span>{selectedPeriod.discrepancy_count} ca lệch</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDaysIcon className="size-3.5" />
                  <span>Ngày thi: {formatDateOnly(selectedPeriod.start_date)} – {formatDateOnly(selectedPeriod.end_date)}</span>
                </span>
                {selectedPeriod.registration_deadline && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-3.5" />
                    <span>Hạn chót: {formatDateTime(selectedPeriod.registration_deadline, false)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Thống kê tổng hợp & Nút xuất báo cáo đợt */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {selectedPeriod.total_confirmed} / {selectedPeriod.total_capacity} đã đặt (
                  {selectedPeriod.total_capacity > 0
                    ? Math.round((selectedPeriod.total_confirmed / selectedPeriod.total_capacity) * 100)
                    : 0}
                  %)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tổng {selectedPeriod.slots.length} ca thi cấu hình
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 gap-1.5"
                onClick={() => {
                  setExportTargetPeriod(selectedPeriod);
                  setExportTargetSession(null);
                  setExportOpen(true);
                }}
              >
                <DownloadIcon className="size-4" />
                <span>Xuất báo cáo đợt</span>
              </Button>
            </div>
          </div>

          {/* Lưới các ca thi trong đợt */}
          {selectedPeriod.slots.length === 0 ? (
            <Card className="py-12 text-center text-muted-foreground text-xs">
              Chưa có ca thi nào được gán vào đợt thi này.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedPeriod.slots.map((slot) => {
                const slotFill = Math.round(slot.fill_rate_percent);
                const isFull = slotFill >= 100;

                return (
                  <Card
                    key={slot.session_id}
                    className="p-4 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Tiêu đề ca & Phòng */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="font-semibold text-xs bg-primary/10 text-primary border-primary/20"
                        >
                          {slot.exam_type_name}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {slot.shift === "morning"
                            ? "Ca sáng (08:30)"
                            : slot.shift === "afternoon"
                            ? "Ca chiều (13:30)"
                            : "Ca tối"}{" "}
                          • {slot.room_name}
                        </span>
                      </div>

                      {/* Thông tin ngày thi & lệ phí */}
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Ngày thi:</span>
                        <span className="font-semibold text-foreground">{formatDateOnly(slot.exam_date)}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Lệ phí thi:</span>
                        <span className="font-bold text-foreground">{formatCurrency(slot.fee)}</span>
                      </div>

                      {/* Tiến độ lấp đầy chỗ (Full 100% hiển thị đỏ nổi bật) */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Đã nhận: <strong>{slot.confirmed_count}</strong> / {slot.capacity} chỗ
                          </span>
                          <span
                            className={`font-bold ${
                              isFull
                                ? "text-rose-600 dark:text-rose-400"
                                : slotFill >= 80
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-primary"
                            }`}
                          >
                            {isFull ? "ĐẦY 100%" : `${slotFill}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isFull
                                ? "bg-rose-500"
                                : slotFill >= 80
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(slotFill, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Cảnh báo ca thi nếu có */}
                      {slot.alerts.length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          {slot.alerts.map((a, i) => (
                            <div
                              key={i}
                              className={`text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                                a.severity === "critical" || a.type === "nearly_full"
                                  ? "bg-destructive/10 text-destructive font-medium"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
                              }`}
                            >
                              <AlertTriangleIcon className="size-3 shrink-0" />
                              <span className="truncate">{a.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Chỉ số nhanh */}
                      <div className="mt-3 pt-2.5 border-t grid grid-cols-3 gap-1 text-[11px] text-center text-muted-foreground">
                        <div title="Số thí sinh đủ điều kiện">
                          Đủ đk: <strong className="text-emerald-600 dark:text-emerald-400">{slot.eligible_count}</strong>
                        </div>
                        <div title="Số thí sinh đăng ký nhiều ca">
                          Nhiều ca: <strong className="text-foreground">{slot.multi_slot_count}</strong>
                        </div>
                        <div title="Hàng đợi danh sách chờ">
                          Waitlist: <strong className="text-foreground">{slot.waitlist_count}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Các nút hành động ca */}
                    <div className="pt-2 flex items-center justify-between gap-1.5 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full cursor-pointer hover:bg-muted text-xs h-7 px-2.5 gap-1"
                        onClick={() => {
                          setWaitlistSession(slot);
                          setWaitlistOpen(true);
                        }}
                      >
                        <UsersIcon className="size-3" />
                        <span>Hàng đợi ({slot.waitlist_count})</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="rounded-full cursor-pointer hover:bg-muted size-7"
                          title="Xuất báo cáo ca này"
                          onClick={() => {
                            setExportTargetPeriod(selectedPeriod);
                            setExportTargetSession(slot);
                            setExportOpen(true);
                          }}
                        >
                          <DownloadIcon className="size-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          className="rounded-full cursor-pointer hover:bg-primary/90 text-xs h-7 px-3 gap-1"
                          onClick={() => {
                            setSelectedSession(slot);
                          }}
                        >
                          <EyeIcon className="size-3.5" />
                          <span>Xem thí sinh</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
         CẤP 3: CHI TIẾT DANH SÁCH THÍ SINH CỦA MỘT CA THI (CANDIDATES VIEW)
         (Hiển thị khi đã chọn ca thi: selectedPeriod && selectedSession)
         ══════════════════════════════════════════════════════════════════════════ */}
      {selectedPeriod && selectedSession && (
        <div className="space-y-4">
          {/* Nút quay lại cấp 2 & Header Ca thi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/20 border rounded-xl">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 gap-1.5"
                onClick={() => setSelectedSession(null)}
              >
                <ArrowLeftIcon className="size-4" />
                <span>Quay lại các ca thi của đợt</span>
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {selectedSession.exam_type_name}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {selectedSession.room_name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {selectedSession.shift === "morning"
                      ? "Ca Sáng (08:30 - 11:30)"
                      : selectedSession.shift === "afternoon"
                      ? "Ca Chiều (13:30 - 16:30)"
                      : "Ca Tối"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ngày thi: <strong>{formatDateOnly(selectedSession.exam_date)}</strong> • Đợt thi:{" "}
                  <strong>{selectedPeriod.period_name}</strong> • Lệ phí:{" "}
                  <strong>{formatCurrency(selectedSession.fee)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-8 gap-1.5"
                onClick={() => {
                  setWaitlistSession(selectedSession);
                  setWaitlistOpen(true);
                }}
              >
                <UsersIcon className="size-3.5" />
                <span>Danh sách chờ ({selectedSession.waitlist_count})</span>
              </Button>

              <Button
                size="sm"
                className="rounded-full cursor-pointer hover:bg-primary/90 text-xs h-8 gap-1.5"
                onClick={() => {
                  setExportTargetPeriod(selectedPeriod);
                  setExportTargetSession(selectedSession);
                  setExportOpen(true);
                }}
              >
                <DownloadIcon className="size-3.5" />
                <span>Xuất báo cáo</span>
              </Button>
            </div>
          </div>

          {/* Bộ lọc thí sinh */}
          <div className="p-3 bg-muted/30 border rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
              {/* Tìm kiếm */}
              <div className="relative sm:col-span-2">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm họ tên, số CCCD, SĐT, email, số ghế..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="pl-8.5 h-9 text-xs w-full bg-background"
                />
              </div>

              {/* Điều kiện dự thi */}
              <Select value={candidateEligibility} onValueChange={(val) => setCandidateEligibility(val ?? "all")}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Điều kiện dự thi">
                    {(val) => {
                      switch (val) {
                        case "all":
                          return "Tất cả điều kiện";
                        case "eligible":
                          return "Đủ điều kiện";
                        case "pending_review":
                          return "Chờ duyệt / Chờ TT";
                        case "ineligible":
                          return "Không đủ điều kiện";
                        default:
                          return val ?? "Điều kiện dự thi";
                      }
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả điều kiện</SelectItem>
                  <SelectItem value="eligible">Đủ điều kiện (Đã duyệt & Đã TT)</SelectItem>
                  <SelectItem value="pending_review">Chờ duyệt hồ sơ / Chờ TT</SelectItem>
                  <SelectItem value="ineligible">Không đủ điều kiện</SelectItem>
                </SelectContent>
              </Select>

              {/* Trạng thái đăng ký */}
              <Select value={candidateRegStatus} onValueChange={(val) => setCandidateRegStatus(val ?? "all")}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Trạng thái đăng ký">
                    {(val) => {
                      switch (val) {
                        case "all":
                          return "Tất cả trạng thái";
                        case "confirmed":
                          return "Đã nộp học phí";
                        case "pending_payment":
                          return "Chờ thanh toán";
                        case "cancelled":
                          return "Đã hủy";
                        default:
                          return val ?? "Trạng thái đăng ký";
                      }
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="confirmed">Đã thanh toán (confirmed)</SelectItem>
                  <SelectItem value="pending_payment">Chờ thanh toán (pending)</SelectItem>
                  <SelectItem value="cancelled">Đã hủy (cancelled)</SelectItem>
                </SelectContent>
              </Select>

              {/* Quy mô ca thi */}
              <Select value={candidateSlotScope} onValueChange={(val) => setCandidateSlotScope(val ?? "all")}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Số ca đăng ký">
                    {(val) => {
                      switch (val) {
                        case "all":
                          return "Tất cả quy mô";
                        case "single":
                          return "Chỉ thi 1 ca";
                        case "multiple":
                          return "Đăng ký nhiều ca";
                        default:
                          return val ?? "Số ca đăng ký";
                      }
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả quy mô</SelectItem>
                  <SelectItem value="single">Chỉ thi 1 ca duy nhất</SelectItem>
                  <SelectItem value="multiple">Đăng ký nhiều ca</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Tìm thấy <strong>{candidateTotalItems}</strong> thí sinh đăng ký trong ca này
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-7 px-2.5 gap-1"
                onClick={() => {
                  setCandidateSearch("");
                  setCandidateEligibility("all");
                  setCandidateRegStatus("all");
                  setCandidateVerifStatus("all");
                  setCandidateSlotScope("all");
                }}
              >
                <FilterIcon className="size-3" />
                <span>Đặt lại bộ lọc</span>
              </Button>
            </div>
          </div>

          {/* Bảng dữ liệu thí sinh (Căn lề cột tường minh, Action menu chống clipping) */}
          <div className="rounded-xl border overflow-hidden bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs">
                  <TableHead className="w-[70px] min-w-[65px] font-semibold text-center">Số Ghế</TableHead>
                  <TableHead className="min-w-[200px] max-w-[240px] font-semibold">Thí sinh</TableHead>
                  <TableHead className="w-[170px] min-w-[160px] font-semibold">Giấy tờ tùy thân (Che PII)</TableHead>
                  <TableHead className="w-[170px] min-w-[160px] font-semibold">Thời điểm ĐK & Điểm danh</TableHead>
                  <TableHead className="w-[110px] min-w-[100px] font-semibold text-center">Quy mô Ca</TableHead>
                  <TableHead className="w-[180px] min-w-[170px] font-semibold">Điều kiện Dự thi</TableHead>
                  <TableHead className="w-[140px] min-w-[130px] font-semibold">Thanh toán</TableHead>
                  <TableHead className="w-[70px] min-w-[65px] text-center font-semibold">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCandidatesLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2Icon className="size-6 animate-spin text-primary" />
                        <span>Đang tải danh sách thí sinh...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-muted-foreground text-xs">
                      Không tìm thấy thí sinh nào khớp với bộ lọc tìm kiếm.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((c) => {
                    const isEligible = c.eligibility_status === "eligible";
                    const isIneligible = c.eligibility_status === "ineligible";

                    return (
                      <TableRow key={c.registration_id} className="text-xs hover:bg-muted/30">
                        {/* Số ghế */}
                        <TableCell className="w-[70px] min-w-[65px] text-center font-bold">
                          <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                            #{c.seat_number}
                          </Badge>
                        </TableCell>

                        {/* Thông tin thí sinh */}
                        <TableCell className="min-w-[200px] max-w-[240px]">
                          <div className="font-semibold text-foreground truncate" title={c.full_name}>
                            {c.full_name}
                            {c.full_name_cn && (
                              <span className="ml-1 text-muted-foreground font-normal">
                                ({c.full_name_cn})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDateOnly(c.dob)} • {c.gender === "male" ? "Nam" : c.gender === "female" ? "Nữ" : "Khác"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate" title={c.email}>
                            {c.email}
                          </div>
                        </TableCell>

                        {/* Giấy tờ tùy thân bảo mật PII */}
                        <TableCell className="w-[170px] min-w-[160px]">
                          <div className="font-mono text-xs font-medium">
                            {c.doc_type ? c.doc_type.toUpperCase() : "CCCD"}: {c.masked_doc_number || "—"}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            SĐT: {c.masked_phone || "—"}
                          </div>
                          <div className="mt-1">
                            <Badge
                              variant={
                                c.verification_status === "verified"
                                  ? "default"
                                  : c.verification_status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={`text-[10px] px-1.5 py-0 ${
                                c.verification_status === "verified"
                                  ? "bg-emerald-600 text-white"
                                  : c.verification_status === "rejected"
                                  ? "bg-rose-600 text-white"
                                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {c.verification_status === "verified"
                                ? "Đã duyệt ảnh"
                                : c.verification_status === "rejected"
                                ? "Bị từ chối ảnh"
                                : "Chờ kiểm định"}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Ngày ĐK & Điểm danh */}
                        <TableCell className="w-[170px] min-w-[160px]">
                          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                            <ClockIcon className="size-3" />
                            <span>{formatDateTime(c.registered_at)}</span>
                          </div>
                          <div className="mt-1">
                            {c.is_attended ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Đã có mặt
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Chưa điểm danh</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Quy mô ca */}
                        <TableCell className="w-[110px] min-w-[100px] text-center">
                          {c.is_multi_slot ? (
                            <Badge variant="outline" className="text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                              Thi {c.registered_slot_count} ca
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                              1 ca duy nhất
                            </Badge>
                          )}
                        </TableCell>

                        {/* Điều kiện dự thi */}
                        <TableCell className="w-[180px] min-w-[170px]">
                          <div>
                            <Badge
                              className={`text-[11px] ${
                                isEligible
                                  ? "bg-emerald-600 text-white font-medium"
                                  : isIneligible
                                  ? "bg-rose-600 text-white font-medium"
                                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium"
                              }`}
                            >
                              {isEligible
                                ? "Đủ điều kiện"
                                : isIneligible
                                ? "Không đủ điều kiện"
                                : "Chờ duyệt hồ sơ / phí"}
                            </Badge>
                          </div>
                          {c.eligibility_reasons && c.eligibility_reasons.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                              {c.eligibility_reasons.join(", ")}
                            </p>
                          )}
                        </TableCell>

                        {/* Thanh toán */}
                        <TableCell className="w-[140px] min-w-[130px]">
                          <div className="font-semibold text-xs text-foreground">
                            {c.payment_amount ? formatCurrency(c.payment_amount) : formatCurrency(selectedSession.fee)}
                          </div>
                          <Badge
                            className={`text-[10px] mt-0.5 ${
                              c.payment_status === "success" || c.registration_status === "confirmed"
                                ? "bg-emerald-600 text-white font-medium"
                                : c.payment_status === "pending_refund"
                                ? "bg-rose-600 text-white font-medium"
                                : c.payment_status === "refunded"
                                ? "bg-slate-500 text-white font-medium"
                                : c.registration_status === "cancelled"
                                ? "bg-rose-600 text-white font-medium"
                                : "bg-amber-600 text-white font-medium"
                            }`}
                          >
                            {c.payment_status === "success" || c.registration_status === "confirmed"
                              ? "Đã nộp học phí"
                              : c.payment_status === "pending_refund"
                              ? "Chờ hoàn tiền"
                              : c.payment_status === "refunded"
                              ? "Đã hoàn tiền"
                              : c.registration_status === "cancelled"
                              ? "Đã hủy"
                              : "Chờ thanh toán"}
                          </Badge>
                        </TableCell>

                        {/* Thao tác (Portal Dropdown chống clipping) */}
                        <TableCell className="w-[70px] min-w-[65px] text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full cursor-pointer hover:bg-muted size-7"
                                  aria-label="Thao tác thí sinh"
                                />
                              }
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              sideOffset={4}
                              className="w-56 min-w-[210px] p-1.5 shadow-lg border bg-popover z-50"
                            >
                              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground select-none">
                                Thao tác thí sinh
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 px-2 py-1.5 whitespace-nowrap"
                                onClick={() => {
                                  setReviewCandidateId(c.candidate_id);
                                  setReviewModalOpen(true);
                                }}
                              >
                                <ShieldCheckIcon className="size-4 text-primary shrink-0" />
                                <span>Xem & Duyệt hồ sơ gốc</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="cursor-pointer gap-2 px-2 py-1.5 whitespace-nowrap"
                                onClick={() => {
                                  setTransferTargetCandidate(c);
                                  setTransferDialogOpen(true);
                                }}
                              >
                                <ArrowRightLeftIcon className="size-4 text-primary shrink-0" />
                                <span>Chuyển ca thi</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="my-1" />

                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive gap-2 px-2 py-1.5 whitespace-nowrap"
                                onClick={() => {
                                  setCancelTargetCandidate(c);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <UserXIcon className="size-4 shrink-0" />
                                <span>Hủy phiếu đăng ký</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Phân trang danh sách thí sinh thường trực (Luôn hiển thị chân trang) */}
            <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Hiển thị <strong>{candidateStartItem} - {candidateEndItem}</strong> trên tổng số <strong>{candidateTotalItems}</strong> thí sinh
              </span>

              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className="rounded-full cursor-pointer text-xs h-8"
                      onClick={() => candidatePage > 1 && loadCandidates(selectedSession.session_id, candidatePage - 1)}
                      disabled={candidatePage <= 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: candidateTotalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationButton
                        className="size-8 rounded-full cursor-pointer text-xs"
                        isActive={p === candidatePage}
                        onClick={() => p !== candidatePage && loadCandidates(selectedSession.session_id, p)}
                      >
                        {p}
                      </PaginationButton>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      className="rounded-full cursor-pointer text-xs h-8"
                      onClick={() =>
                        candidatePage < candidateTotalPages &&
                        loadCandidates(selectedSession.session_id, candidatePage + 1)
                      }
                      disabled={candidatePage >= candidateTotalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog Xuất file PDF / Excel CSV ──────────────────────────────────── */}
      <ExportRegistrationsDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        period={exportTargetPeriod}
        session={exportTargetSession}
      />

      {/* ── Dialog Đối soát Lệch ghế ─────────────────────────────────────────── */}
      <DiscrepancyCheckDialog
        open={discrepanciesOpen}
        onOpenChange={setDiscrepanciesOpen}
        discrepancies={discrepanciesList}
        onRefresh={refreshDiscrepancies}
        isRefreshing={isRefreshingDiscrepancies}
      />

      {/* ── Dialog Xem Hàng đợi Danh sách Chờ ─────────────────────────────────── */}
      <SlotWaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        session={waitlistSession}
        onSelectCandidate={(candId) => {
          setWaitlistOpen(false);
          setReviewCandidateId(candId);
          setReviewModalOpen(true);
        }}
      />

      {/* ── Modal Xem & Duyệt Hồ sơ có Soft-lock 5 phút ───────────────────────── */}
      <CandidateQuickReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        candidateId={reviewCandidateId}
        onActionComplete={() => {
          if (selectedSession) {
            loadCandidates(selectedSession.session_id, candidatePage);
          }
          revalidator.revalidate();
        }}
      />

      {/* ── AlertDialog Xác nhận Hủy Đăng ký ─────────────────────────────────── */}
      <AdminCancelRegistrationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        candidateItem={cancelTargetCandidate}
        onConfirm={handleCancelRegistration}
        isSubmitting={isCancelling}
      />

      {/* ── AlertDialog Xác nhận Chuyển Ca thi ───────────────────────────────── */}
      <AdminTransferRegistrationDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        candidateItem={transferTargetCandidate}
        currentSession={selectedSession}
        availableSessions={allPeriodSessions}
        onConfirm={handleTransferRegistration}
        isSubmitting={isTransferring}
      />
    </div>
  );
}
