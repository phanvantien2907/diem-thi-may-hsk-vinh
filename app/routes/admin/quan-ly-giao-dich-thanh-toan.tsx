import * as React from "react";
import { useLoaderData, useSearchParams, useFetcher, useRevalidator } from "react-router";
import type { Route } from "./+types/quan-ly-giao-dich-thanh-toan";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import type { ApiResponse } from "~/types/exam";
import {
  CreditCardIcon,
  SearchIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  FileCheck2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  EyeIcon,
  MoreHorizontalIcon,
  CopyIcon,
  RotateCcwIcon,
  XIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  InfoIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { toast } from "~/components/ui/toast";

// ─── Constants ──────────────────────────────────────────────────────────────
const PAGE_LIMIT = 10;

// ─── Types ──────────────────────────────────────────────────────────────────
export type PaymentStatus =
  | "pending"
  | "success"
  | "cancelled"
  | "failed"
  | "expired"
  | "refunded"
  | "partial_paid"
  | "amount_mismatch";

export interface AdminPayment {
  id: number;
  exam_registration_id: number;
  candidate_name: string;
  candidate_email: string;
  exam_type_name: string;
  amount: number;
  paid_amount?: number | null;
  method: string;
  status: PaymentStatus;
  transaction_ref: string;
  gateway_trans_id?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  created_at: string;
  updated_at?: string | null;
  confirmed_at?: string | null;
}

export interface AdminPaymentMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

export interface PaymentOverviewStats {
  total: number;
  success: number;
  pending: number;
  mismatch: number;
}

type PaymentAction = { success?: boolean; message?: string; error?: string };

// ─── Helpers: Định dạng ngày giờ chuẩn BẮT BUỘC theo Project Rules (Rule 6) ─
// Chuẩn rút gọn không có giây: dd/MM/yyyy HH:mm
function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Helpers: Thông tin phương thức thanh toán có Badge ──────────────────────
function getPaymentMethodInfo(method: string | null | undefined) {
  const norm = (method || "").toLowerCase().trim();
  switch (norm) {
    case "bank_transfer":
      return {
        label: "Chuyển khoản",
        shortLabel: "Chuyển khoản",
        badgeClass:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60",
      };
    case "payos":
      return {
        label: "PayOS",
        shortLabel: "PayOS",
        badgeClass:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
      };
    case "cash":
      return {
        label: "Tiền mặt",
        shortLabel: "Tiền mặt",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
      };
    default:
      return {
        label: method ? method.toUpperCase() : "Chưa xác định",
        shortLabel: method ? method.toUpperCase() : "Khác",
        badgeClass:
          "bg-muted text-muted-foreground border-border dark:bg-muted/60",
      };
  }
}

// ─── Helpers: Thông tin trạng thái giao dịch ────────────────────────────────
function getPaymentStatusInfo(status: PaymentStatus) {
  switch (status) {
    case "success":
      return {
        label: "Thành công",
        dotClass: "bg-emerald-500",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        pulse: false,
      };
    case "pending":
      return {
        label: "Chờ thanh toán",
        dotClass: "bg-amber-500",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
        pulse: true,
      };
    case "cancelled":
      return {
        label: "Đã hủy",
        dotClass: "bg-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border dark:bg-muted/60",
        pulse: false,
      };
    case "failed":
      return {
        label: "Thất bại",
        dotClass: "bg-destructive",
        badgeClass:
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        pulse: false,
      };
    case "expired":
      return {
        label: "Hết hạn 15p",
        dotClass: "bg-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border dark:bg-muted/60",
        pulse: false,
      };
    case "refunded":
      return {
        label: "Đã hoàn tiền",
        dotClass: "bg-sky-500",
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
        pulse: false,
      };
    case "partial_paid":
      return {
        label: "Thanh toán một phần",
        dotClass: "bg-orange-500",
        badgeClass:
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60",
        pulse: false,
      };
    case "amount_mismatch":
      return {
        label: "Lệch số tiền",
        dotClass: "bg-destructive",
        badgeClass:
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        pulse: false,
      };
    default:
      return {
        label: String(status),
        dotClass: "bg-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground border-border",
        pulse: false,
      };
  }
}

// ─── Danh sách tab lọc trạng thái ───────────────────────────────────────────
const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "success", label: "Thành công" },
  { value: "pending", label: "Chờ thanh toán" },
  { value: "amount_mismatch", label: "Lệch tiền" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "failed", label: "Thất bại" },
  { value: "expired", label: "Hết hạn" },
  { value: "refunded", label: "Đã hoàn" },
];

// ─── React Router v7 Loader ─────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  const url = new URL(request.url);

  // Đọc toàn bộ query params để truyền lên API phân trang server-side
  const page = url.searchParams.get("page") ?? "1";
  const status = url.searchParams.get("status") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const orderCode = url.searchParams.get("order_code") ?? "";

  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", String(PAGE_LIMIT));
  if (status && status !== "all") params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (orderCode) params.set("order_code", orderCode);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch chính: danh sách payments theo filter và pagination hiện tại
  const mainPromise = fetch(
    `${API_BASE_URL}/api/v1/admin/payments?${params.toString()}`,
    { headers: authHeaders }
  );

  // Fetch song song: Thống kê tổng quan để các KPI card luôn render đúng số liệu
  // Fix bug: Tránh việc chuyển sang section Lệch tiền làm mất số liệu của các section khác
  const hasCustomFilter = Boolean(from || to || orderCode);
  const isAllStatus = !status || status === "all";

  const statsPromise = Promise.allSettled([
    // [0] Tổng giao dịch toàn hệ thống
    isAllStatus && !hasCustomFilter
      ? Promise.resolve(null)
      : fetch(`${API_BASE_URL}/api/v1/admin/payments?limit=1`, { headers: authHeaders }).then((r) =>
        r.ok ? r.json() : null
      ),
    // [1] Giao dịch thành công
    status === "success" && !hasCustomFilter
      ? Promise.resolve(null)
      : fetch(`${API_BASE_URL}/api/v1/admin/payments?limit=1&status=success`, {
        headers: authHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
    // [2] Giao dịch chờ thanh toán
    status === "pending" && !hasCustomFilter
      ? Promise.resolve(null)
      : fetch(`${API_BASE_URL}/api/v1/admin/payments?limit=1&status=pending`, {
        headers: authHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
    // [3] Giao dịch lệch tiền (Amount Guard)
    status === "amount_mismatch" && !hasCustomFilter
      ? Promise.resolve(null)
      : fetch(`${API_BASE_URL}/api/v1/admin/payments?limit=1&status=amount_mismatch`, {
        headers: authHeaders,
      }).then((r) => (r.ok ? r.json() : null)),
  ]);

  const [response, statsSettled] = await Promise.all([mainPromise, statsPromise]);

  if (!response.ok) {
    throw new Response("Không thể tải danh sách giao dịch từ máy chủ.", { status: 502 });
  }

  const json = (await response.json()) as ApiResponse<AdminPayment[]> & {
    meta?: AdminPaymentMeta;
  };

  const meta: AdminPaymentMeta = json.meta ?? {
    page: 1,
    per_page: PAGE_LIMIT,
    total_items: 0,
    total_pages: 1,
  };

  // Xác định số lượng cho từng KPI card
  let totalCount = meta.total_items;
  let successCount = 0;
  let pendingCount = 0;
  let mismatchCount = 0;

  if (isAllStatus && !hasCustomFilter) {
    totalCount = meta.total_items;
  } else if (statsSettled[0].status === "fulfilled" && statsSettled[0].value?.meta) {
    totalCount = statsSettled[0].value.meta.total_items ?? 0;
  }

  if (status === "success" && !hasCustomFilter) {
    successCount = meta.total_items;
  } else if (statsSettled[1].status === "fulfilled" && statsSettled[1].value?.meta) {
    successCount = statsSettled[1].value.meta.total_items ?? 0;
  }

  if (status === "pending" && !hasCustomFilter) {
    pendingCount = meta.total_items;
  } else if (statsSettled[2].status === "fulfilled" && statsSettled[2].value?.meta) {
    pendingCount = statsSettled[2].value.meta.total_items ?? 0;
  }

  if (status === "amount_mismatch" && !hasCustomFilter) {
    mismatchCount = meta.total_items;
  } else if (statsSettled[3].status === "fulfilled" && statsSettled[3].value?.meta) {
    mismatchCount = statsSettled[3].value.meta.total_items ?? 0;
  }

  return {
    user,
    token,
    apiBaseUrl: API_BASE_URL,
    payments: (json.data ?? []) as AdminPayment[],
    meta,
    stats: {
      total: totalCount,
      success: successCount,
      pending: pendingCount,
      mismatch: mismatchCount,
    } satisfies PaymentOverviewStats,
  };
}

// ─── React Router v7 Action ─────────────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAdminAuth(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const paymentId = String(formData.get("payment_id") ?? "");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Xác định endpoint theo intent
  let endpoint = "";
  if (intent === "confirm" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/confirm`;
  } else if (intent === "sync" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/sync`;
  } else if (intent === "cancel" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/cancel`;
  } else if (intent === "mark-refund" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/mark-refund`;
  } else {
    return { error: "Thao tác không hợp lệ." } satisfies PaymentAction;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
  });

  const json = (await response.json().catch(() => null)) as
    | ApiResponse<unknown>
    | { message?: string; error?: string; msg?: string }
    | null;

  if (!response.ok) {
    const errMsg =
      json
        ? ("msg" in json && typeof (json as { msg?: string }).msg === "string" && (json as { msg?: string }).msg) ||
        ("error" in json && typeof (json as { error?: string }).error === "string" && (json as { error?: string }).error)
        : null;
    return {
      error: (errMsg as string) || "Thao tác không thành công. Vui lòng thử lại sau.",
    } satisfies PaymentAction;
  }

  const msgMap: Record<string, string> = {
    confirm: "Đã xác nhận thanh toán thủ công thành công.",
    sync: "Đồng bộ trạng thái PayOS thành công.",
    cancel: "Đã hủy giao dịch thành công.",
    "mark-refund": "Đã đánh dấu hoàn tiền thành công.",
  };

  return {
    success: true,
    message: msgMap[intent] ?? "Thao tác thành công.",
  } satisfies PaymentAction;
}

// ─── Dialog: Xem chi tiết giao dịch ─────────────────────────────────────────
function PaymentDetailDialog({
  payment,
  open,
  onOpenChange,
  onConfirm,
  onSync,
  onCancel,
  onMarkRefund,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (p: AdminPayment) => void;
  onSync: (p: AdminPayment) => void;
  onCancel: (p: AdminPayment) => void;
  onMarkRefund: (p: AdminPayment) => void;
}) {
  if (!payment) return null;
  const statusInfo = getPaymentStatusInfo(payment.status);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(payment.transaction_ref);
    toast.add({
      type: "info",
      title: "Đã sao chép mã đơn hàng",
      description: `Mã ${payment.transaction_ref} đã được lưu vào bộ nhớ tạm.`,
    });
  };

  // Quyền thao tác dựa theo State Machine API
  const canConfirm = payment.status === "pending";
  const canSync = payment.status === "pending";
  const canCancel = payment.status === "pending" || payment.status === "success";
  const canMarkRefund = payment.status === "cancelled" || payment.status === "amount_mismatch" || payment.status === "partial_paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-muted-foreground/60">•</span>
            <Badge
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center gap-1.5 ${statusInfo.badgeClass}`}
            >
              <span className={`size-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.pulse ? "animate-pulse" : ""}`} />
              {statusInfo.label}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Chi tiết giao dịch
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Mã đơn PayOS:{" "}
            <span className="font-mono font-semibold text-foreground">{payment.transaction_ref}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
          {/* Thông tin thí sinh */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCardIcon className="size-3.5 text-primary" />
              Thông tin thí sinh & Kỳ thi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Thí sinh</p>
                <p className="font-semibold text-foreground mt-0.5">{payment.candidate_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium text-foreground mt-0.5 break-all">{payment.candidate_email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Kỳ thi / Cấp độ</p>
                <p className="font-semibold text-foreground mt-0.5">{payment.exam_type_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ID phiếu đăng ký</p>
                <p className="font-mono font-medium text-foreground mt-0.5">#{payment.exam_registration_id}</p>
              </div>
            </div>
          </div>

          {/* Thông tin thanh toán */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BanknoteIcon className="size-3.5 text-primary" />
              Thông tin thanh toán
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Số tiền yêu cầu</p>
                <p className="font-bold text-foreground text-sm sm:text-base mt-0.5 tabular-nums">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              {payment.paid_amount != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Số tiền thực nhận</p>
                  <p
                    className={`font-bold mt-0.5 text-sm sm:text-base tabular-nums ${payment.paid_amount !== payment.amount ? "text-destructive" : "text-foreground"
                      }`}
                  >
                    {formatCurrency(payment.paid_amount)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Phương thức thanh toán</p>
                {(() => {
                  const methodInfo = getPaymentMethodInfo(payment.method);
                  return (
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center gap-1.5 ${methodInfo.badgeClass}`}
                    >
                      <CreditCardIcon className="size-3" />
                      {methodInfo.label}
                    </Badge>
                  );
                })()}
              </div>
              {payment.bank_name && (
                <div>
                  <p className="text-muted-foreground text-xs">Ngân hàng</p>
                  <p className="font-medium text-foreground mt-0.5">{payment.bank_name}</p>
                </div>
              )}
              {payment.account_number && (
                <div>
                  <p className="text-muted-foreground text-xs">Số tài khoản</p>
                  <p className="font-mono font-medium text-foreground mt-0.5">{payment.account_number}</p>
                </div>
              )}
              {payment.gateway_trans_id && (
                <div>
                  <p className="text-muted-foreground text-xs">Mã GD ngân hàng</p>
                  <p className="font-mono font-medium text-foreground mt-0.5 break-all">{payment.gateway_trans_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Thời gian giao dịch */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ClockIcon className="size-3.5 text-primary" />
              Thời gian
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Tạo lúc</p>
                <p className="font-medium text-foreground mt-0.5">{formatDateTime(payment.created_at)}</p>
              </div>
              {payment.confirmed_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Xác nhận lúc</p>
                  <p className="font-medium text-foreground mt-0.5">{formatDateTime(payment.confirmed_at)}</p>
                </div>
              )}
              {payment.updated_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Cập nhật lúc</p>
                  <p className="font-medium text-foreground mt-0.5">{formatDateTime(payment.updated_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cảnh báo lệch tiền */}
          {payment.status === "amount_mismatch" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertTriangleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-destructive">
                <p className="font-semibold mb-0.5">Cảnh báo: Lệch số tiền (Amount Mismatch)</p>
                <p>
                  Webhook PayOS ghi nhận số tiền khác với số tiền đã tạo đơn hàng. Hệ thống Amount Guard
                  đã từ chối xác nhận giao dịch này để đảm bảo an toàn tài chính.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full cursor-pointer hover:bg-muted text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto justify-center"
            onClick={handleCopyRef}
          >
            <CopyIcon className="size-3.5 mr-1" />
            Sao chép mã đơn
          </Button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer hover:bg-muted text-xs"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {canMarkRefund && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onMarkRefund(payment);
                }}
              >
                <BanknoteIcon className="size-3.5 mr-1" />
                Đánh dấu hoàn tiền
              </Button>
            )}
            {canSync && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onSync(payment);
                }}
              >
                <RefreshCwIcon className="size-3.5 mr-1" />
                Đồng bộ PayOS
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                size="sm"
                className="rounded-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onCancel(payment);
                }}
              >
                <XCircleIcon className="size-3.5 mr-1" />
                Hủy giao dịch
              </Button>
            )}
            {canConfirm && (
              <Button
                type="button"
                size="sm"
                className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onConfirm(payment);
                }}
              >
                <CheckIcon className="size-3.5 mr-1" />
                Xác nhận thủ công
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Meta Function ──────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Giao dịch & Thanh toán" },
  {
    name: "description",
    content:
      "Đối soát thanh toán PayOS, giám sát luồng giao dịch ngân hàng và quản lý lệ phí thi HSK.",
  },
];

// ─── Main Route Component ───────────────────────────────────────────────────
export default function QuanLyGiaoDichThanhToanPage() {
  const { payments, meta: pageMeta, stats, token, apiBaseUrl } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const actionFetcher = useFetcher<PaymentAction>();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter & Search (server-side) ────────────────────────────────────────
  const statusFilter = searchParams.get("status") ?? "all";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const orderCodeQuery = searchParams.get("order_code") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [selectedPayment, setSelectedPayment] = React.useState<AdminPayment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const [paymentToConfirm, setPaymentToConfirm] = React.useState<AdminPayment | null>(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = React.useState(false);

  const [paymentToSync, setPaymentToSync] = React.useState<AdminPayment | null>(null);
  const [isSyncAlertOpen, setIsSyncAlertOpen] = React.useState(false);

  const [paymentToCancel, setPaymentToCancel] = React.useState<AdminPayment | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);

  const [paymentToMarkRefund, setPaymentToMarkRefund] = React.useState<AdminPayment | null>(null);
  const [isMarkRefundAlertOpen, setIsMarkRefundAlertOpen] = React.useState(false);

  // ── Helper cập nhật params (Project Rule 100: reset về trang 1 khi đổi lọc) ─
  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value && value !== "all") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next);
  };

  const handleResetFilters = () => setSearchParams(new URLSearchParams());

  const hasActiveFilters =
    Boolean(orderCodeQuery) ||
    statusFilter !== "all" ||
    Boolean(fromParam) ||
    Boolean(toParam);

  // ── Phản hồi action fetcher ───────────────────────────────────────────────
  React.useEffect(() => {
    if (actionFetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Thao tác thành công",
        description: actionFetcher.data.message,
      });
      revalidator.revalidate();
      setPaymentToConfirm(null);
      setIsConfirmAlertOpen(false);
      setPaymentToSync(null);
      setIsSyncAlertOpen(false);
      setPaymentToCancel(null);
      setIsCancelAlertOpen(false);
      setPaymentToMarkRefund(null);
      setIsMarkRefundAlertOpen(false);
    } else if (actionFetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể hoàn tất thao tác",
        description: actionFetcher.data.error,
      });
    }
  }, [actionFetcher.data, revalidator]);

  // ── Actions gọi API thông qua fetcher ────────────────────────────────────
  const confirmPayment = () => {
    if (!paymentToConfirm) return;
    actionFetcher.submit(
      { intent: "confirm", payment_id: String(paymentToConfirm.id) },
      { method: "post" }
    );
  };

  const syncPayment = () => {
    if (!paymentToSync) return;
    actionFetcher.submit(
      { intent: "sync", payment_id: String(paymentToSync.id) },
      { method: "post" }
    );
  };

  const cancelPayment = () => {
    if (!paymentToCancel) return;
    actionFetcher.submit(
      { intent: "cancel", payment_id: String(paymentToCancel.id) },
      { method: "post" }
    );
  };

  const markRefundPayment = () => {
    if (!paymentToMarkRefund) return;
    actionFetcher.submit(
      { intent: "mark-refund", payment_id: String(paymentToMarkRefund.id) },
      { method: "post" }
    );
  };

  // ── Phân trang server-side ────────────────────────────────────────────────
  const totalPages = pageMeta.total_pages;
  const currentPage = Math.min(pageParam, Math.max(1, totalPages));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-primary border-primary/20 bg-primary/5"
            >
              Hệ thống thi máy HSK
            </Badge>
            <span className="text-muted-foreground/60 text-xs">•</span>
            <span className="text-xs text-muted-foreground">Đại học Vinh</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Giao dịch & Thanh toán
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Báo cáo đối soát doanh thu tự động, kiểm soát Webhook PayOS và phòng chống lệch giá.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm shadow-2xs"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            <RefreshCwIcon
              className={`size-3.5 mr-1.5 ${revalidator.state === "loading" ? "animate-spin" : ""}`}
            />
            {revalidator.state === "loading" ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </Button>

          <Button
            className="rounded-full cursor-pointer hover:bg-primary/90 font-medium text-xs sm:text-sm"
            onClick={async () => {
              try {
                toast.add({
                  type: "info",
                  title: "Xuất sổ đối soát",
                  description: "Đang tải dữ liệu file CSV đối soát từ máy chủ...",
                });
                const res = await fetch(`${apiBaseUrl}/api/v1/admin/payments/export`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Xuất đối soát thất bại");
                const blob = await res.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `doi-soat-giao-dich-${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
                toast.add({
                  type: "success",
                  title: "Xuất file thành công",
                  description: "File CSV đối soát đã được tải xuống máy tính.",
                });
              } catch {
                toast.add({
                  type: "error",
                  title: "Lỗi xuất file đối soát",
                  description: "Không thể kết nối máy chủ để xuất file CSV đối soát.",
                });
              }
            }}
          >
            <FileCheck2Icon className="size-4 mr-1.5" />
            Xuất sổ đối soát
          </Button>
        </div>
      </div>

      {/* ── KPI Cards: Độc lập với bộ lọc hiện tại (Fix triệt để bug mất số liệu khi chuyển Lệch tiền) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tổng giao dịch */}
        <Card
          onClick={handleResetFilters}
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-primary/40 ${!hasActiveFilters ? "ring-1 ring-primary/30 border-primary/40 bg-primary/5" : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <CreditCardIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Tổng giao dịch</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {stats.total}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Thành công */}
        <Card
          onClick={() =>
            updateParams({ status: statusFilter === "success" ? null : "success", page: null })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-emerald-500/40 ${statusFilter === "success"
              ? "ring-1 ring-emerald-500/40 border-emerald-500/40 bg-emerald-500/5"
              : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Thành công</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {stats.success}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chờ thanh toán */}
        <Card
          onClick={() =>
            updateParams({ status: statusFilter === "pending" ? null : "pending", page: null })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-500/40 ${statusFilter === "pending"
              ? "ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5"
              : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ClockIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Chờ thanh toán</p>
              <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {stats.pending}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Amount Guard — Lệch tiền */}
        <Card
          onClick={() =>
            updateParams({
              status: statusFilter === "amount_mismatch" ? null : "amount_mismatch",
              page: null,
            })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-destructive/40 ${statusFilter === "amount_mismatch"
              ? "ring-1 ring-destructive/40 border-destructive/40 bg-destructive/5"
              : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive shrink-0">
              <ShieldCheckIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Lệch tiền (Guard)</p>
              <p
                className={`text-xl font-bold tracking-tight ${stats.mismatch > 0 ? "text-destructive" : "text-foreground"
                  }`}
              >
                {stats.mismatch > 0 ? `${stats.mismatch} giao dịch` : "0 — An toàn"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Data Card: Filters & Table ─────────────────────────────────── */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-2xs">
        <CardHeader className="gap-3.5 border-b bg-card/50 p-4 sm:p-5">
          {/* Dòng trên: Tiêu đề & Tab lọc nhanh */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Lịch sử giao dịch thanh toán
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground"
                >
                  {pageMeta.total_items} giao dịch
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Bảo vệ bằng chữ ký HMAC-SHA256 và Stored Procedure Idempotent ·{" "}
                {PAGE_LIMIT} bản ghi / trang
              </CardDescription>
            </div>

            {/* Quick tab lọc trạng thái (Bao gồm tab Lệch tiền trực quan) */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit overflow-x-auto max-w-full">
              {[
                { value: "all", label: "Tất cả" },
                { value: "success", label: "Thành công" },
                { value: "pending", label: "Chờ thanh toán" },
                { value: "amount_mismatch", label: "Lệch tiền" },
                { value: "cancelled", label: "Đã hủy" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateParams({ status: tab.value, page: null })}
                  className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${statusFilter === tab.value
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <span>{tab.label}</span>
                  {tab.value === "amount_mismatch" && stats.mismatch > 0 && (
                    <span className="size-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dòng dưới: Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50">
            {/* Tìm kiếm theo mã đơn PayOS (server-side) */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orderCodeQuery}
                onChange={(e) =>
                  updateParams({ order_code: e.target.value || null, page: null })
                }
                placeholder="Tìm mã đơn PayOS..."
                className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                aria-label="Tìm kiếm theo mã đơn PayOS"
              />
              {orderCodeQuery && (
                <button
                  type="button"
                  onClick={() => updateParams({ order_code: null, page: null })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Dropdown lọc trạng thái đầy đủ */}
              <Select
                value={statusFilter}
                onValueChange={(value) => updateParams({ status: value, page: null })}
              >
                <SelectTrigger className="h-9 w-full sm:w-44 rounded-full px-3 text-xs cursor-pointer">
                  <SelectValue placeholder="Mọi trạng thái">
                    {(val) => {
                      const current = val ?? statusFilter;
                      if (!current || current === "all") return "Mọi trạng thái";
                      return (
                        STATUS_TABS.find((t) => t.value === current)?.label ?? "Mọi trạng thái"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    {STATUS_TABS.map((tab) => (
                      <SelectItem
                        key={tab.value}
                        value={tab.value}
                        className="cursor-pointer text-xs"
                      >
                        {tab.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Lọc khoảng thời gian từ ngày — đến ngày */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={fromParam}
                  onChange={(e) => updateParams({ from: e.target.value || null, page: null })}
                  className="h-9 rounded-full px-3 text-xs w-36 cursor-pointer"
                  title="Từ ngày"
                />
                <span className="text-xs text-muted-foreground shrink-0">—</span>
                <Input
                  type="date"
                  value={toParam}
                  min={fromParam || undefined}
                  onChange={(e) => updateParams({ to: e.target.value || null, page: null })}
                  className="h-9 rounded-full px-3 text-xs w-36 cursor-pointer"
                  title="Đến ngày"
                />
              </div>

              {/* Xóa bộ lọc */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted shrink-0"
                >
                  <RotateCcwIcon className="size-3.5 mr-1" />
                  Đặt lại
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                <TableHead className="w-[80px] py-3 text-xs font-semibold text-muted-foreground pl-5">
                  ID
                </TableHead>
                <TableHead className="min-w-[200px] py-3 text-xs font-semibold text-muted-foreground">
                  Thí sinh & Kỳ thi
                </TableHead>
                <TableHead className="min-w-[160px] py-3 text-xs font-semibold text-muted-foreground">
                  Mã đơn PayOS
                </TableHead>
                <TableHead className="min-w-[120px] py-3 text-xs font-semibold text-muted-foreground text-right">
                  Số tiền
                </TableHead>
                <TableHead className="min-w-[150px] py-3 text-xs font-semibold text-muted-foreground">
                  Phương thức / Ngân hàng
                </TableHead>
                <TableHead className="min-w-[140px] py-3 text-xs font-semibold text-muted-foreground">
                  Thời gian tạo
                </TableHead>
                <TableHead className="min-w-[150px] py-3 text-xs font-semibold text-muted-foreground">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[90px] py-3 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const statusInfo = getPaymentStatusInfo(payment.status);
                const methodInfo = getPaymentMethodInfo(payment.method);
                const canConfirm = payment.status === "pending";
                const canSync = payment.status === "pending";
                const canCancel =
                  payment.status === "pending" || payment.status === "success";
                const canMarkRefund =
                  payment.status !== "refunded" && payment.status !== "pending";

                return (
                  <TableRow key={payment.id} className="hover:bg-muted/40 transition-colors">
                    {/* ID */}
                    <TableCell className="pl-5 font-mono text-xs font-medium text-muted-foreground">
                      #{payment.id}
                    </TableCell>

                    {/* Thí sinh & Kỳ thi */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-xs sm:text-sm">
                          {payment.candidate_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {payment.exam_type_name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Mã đơn PayOS */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {payment.transaction_ref}
                        </span>
                        {payment.gateway_trans_id && (
                          <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                            GD: {payment.gateway_trans_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Số tiền */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-bold text-xs sm:text-sm tabular-nums text-foreground font-mono">
                          {formatCurrency(payment.amount)}
                        </span>
                        {payment.paid_amount != null &&
                          payment.paid_amount !== payment.amount && (
                            <span className="text-[10px] tabular-nums text-destructive font-mono">
                              Nhận: {formatCurrency(payment.paid_amount)}
                            </span>
                          )}
                      </div>
                    </TableCell>

                    {/* Phương thức / Ngân hàng */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-2 py-0 text-[10px] font-medium border inline-flex items-center gap-1 ${methodInfo.badgeClass}`}
                        >
                          {methodInfo.shortLabel}
                        </Badge>
                        {payment.bank_name && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {payment.bank_name}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Thời gian tạo: Chuẩn Rule 6 dd/MM/yyyy HH:mm không có giây */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDateTime(payment.created_at)}
                    </TableCell>

                    {/* Trạng thái */}
                    <TableCell>
                      <Badge
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.pulse ? "animate-pulse" : ""
                            }`}
                        />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>

                    {/* Thao tác */}
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Xem chi tiết giao dịch"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsDetailOpen(true);
                          }}
                        >
                          <EyeIcon className="size-3.5" />
                          <span className="sr-only">Xem chi tiết</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                aria-label={`Thao tác giao dịch #${payment.id}`}
                              />
                            }
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Giao dịch #{payment.id}
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <EyeIcon className="size-3.5 mr-2" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  navigator.clipboard
                                    ?.writeText(payment.transaction_ref)
                                    .then(() =>
                                      toast.add({
                                        type: "info",
                                        title: "Đã sao chép mã đơn hàng",
                                      })
                                    )
                                }
                              >
                                <CopyIcon className="size-3.5 mr-2" />
                                Sao chép mã đơn
                              </DropdownMenuItem>
                            </DropdownMenuGroup>

                            {/* Hành động quản trị theo State Machine */}
                            {(canConfirm || canSync || canMarkRefund) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                  Quản trị
                                </DropdownMenuLabel>
                                {canConfirm && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      setPaymentToConfirm(payment);
                                      setIsConfirmAlertOpen(true);
                                    }}
                                  >
                                    <CheckIcon className="size-3.5 mr-2 text-emerald-600" />
                                    Xác nhận thủ công
                                  </DropdownMenuItem>
                                )}
                                {canSync && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      setPaymentToSync(payment);
                                      setIsSyncAlertOpen(true);
                                    }}
                                  >
                                    <RefreshCwIcon className="size-3.5 mr-2 text-sky-600" />
                                    Đồng bộ PayOS
                                  </DropdownMenuItem>
                                )}
                                {canMarkRefund && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      setPaymentToMarkRefund(payment);
                                      setIsMarkRefundAlertOpen(true);
                                    }}
                                  >
                                    <BanknoteIcon className="size-3.5 mr-2 text-sky-600" />
                                    Đánh dấu hoàn tiền
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {canCancel && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer text-xs text-destructive"
                                  onClick={() => {
                                    setPaymentToCancel(payment);
                                    setIsCancelAlertOpen(true);
                                  }}
                                >
                                  <XCircleIcon className="size-3.5 mr-2" />
                                  Hủy giao dịch
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Empty state */}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center gap-2">
                      <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-1">
                        <CreditCardIcon className="size-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        Không tìm thấy giao dịch
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Không có giao dịch nào khớp với tiêu chí tìm kiếm hoặc bộ lọc đã chọn.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="rounded-full cursor-pointer mt-2 hover:bg-muted text-xs"
                        >
                          <RotateCcwIcon className="size-3.5 mr-1.5" />
                          Xóa bộ lọc tìm kiếm
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination server-side (Tuân thủ Project Rules 99-101) ──────────── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t bg-card/30 p-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {pageMeta.total_items > 0 ? (
              <>
                Hiển thị{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * PAGE_LIMIT + 1}
                </span>
                {" "}–{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * PAGE_LIMIT, pageMeta.total_items)}
                </span>
                {" "}trên tổng số{" "}
                <span className="font-semibold text-foreground">{pageMeta.total_items}</span>{" "}
                giao dịch
              </>
            ) : (
              "Không có dữ liệu hiển thị"
            )}
          </p>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={currentPage <= 1}
                    onClick={() => updateParams({ page: String(currentPage - 1) })}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => {
                  const isFirst = item === 1;
                  const isLast = item === totalPages;
                  const isNearCurrent = Math.abs(item - currentPage) <= 1;

                  if (!isFirst && !isLast && !isNearCurrent) {
                    if (item === 2 && currentPage > 3) {
                      return (
                        <PaginationItem key="ellipsis-start">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    if (item === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <PaginationItem key="ellipsis-end">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  }

                  return (
                    <PaginationItem key={item}>
                      <PaginationButton
                        isActive={item === currentPage}
                        onClick={() => updateParams({ page: String(item) })}
                      >
                        {item}
                      </PaginationButton>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    disabled={currentPage >= totalPages}
                    onClick={() => updateParams({ page: String(currentPage + 1) })}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </Card>

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 px-1">
        <InfoIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span>
          Toàn bộ giao dịch được bảo vệ bằng chữ ký HMAC-SHA256, Idempotent Stored Procedure và
          Amount Guard. Nhấn "Làm mới dữ liệu" để cập nhật trạng thái mới nhất từ máy chủ.
        </span>
      </div>

      {/* ── Dialog: Xem Chi Tiết Giao Dịch ────────────────────────────────── */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onConfirm={(p) => {
          setPaymentToConfirm(p);
          setIsConfirmAlertOpen(true);
        }}
        onSync={(p) => {
          setPaymentToSync(p);
          setIsSyncAlertOpen(true);
        }}
        onCancel={(p) => {
          setPaymentToCancel(p);
          setIsCancelAlertOpen(true);
        }}
        onMarkRefund={(p) => {
          setPaymentToMarkRefund(p);
          setIsMarkRefundAlertOpen(true);
        }}
      />

      {/* ── AlertDialog: Xác Nhận Thanh Toán Thủ Công ─────────────────────── */}
      <AlertDialog
        open={isConfirmAlertOpen}
        onOpenChange={(open) => {
          setIsConfirmAlertOpen(open);
          if (!open) setPaymentToConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <CheckCircle2Icon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận thanh toán thủ công giao dịch #{paymentToConfirm?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn xác nhận thủ công giao dịch{" "}
              <span className="font-semibold text-foreground font-mono">
                #{paymentToConfirm?.id}
              </span>{" "}
              ({paymentToConfirm?.candidate_name} · {formatCurrency(paymentToConfirm?.amount)})?{" "}
              Thao tác sẽ chuyển trạng thái{" "}
              <strong>Chờ thanh toán → Thành công</strong> và tự động xác nhận phiếu đăng ký +
              đặt ghế thi. Hành động được ghi vào nhật ký kiểm toán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={confirmPayment}
            >
              Xác nhận thanh toán
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Đồng Bộ PayOS ────────────────────────────────────── */}
      <AlertDialog
        open={isSyncAlertOpen}
        onOpenChange={(open) => {
          setIsSyncAlertOpen(open);
          if (!open) setPaymentToSync(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <RefreshCwIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Đồng bộ trạng thái PayOS giao dịch #{paymentToSync?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Hệ thống sẽ gọi trực tiếp PayOS API để kiểm tra trạng thái giao dịch{" "}
              <span className="font-semibold text-foreground font-mono">
                #{paymentToSync?.id}
              </span>{" "}
              ({paymentToSync?.transaction_ref}). Nếu PayOS báo <strong>PAID</strong> và số tiền
              khớp, hệ thống tự động xác nhận và đặt ghế. Nếu chưa thanh toán hoặc số tiền lệch,
              trạng thái giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={syncPayment}
            >
              Đồng bộ ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Hủy Giao Dịch ───────────────────── */}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận hủy giao dịch #{paymentToCancel?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Giao dịch đang ở trạng thái{" "}
              <span className="font-semibold text-foreground">
                {paymentToCancel ? getPaymentStatusInfo(paymentToCancel.status).label : ""}
              </span>
              {paymentToCancel?.status === "pending" && " → sẽ chuyển thành Đã hủy."}
              {paymentToCancel?.status === "success" &&
                " → sẽ chuyển thành Đã hoàn tiền (refunded). Admin cần hoàn tiền thủ công qua ngân hàng."}
              <br />
              <br />
              <span className="text-destructive font-medium">Lưu ý:</span> Không thể hủy giao dịch đối với các kỳ thi đã qua hoặc đang diễn ra trong ngày hôm nay. Hành động này không thể hoàn tác và được ghi vào nhật ký kiểm toán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-medium"
              onClick={cancelPayment}
            >
              Xác nhận hủy giao dịch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Đánh Dấu Hoàn Tiền ─────────────────────────────── */}
      <AlertDialog
        open={isMarkRefundAlertOpen}
        onOpenChange={(open) => {
          setIsMarkRefundAlertOpen(open);
          if (!open) setPaymentToMarkRefund(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <BanknoteIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận đánh dấu hoàn tiền giao dịch #{paymentToMarkRefund?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Bạn đang yêu cầu chuyển giao dịch{" "}
              <span className="font-semibold text-foreground font-mono">
                #{paymentToMarkRefund?.id}
              </span>{" "}
              (Mã đơn:{" "}
              <span className="font-semibold text-foreground font-mono">
                {paymentToMarkRefund?.transaction_ref}
              </span>
              ) của thí sinh{" "}
              <span className="font-semibold text-foreground">
                {paymentToMarkRefund?.candidate_name}
              </span>{" "}
              với số tiền{" "}
              <span className="font-semibold text-foreground font-mono">
                {formatCurrency(paymentToMarkRefund?.paid_amount ?? paymentToMarkRefund?.amount)}
              </span>{" "}
              sang trạng thái <strong>Đã hoàn tiền (refunded)</strong>. Thao tác này dành cho các giao dịch bị lệch tiền, thanh toán một phần hoặc đã bị hủy.
              Kế toán viên sẽ căn cứ vào trạng thái này để tiến hành chuyển khoản hoàn trả thủ công qua ngân hàng. Hành động này được ghi nhận vào nhật ký kiểm toán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={markRefundPayment}
            >
              Đánh dấu hoàn tiền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
