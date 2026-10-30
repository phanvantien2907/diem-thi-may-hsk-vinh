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
  UploadCloudIcon,
  ImageIcon,
  Trash2Icon,
  ExternalLinkIcon,
  CalendarCheckIcon,
  ArrowUpRightIcon,
  ScaleIcon,
  Loader2Icon,
} from "lucide-react";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { validateImageFile, uploadToCloudinary } from "~/lib/cloudinary";
import { useDebouncedCallback, useThrottledCallback } from "~/hooks/use-debounce";
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
  | "pending_refund"
  | "overpaid"
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
  amount_received?: number | null;
  method: string;
  status: PaymentStatus;
  transaction_ref: string;
  gateway_trans_id?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  created_at: string;
  updated_at?: string | null;
  confirmed_at?: string | null;
  paid_at?: string | null;
  // --- Refund fields ---
  refund_amount?: number | null;
  refund_reason?: string | null;
  refund_bank_ref?: string | null;
  refunded_at?: string | null;
  refund_evidence_urls?: string[] | null;
  // --- Admin operation fields ---
  evidence_urls?: string[] | null;
  admin_note?: string | null;
  // --- Top-up / overpayment ---
  is_top_up?: boolean;
  parent_payment_id?: number | null;
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
    case "pending_refund":
      return {
        label: "Chờ hoàn tiền (B2)",
        dotClass: "bg-amber-500",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
        pulse: true,
      };
    case "overpaid":
      return {
        label: "Nộp thừa tiền",
        dotClass: "bg-purple-500",
        badgeClass:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
        pulse: true,
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

  let endpoint = "";
  let body: string | null = null;

  if (intent === "confirm" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/confirm`;
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    const note = String(formData.get("note") ?? "");
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh biên lai / chứng từ sao kê ngân hàng." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      evidence_urls: [evidenceUrl],
      note: note || "Admin xác nhận thanh toán thủ công",
    });
  } else if (intent === "sync" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/sync`;
    body = null;
  } else if (intent === "cancel" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/cancel`;
    const reason = String(formData.get("reason") ?? "");
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    if (!reason || reason.trim().length < 3) {
      return { error: "Vui lòng nhập lý do hủy giao dịch (tối thiểu 3 ký tự)." } satisfies PaymentAction;
    }
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh biên bản / chứng từ hủy giao dịch." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      reason: reason.trim(),
      evidence_urls: [evidenceUrl],
    });
  } else if (intent === "mark-refund" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/mark-refund`;
    const reason = String(formData.get("reason") ?? "");
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    if (!reason || reason.trim().length < 3) {
      return { error: "Vui lòng nhập lý do yêu cầu hoàn tiền (tối thiểu 3 ký tự)." } satisfies PaymentAction;
    }
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh chứng từ / đơn đề nghị hoàn tiền." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      reason: reason.trim(),
      evidence_urls: [evidenceUrl],
    });
  } else if (intent === "confirm-refund" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/confirm-refund`;
    const bankRef = String(formData.get("bank_ref") ?? "");
    const note = String(formData.get("note") ?? "");
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    if (!bankRef || bankRef.trim().length < 2) {
      return { error: "Vui lòng nhập mã giao dịch ngân hàng (bank_ref)." } satisfies PaymentAction;
    }
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh ủy nhiệm chi / biên lai chuyển khoản hoàn tiền." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      bank_ref: bankRef.trim(),
      note: note.trim() || "Admin xác nhận đã hoàn tiền cho thí sinh",
      evidence_urls: [evidenceUrl],
    });
  } else if (intent === "top-up" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/top-up`;
    const additionalAmount = Number(formData.get("additional_amount") ?? 0);
    const extendHours = Number(formData.get("extend_hours") ?? 24);
    const note = String(formData.get("note") ?? "");
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh chứng từ đối chiếu nộp bổ sung." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      additional_amount: additionalAmount > 0 ? additionalAmount : undefined,
      extend_hours: extendHours > 0 ? extendHours : 24,
      note: note.trim() || "Tạo link nộp tiền bổ sung",
      evidence_urls: [evidenceUrl],
    });
  } else if (intent === "resolve-overpayment" && paymentId) {
    endpoint = `/api/v1/admin/payments/${paymentId}/resolve-overpayment`;
    const refundAmount = Number(formData.get("refund_amount") ?? 0);
    const note = String(formData.get("note") ?? "");
    const evidenceUrl = String(formData.get("evidence_url") ?? "");
    if (!note || note.trim().length < 3) {
      return { error: "Vui lòng nhập ghi chú xử lý nộp thừa tiền." } satisfies PaymentAction;
    }
    if (!evidenceUrl) {
      return { error: "Vui lòng tải lên ảnh chứng từ sao kê nộp thừa tiền." } satisfies PaymentAction;
    }
    body = JSON.stringify({
      refund_amount: refundAmount > 0 ? refundAmount : undefined,
      note: note.trim(),
      evidence_urls: [evidenceUrl],
    });
  } else {
    return { error: "Thao tác không hợp lệ." } satisfies PaymentAction;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    ...(body ? { body } : {}),
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
    "mark-refund": "Đã đánh dấu hoàn tiền thành công (Bước 1: Chờ hoàn tiền).",
    "confirm-refund": "Đã xác nhận hoàn tiền thành công (Bước 2: Hoàn tất).",
    "top-up": "Đã tạo link nộp tiền bổ sung PayOS thành công.",
    "resolve-overpayment": "Đã xử lý nộp thừa tiền và xác nhận đăng ký thành công.",
  };

  return {
    success: true,
    message: msgMap[intent] ?? "Thao tác thành công.",
  } satisfies PaymentAction;
}

// ─── Dynamic Action Matrix Engine (Tuân thủ chuẩn ma trận nghiệp vụ) ────────
export function getPaymentActions(payment: AdminPayment) {
  const isOverpaid = Boolean(
    (payment.paid_amount != null && payment.paid_amount > payment.amount) ||
    payment.status === "overpaid"
  );
  const isUnderpaid = Boolean(
    ((payment.paid_amount != null && payment.paid_amount > 0 && payment.paid_amount < payment.amount) ||
      payment.status === "partial_paid") &&
    payment.status !== "expired" &&
    payment.status !== "failed" &&
    payment.status !== "cancelled"
  );
  const hasGatewayRef = Boolean(
    payment.gateway_trans_id && payment.gateway_trans_id.trim().length > 0
  );

  // 1. Xem chi tiết: Luôn hợp lệ cho mọi trạng thái
  const canViewDetail = true;

  // 2. Sao chép mã đơn: Mã đơn nội bộ luôn tồn tại
  const canCopyOrderCode = true;

  // 3. Sao chép mã GD cổng: ⚠️ Chỉ hiện khi có mã thực tế (gateway_trans_id != null/empty)
  const canCopyGatewayRef = hasGatewayRef;

  // 4. Đồng bộ PayOS: Giữ ở cả 3 trạng thái (thành công, thất bại, hết hạn 15p) + pending + mismatch
  // Đây là action phòng ngự cho đúng race condition: candidate quét QR thành công ngay sát giây 900
  // Chỉ ẩn khi giao dịch đã hoàn tất hoàn tiền (refunded) hoặc đã hủy chủ động (cancelled)
  const canSync = payment.status !== "refunded" && payment.status !== "cancelled";

  // 5. Xác nhận thủ công: Chỉ cho phép khi trạng thái đang là pending (chờ thanh toán)
  const canConfirm = payment.status === "pending";

  // 6. Đánh dấu hoàn tiền (B1):
  // - Thành công (success): Có tiền vào nên được phép hoàn
  // - Lệch tiền / partial_paid: Chỉ khi thực tế đã nhận được tiền (> 0)
  // - Thất bại / Hết hạn 15p: ❌ Không có tiền vào thì không có gì để hoàn
  const canMarkRefund =
    payment.status === "success" ||
    ((payment.status === "amount_mismatch" || payment.status === "partial_paid") &&
      (payment.paid_amount ?? 0) > 0);

  // 7. Xác nhận đã hoàn tiền (B2): Chỉ hiện khi đang ở pending_refund
  const canConfirmRefund = payment.status === "pending_refund";

  // 8. Xử lý nộp thừa tiền: ⚠️ CHỈ KHI PHÁT HIỆN THẬT (paid_amount > amount hoặc overpaid)
  // Không hiện mặc định trên MỌI giao dịch thành công
  const canResolveOverpayment = isOverpaid;

  // 9. Tạo link nộp bổ sung (Top-up): CHỈ KHI thực tế nộp thiếu tiền
  const canTopUp = isUnderpaid;

  // 10. Hủy giao dịch:
  // - Thành công: ❌ KHÔNG BAO GIỜ (phải theo quy trình hoàn tiền B1, tuyệt đối không được hủy đơn thành công!)
  // - Thất bại: ❌ đã failed sẵn
  // - Hết hạn 15p: ❌ đã tự expire sẵn
  // - CHỈ DUY NHẤT cho trạng thái pending (chờ thanh toán - giao dịch còn sống, admin chủ động void)
  const canCancel = payment.status === "pending";

  return {
    canViewDetail,
    canCopyOrderCode,
    canCopyGatewayRef,
    canSync,
    canConfirm,
    canMarkRefund,
    canConfirmRefund,
    canResolveOverpayment,
    canTopUp,
    canCancel,
    hasOperationalActions:
      canConfirm || canSync || canMarkRefund || canConfirmRefund || canResolveOverpayment || canTopUp || canCancel,
  };
}

// ─── Component: Upload ảnh bằng chứng / chứng từ sao kê ngân hàng ───────────
// CƠ CHẾ TIẾT KIỆM TÀI NGUYÊN: Chỉ xem trước (local preview), chỉ upload lên Cloudinary khi ấn "Xác nhận"!
function EvidenceImageUploader({
  label,
  description,
  file,
  onFileChange,
  manualUrl,
  onManualUrlChange,
  isUploading = false,
  required = false,
}: {
  label: string;
  description?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  manualUrl: string;
  onManualUrlChange: (url: string) => void;
  isUploading?: boolean;
  required?: boolean;
}) {
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [showManualInput, setShowManualInput] = React.useState(Boolean(manualUrl && !file));
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tạo local preview URL an toàn, tự động giải phóng bộ nhớ
  const localPreviewUrl = React.useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  React.useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const handleSelectFile = (selectedFile: File) => {
    setValidationError(null);
    const err = validateImageFile(selectedFile);
    if (err) {
      setValidationError(err);
      return;
    }
    onFileChange(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleSelectFile(dropped);
  };

  const hasImage = Boolean(file || manualUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
          <ImageIcon className="size-3.5 text-primary" />
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          {showManualInput ? "Ẩn nhập link" : "Nhập URL thủ công"}
        </button>
      </div>

      {description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      )}

      {/* Hiển thị thẻ Preview ảnh nếu đã chọn file hoặc có URL */}
      {hasImage ? (
        <div className="rounded-xl border bg-card/80 p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-12 shrink-0 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
              <img
                src={localPreviewUrl || manualUrl}
                alt="Bằng chứng sao kê"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground truncate">
                  {file ? file.name : "Ảnh chứng từ / sao kê"}
                </span>
                {file ? (
                  <Badge
                    variant="outline"
                    className="rounded-full px-1.5 py-0 text-[10px] font-normal border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800"
                  >
                    Chờ tải lên khi xác nhận
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full px-1.5 py-0 text-[10px] font-normal border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800"
                  >
                    URL trực tiếp
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : manualUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer h-7 text-xs px-2.5 hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Thay ảnh
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onFileChange(null);
                onManualUrlChange("");
                setValidationError(null);
              }}
              disabled={isUploading}
              title="Xóa ảnh"
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isUploading
              ? "bg-muted/40 border-muted-foreground/30 pointer-events-none"
              : "hover:border-primary/50 hover:bg-muted/20 border-border bg-card/40"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <p className="text-xs font-semibold text-foreground">
                Đang tải ảnh lên Cloudinary...
              </p>
              <p className="text-[10px] text-muted-foreground">
                Hệ thống đang lưu trữ và ký số bảo mật hình ảnh chứng từ
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-0.5">
                <UploadCloudIcon className="size-4.5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Nhấn để chọn ảnh sao kê / biên lai hoặc kéo thả vào đây
              </p>
              <p className="text-[11px] text-muted-foreground">
                Hỗ trợ JPEG, PNG, WebP (Tối đa 5MB) • Ảnh chỉ được tải lên khi bạn bấm Xác nhận
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleSelectFile(selected);
          e.target.value = "";
        }}
      />

      {validationError && (
        <p className="text-xs text-destructive font-medium">{validationError}</p>
      )}

      {showManualInput && (
        <div className="pt-1">
          <Input
            value={manualUrl}
            onChange={(e) => {
              onManualUrlChange(e.target.value);
              if (e.target.value && file) onFileChange(null);
            }}
            placeholder="https://res.cloudinary.com/.../receipt.jpg"
            className="h-8 rounded-full px-3 text-xs bg-background font-mono"
          />
        </div>
      )}
    </div>
  );
}

// ─── Helper: Chỉ upload lên Cloudinary khi ấn nút Xác nhận ─────────────────
async function uploadEvidenceFile(
  file: File,
  token: string,
  apiBaseUrl: string
): Promise<string> {
  // 1. Lấy chữ ký tải ảnh từ API backend (folder: hsk_vinh_university/payments/evidence)
  const sigRes = await fetch(
    `${apiBaseUrl}/api/v1/admin/payments/evidence-upload-signature`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!sigRes.ok) {
    throw new Error("Không thể lấy chữ ký tải ảnh từ máy chủ backend.");
  }
  const sigJson = await sigRes.json();
  if (!sigJson?.data?.signature) {
    throw new Error("Dữ liệu chữ ký tải ảnh Cloudinary không hợp lệ.");
  }

  // 2. Tải trực tiếp lên Cloudinary folder chuyên dụng
  return await uploadToCloudinary(file, sigJson.data);
}

// ─── Dialog: Xác nhận thanh toán thủ công (API 6.5) ─────────────────────────
function ConfirmPaymentDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { evidenceUrl: string; note: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setFile(null);
      setManualUrl("");
      setNote("");
      setIsUploading(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc chọn ảnh biên lai / sao kê trước khi xác nhận.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ evidenceUrl: finalUrl, note });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-emerald-600 border-emerald-200 bg-emerald-50"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-muted-foreground">Xác nhận thủ công</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Xác nhận thanh toán thủ công
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Thí sinh: <span className="font-semibold text-foreground">{payment.candidate_name || "—"}</span> • Số tiền:{" "}
            <span className="font-mono font-bold text-foreground">{formatCurrency(payment.amount)}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Thông tin giao dịch</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Số tiền yêu cầu</span>
                <p className="font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Kỳ thi</span>
                <p className="font-medium text-foreground mt-0.5 truncate">{payment.exam_type_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mã đơn</span>
                <p className="font-mono text-foreground mt-0.5 truncate">{payment.transaction_ref}</p>
              </div>
            </div>
          </div>

          <EvidenceImageUploader
            label="Ảnh biên lai / sao kê chuyển khoản"
            description="Tải lên ảnh chụp màn hình app ngân hàng hoặc sao kê có mã đơn để lưu trữ bằng chứng kiểm toán."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="confirm_note" className="text-xs font-semibold text-foreground">
              Ghi chú nội bộ
            </Label>
            <Input
              id="confirm_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đã đối chiếu sao kê Vietcombank lúc 10:15"
              className="h-9 rounded-full px-3 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              disabled={isBusy || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Xác nhận thanh toán"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Hủy giao dịch (API 6.6 - CHỈ DÀNH CHO PENDING) ─────────────────
function CancelPaymentDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { reason: string; evidenceUrl: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setFile(null);
      setManualUrl("");
      setIsUploading(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 3) {
      toast.add({
        type: "error",
        title: "Thiếu lý do",
        description: "Vui lòng nhập lý do hủy giao dịch (tối thiểu 3 ký tự).",
      });
      return;
    }
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc đính kèm ảnh chứng từ / đơn đề nghị hủy giao dịch.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ reason: reason.trim(), evidenceUrl: finalUrl });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-destructive/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-destructive border-destructive/20 bg-destructive/5"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-destructive font-medium">Hủy giao dịch chờ</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Xác nhận hủy giao dịch #{payment.id}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Giao dịch <span className="font-semibold text-foreground">chờ thanh toán</span> sẽ bị đóng và nhả slot giữ chỗ thi. Hành động này được ghi vào nhật ký kiểm toán.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thông tin giao dịch</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Số tiền</span>
                <p className="font-bold font-mono text-foreground mt-0.5">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Kỳ thi</span>
                <p className="font-medium text-foreground mt-0.5 truncate">{payment.exam_type_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mã đơn</span>
                <p className="font-mono text-foreground mt-0.5 truncate">{payment.transaction_ref}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
            <p className="font-semibold">⚠ Lưu ý quan trọng</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>Giao dịch sẽ bị huỷ vĩnh viễn, không thể hoàn tác.</li>
              <li>Ghế thi (nếu đã đặt) sẽ được giải phóng trở lại.</li>
              <li>Hồ sơ đăng ký sẽ chuyển sang trạng thái <strong>Cancelled</strong>.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel_reason" className="text-xs font-semibold text-foreground">
              Lý do hủy giao dịch <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cancel_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Thí sinh gửi yêu cầu hủy đăng ký ca thi qua email"
              className="h-9 rounded-full px-3 text-xs"
              required
            />
          </div>

          <EvidenceImageUploader
            label="Ảnh chứng từ / Đơn yêu cầu hủy"
            description="Tải lên ảnh chụp màn hình email, đơn xin hủy hoặc giấy xác nhận từ thí sinh."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-medium"
              disabled={isBusy || !reason || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Xác nhận hủy giao dịch"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Đánh dấu hoàn tiền (Bước 1: Mark Refund - API 6.7) ─────────────
function MarkRefundDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { reason: string; evidenceUrl: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setFile(null);
      setManualUrl("");
      setIsUploading(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 3) {
      toast.add({
        type: "error",
        title: "Thiếu lý do hoàn tiền",
        description: "Vui lòng nhập lý do hoàn tiền chi tiết (tối thiểu 3 ký tự).",
      });
      return;
    }
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc chọn ảnh đơn xin hoàn tiền hoặc sao kê đối chiếu.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ reason: reason.trim(), evidenceUrl: finalUrl });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-amber-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-amber-800 font-medium">Bước 1: Yêu cầu hoàn tiền</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Đánh dấu hoàn tiền giao dịch #{payment.id}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Chuyển giao dịch sang trạng thái <strong>Chờ hoàn tiền (pending_refund)</strong> để bộ phận kế toán tiến hành chuyển khoản trả lại cho thí sinh.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Thông tin giao dịch cần hoàn</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Số tiền đã nộp</span>
                <p className="font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                  {formatCurrency(payment.paid_amount ?? payment.amount_received ?? payment.amount)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Kỳ thi</span>
                <p className="font-medium text-foreground mt-0.5 truncate">{payment.exam_type_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mã đơn</span>
                <p className="font-mono text-foreground mt-0.5 truncate">{payment.transaction_ref}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund_reason" className="text-xs font-semibold text-foreground">
              Lý do yêu cầu hoàn tiền <span className="text-destructive">*</span>
            </Label>
            <Input
              id="refund_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Thí sinh nộp nhầm kỳ thi / xin rút hồ sơ hợp lệ"
              className="h-9 rounded-full px-3 text-xs"
              required
            />
          </div>

          <EvidenceImageUploader
            label="Ảnh đơn xin hoàn tiền / Bằng chứng sao kê"
            description="Tải lên ảnh đơn đề nghị hoàn tiền của thí sinh hoặc sao kê ngân hàng đối chiếu."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium"
              disabled={isBusy || !reason || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Xác nhận đánh dấu hoàn tiền"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Xác nhận đã hoàn tiền (Bước 2: Confirm Refund - API 6.7.1) ──────────
function ConfirmRefundDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { bankRef: string; note: string; evidenceUrl: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [bankRef, setBankRef] = React.useState("");
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setBankRef("");
      setNote("");
      setFile(null);
      setManualUrl("");
      setIsUploading(false);
    }
  }, [open]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankRef || bankRef.trim().length < 2) {
      toast.add({
        type: "error",
        title: "Thiếu mã giao dịch ngân hàng",
        description: "Vui lòng nhập mã giao dịch ngân hàng (bank_ref) của lệnh chuyển hoàn.",
      });
      return;
    }
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc đính kèm ảnh ủy nhiệm chi hoặc biên lai chuyển khoản hoàn tiền.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ bankRef: bankRef.trim(), note, evidenceUrl: finalUrl });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-emerald-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-emerald-800 font-medium">Bước 2: Đóng vòng lặp hoàn tiền</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Xác nhận đã hoàn tiền thành công
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Kế toán đã chuyển khoản trả lại tiền cho thí sinh. Thao tác này sẽ chuyển trạng thái sang <strong>Đã hoàn tiền (refunded)</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Thông tin hoàn tiền đang chờ xác nhận</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Số tiền cần hoàn</span>
                <p className="font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {payment.refund_amount != null ? formatCurrency(payment.refund_amount) : formatCurrency(payment.paid_amount ?? payment.amount_received ?? payment.amount)}
                </p>
              </div>
              {payment.refund_reason && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Lý do hoàn</span>
                  <p className="font-medium text-foreground mt-0.5 line-clamp-2">{payment.refund_reason}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Kỳ thi</span>
                <p className="font-medium text-foreground mt-0.5 truncate">{payment.exam_type_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mã đơn</span>
                <p className="font-mono text-foreground mt-0.5 truncate">{payment.transaction_ref}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund_bank_ref" className="text-xs font-semibold text-foreground">
              Mã giao dịch ngân hàng (Bank Ref) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="refund_bank_ref"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="Ví dụ: FT262509123456 hoặc VCB.12345678"
              className="h-9 rounded-full px-3 text-xs font-mono"
              required
            />
          </div>

          <EvidenceImageUploader
            label="Ảnh ủy nhiệm chi / Biên lai chuyển hoàn"
            description="Tải lên ảnh chụp màn hình chuyển khoản ngân hàng thành công đến số tài khoản thí sinh."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="refund_note" className="text-xs font-semibold text-foreground">
              Ghi chú kế toán
            </Label>
            <Input
              id="refund_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Hoàn 100% lệ phí về số tài khoản Vietcombank của thí sinh"
              className="h-9 rounded-full px-3 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium"
              disabled={isBusy || !bankRef || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Xác nhận đã hoàn tiền"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Tạo link nộp tiền bổ sung (Top-up - API 6.10) ───────────────────
function TopUpDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { additionalAmount?: number; extendHours: number; note: string; evidenceUrl: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [additionalAmount, setAdditionalAmount] = React.useState<number>(0);
  const [extendHours, setExtendHours] = React.useState<number>(24);
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open && payment) {
      const missing = payment.paid_amount != null && payment.paid_amount < payment.amount
        ? payment.amount - payment.paid_amount
        : 0;
      setAdditionalAmount(missing);
      setExtendHours(24);
      setNote("");
      setFile(null);
      setManualUrl("");
      setIsUploading(false);
    }
  }, [open, payment]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc chọn ảnh sao kê / chứng từ đối chiếu nộp bổ sung.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ additionalAmount, extendHours, note, evidenceUrl: finalUrl });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-blue-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-blue-700 border-blue-300 bg-blue-50"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-blue-800 font-medium">Nộp bổ sung (Top-up)</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Tạo link nộp bổ sung PayOS
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Giao dịch chuyển thiếu tiền. Hệ thống sẽ tạo link nộp phần tiền còn thiếu và gia hạn giữ chỗ cho thí sinh.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Thông tin giao dịch thiếu tiền</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lệ phí yêu cầu</span>
                <p className="font-bold font-mono text-foreground mt-0.5">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Đã nộp</span>
                <p className="font-bold font-mono text-amber-600 mt-0.5">
                  {formatCurrency(payment.paid_amount ?? payment.amount_received ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Còn thiếu</span>
                <p className="font-bold font-mono text-destructive mt-0.5">
                  {formatCurrency(
                    payment.amount - (payment.paid_amount ?? payment.amount_received ?? 0) > 0
                      ? payment.amount - (payment.paid_amount ?? payment.amount_received ?? 0)
                      : 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topup_amount" className="text-xs font-semibold text-foreground">
                Số tiền nộp bổ sung (đ) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topup_amount"
                type="number"
                value={additionalAmount || ""}
                onChange={(e) => setAdditionalAmount(Number(e.target.value))}
                placeholder="100000"
                className="h-9 rounded-full px-3 text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topup_hours" className="text-xs font-semibold text-foreground">
                Gia hạn giữ chỗ (giờ)
              </Label>
              <Input
                id="topup_hours"
                type="number"
                value={extendHours}
                onChange={(e) => setExtendHours(Number(e.target.value))}
                min={1}
                max={168}
                className="h-9 rounded-full px-3 text-xs font-mono"
              />
            </div>
          </div>

          <EvidenceImageUploader
            label="Ảnh chứng từ đối chiếu chuyển khoản thiếu"
            description="Tải lên ảnh chụp sao kê ngân hàng thể hiện số tiền thí sinh đã chuyển chưa đủ."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="topup_note" className="text-xs font-semibold text-foreground">
              Ghi chú
            </Label>
            <Input
              id="topup_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Lệ phí 500k nhưng mới nhận được 400k"
              className="h-9 rounded-full px-3 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
              disabled={isBusy || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Tạo link nộp bổ sung"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Xử lý nộp thừa tiền (Overpayment - API 6.11) ─────────────────────
function ResolveOverpaymentDialog({
  payment,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  token,
  apiBaseUrl,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { refundAmount?: number; note: string; evidenceUrl: string }) => void;
  isSubmitting: boolean;
  token: string;
  apiBaseUrl: string;
}) {
  const [refundAmount, setRefundAmount] = React.useState<number>(0);
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [manualUrl, setManualUrl] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (open && payment) {
      const over = payment.paid_amount != null && payment.paid_amount > payment.amount
        ? payment.paid_amount - payment.amount
        : 0;
      setRefundAmount(over);
      setNote(over > 0 ? `Hoàn tiền nộp thừa ${formatCurrency(over)} cho thí sinh` : "");
      setFile(null);
      setManualUrl("");
      setIsUploading(false);
    }
  }, [open, payment]);

  if (!payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || note.trim().length < 3) {
      toast.add({
        type: "error",
        title: "Thiếu ghi chú",
        description: "Vui lòng nhập ghi chú phương án xử lý (tối thiểu 3 ký tự).",
      });
      return;
    }
    if (!file && !manualUrl.trim()) {
      toast.add({
        type: "error",
        title: "Thiếu ảnh chứng từ",
        description: "Bắt buộc chọn ảnh sao kê chứng minh thí sinh đã nộp thừa tiền.",
      });
      return;
    }

    let finalUrl = manualUrl.trim();
    if (file) {
      try {
        setIsUploading(true);
        finalUrl = await uploadEvidenceFile(file, token, apiBaseUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tải ảnh lên máy chủ thất bại.";
        toast.add({
          type: "error",
          title: "Lỗi tải ảnh chứng từ",
          description: msg,
        });
        setIsUploading(false);
        return;
      }
    }

    setIsUploading(false);
    onSubmit({ refundAmount, note, evidenceUrl: finalUrl });
  };

  const isBusy = isSubmitting || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="p-6 pb-2 border-b bg-purple-500/10">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-xs font-semibold text-purple-700 border-purple-300 bg-purple-50"
            >
              #{payment.id}
            </Badge>
            <span className="text-xs text-purple-800 font-medium">Xử lý nộp thừa tiền</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Xử lý giao dịch nộp thừa tiền
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Hệ thống sẽ xác nhận đăng ký thi và đặt ghế cho thí sinh (thành công), đồng thời đưa khoản thừa vào danh sách hoàn tiền.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Context card */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-900 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Thông tin giao dịch nộp thừa</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Thí sinh</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{payment.candidate_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lệ phí yêu cầu</span>
                <p className="font-bold font-mono text-foreground mt-0.5">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Đã nộp</span>
                <p className="font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5">
                  {formatCurrency(payment.paid_amount ?? payment.amount_received ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Nộp thừa</span>
                <p className="font-bold font-mono text-amber-600 mt-0.5">
                  {formatCurrency(
                    (payment.paid_amount ?? payment.amount_received ?? 0) - payment.amount > 0
                      ? (payment.paid_amount ?? payment.amount_received ?? 0) - payment.amount
                      : 0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="overpay_refund_amount" className="text-xs font-semibold text-foreground">
              Số tiền hoàn trả lại thí sinh (đ)
            </Label>
            <Input
              id="overpay_refund_amount"
              type="number"
              value={refundAmount || ""}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              placeholder="100000"
              className="h-9 rounded-full px-3 text-xs font-mono"
            />
          </div>

          <EvidenceImageUploader
            label="Ảnh chứng từ sao kê nộp thừa tiền"
            description="Tải lên ảnh chụp sao kê ngân hàng thể hiện rõ số tiền thí sinh đã nộp vượt quá mức lệ phí."
            file={file}
            onFileChange={setFile}
            manualUrl={manualUrl}
            onManualUrlChange={setManualUrl}
            isUploading={isUploading}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="overpay_note" className="text-xs font-semibold text-foreground">
              Ghi chú xử lý <span className="text-destructive">*</span>
            </Label>
            <Input
              id="overpay_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đã ghi nhận nộp thừa 100k, kế toán sẽ chuyển hoàn lại"
              className="h-9 rounded-full px-3 text-xs"
              required
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full cursor-pointer bg-purple-600 text-white hover:bg-purple-700 text-xs font-medium"
              disabled={isBusy || !note || (!file && !manualUrl.trim())}
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : isSubmitting ? (
                "Đang xử lý..."
              ) : (
                "Xác nhận & Hoàn tiền thừa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// ─── Dialog: Xem chi tiết giao dịch (Có Fallback & Footer linh hoạt) ────────
function PaymentDetailDialog({
  payment,
  open,
  onOpenChange,
  onConfirm,
  onSync,
  onCancel,
  onMarkRefund,
  onConfirmRefund,
  onTopUp,
  onResolveOverpayment,
}: {
  payment: AdminPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (p: AdminPayment) => void;
  onSync: (p: AdminPayment) => void;
  onCancel: (p: AdminPayment) => void;
  onMarkRefund: (p: AdminPayment) => void;
  onConfirmRefund: (p: AdminPayment) => void;
  onTopUp: (p: AdminPayment) => void;
  onResolveOverpayment: (p: AdminPayment) => void;
}) {
  if (!payment) return null;
  const statusInfo = getPaymentStatusInfo(payment.status);
  const actions = getPaymentActions(payment);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(payment.transaction_ref);
    toast.add({
      type: "info",
      title: "Đã sao chép mã đơn hàng",
      description: `Mã ${payment.transaction_ref} đã được lưu vào bộ nhớ tạm.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Thông tin thí sinh với Fallback đầy đủ */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCardIcon className="size-3.5 text-primary" />
              Thông tin thí sinh & Kỳ thi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Thí sinh</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {payment.candidate_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium text-foreground mt-0.5 break-all">
                  {payment.candidate_email || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Kỳ thi / Cấp độ</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {payment.exam_type_name || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ID phiếu đăng ký</p>
                <p className="font-mono font-medium text-foreground mt-0.5">
                  #{payment.exam_registration_id}
                </p>
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
                <p className="font-bold text-foreground text-base mt-0.5 font-mono">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Phương thức thanh toán</p>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2 py-0.5 text-xs font-normal border ${getPaymentMethodInfo(payment.method).badgeClass}`}
                  >
                    <CreditCardIcon className="size-3 mr-1" />
                    {getPaymentMethodInfo(payment.method).label}
                  </Badge>
                </div>
              </div>
              {payment.paid_amount != null && payment.paid_amount !== payment.amount && (
                <div>
                  <p className="text-muted-foreground text-xs">Số tiền thực nhận</p>
                  <p
                    className={`font-bold text-sm mt-0.5 font-mono ${
                      payment.paid_amount < payment.amount ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(payment.paid_amount)}
                  </p>
                </div>
              )}
              {payment.gateway_trans_id && (
                <div>
                  <p className="text-muted-foreground text-xs">Mã giao dịch cổng</p>
                  <p className="font-mono text-xs font-semibold text-foreground mt-0.5">
                    {payment.gateway_trans_id}
                  </p>
                </div>
              )}
              {payment.bank_name && (
                <div>
                  <p className="text-muted-foreground text-xs">Ngân hàng thụ hưởng</p>
                  <p className="font-medium text-foreground mt-0.5">{payment.bank_name}</p>
                </div>
              )}
              {payment.account_number && (
                <div>
                  <p className="text-muted-foreground text-xs">Số tài khoản</p>
                  <p className="font-mono font-medium text-foreground mt-0.5">
                    {payment.account_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Ghi chú quản trị & bằng chứng giao dịch ─────────────────── */}
          {(payment.admin_note || (payment.evidence_urls && payment.evidence_urls.length > 0)) && (
            <div className="rounded-xl border bg-card/60 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-primary" />
                Ghi chú quản trị &amp; Bằng chứng
              </h4>
              {payment.admin_note && (
                <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {payment.admin_note}
                </div>
              )}
              {payment.evidence_urls && payment.evidence_urls.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Bằng chứng đính kèm</p>
                  <div className="flex flex-wrap gap-2">
                    {payment.evidence_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Bằng chứng ${idx + 1}`}
                          className="h-20 w-20 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Top-up / nộp bổ sung ──────────────────────────────────────── */}
          {payment.is_top_up && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <ArrowUpRightIcon className="size-3.5" />
                Giao dịch nộp bổ sung (Top-up)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {payment.parent_payment_id && (
                  <div>
                    <p className="text-muted-foreground text-xs">Giao dịch gốc</p>
                    <p className="font-mono font-semibold text-foreground mt-0.5">
                      #{payment.parent_payment_id}
                    </p>
                  </div>
                )}
                {(payment.amount_received != null || payment.paid_amount != null) && (
                  <div>
                    <p className="text-muted-foreground text-xs">Số tiền thực nộp</p>
                    <p className="font-bold text-blue-600 mt-0.5 font-mono">
                      {formatCurrency(payment.paid_amount ?? payment.amount_received)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Hoàn tiền ─────────────────────────────────────────────────── */}
          {(payment.status === "refunded" ||
            payment.status === "pending_refund" ||
            payment.refund_amount != null ||
            payment.refund_reason != null ||
            payment.refund_bank_ref != null) && (
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                payment.status === "refunded"
                  ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900"
                  : "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                    payment.status === "refunded"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  <BanknoteIcon className="size-3.5" />
                  Thông tin hoàn tiền
                </h4>
                <Badge
                  className={`rounded-full px-2 py-0.5 text-xs font-medium border ${
                    payment.status === "refunded"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  {payment.status === "refunded" ? "✓ Đã hoàn tiền" : "⏳ Chờ xác nhận hoàn tiền"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {payment.refund_amount != null && (
                  <div>
                    <p className="text-muted-foreground text-xs">Số tiền hoàn</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono text-base">
                      {formatCurrency(payment.refund_amount)}
                    </p>
                  </div>
                )}
                {payment.refund_bank_ref && (
                  <div>
                    <p className="text-muted-foreground text-xs">Mã giao dịch ngân hàng (B2)</p>
                    <p className="font-mono text-xs font-semibold text-foreground mt-0.5 break-all">
                      {payment.refund_bank_ref}
                    </p>
                  </div>
                )}
                {payment.refund_reason && (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground text-xs mb-1">Lý do hoàn tiền</p>
                    <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {payment.refund_reason}
                    </div>
                  </div>
                )}
                {payment.refunded_at && (
                  <div>
                    <p className="text-muted-foreground text-xs">Hoàn tiền lúc</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                      {formatDateTime(payment.refunded_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Bằng chứng hoàn tiền - B1: Đơn xin hoàn */}
              {payment.evidence_urls && payment.evidence_urls.length > 0 && payment.status !== "success" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    📄 Bằng chứng B1 (đơn xin hoàn / sao kê đề nghị)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {payment.evidence_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-border hover:border-amber-400 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`B1 bằng chứng ${idx + 1}`}
                          className="h-20 w-20 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bằng chứng hoàn tiền - B2: Ủy nhiệm chi */}
              {payment.refund_evidence_urls && payment.refund_evidence_urls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    🏦 Bằng chứng B2 (ủy nhiệm chi / xác nhận ngân hàng)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {payment.refund_evidence_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-border hover:border-emerald-400 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`B2 ủy nhiệm chi ${idx + 1}`}
                          className="h-20 w-20 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dấu mốc thời gian */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ClockIcon className="size-3.5 text-primary" />
              Thời gian
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Tạo lúc</p>
                <p className="font-medium text-foreground mt-0.5 font-mono">
                  {formatDateTime(payment.created_at)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cập nhật lúc</p>
                <p className="font-medium text-foreground mt-0.5 font-mono">
                  {formatDateTime(payment.updated_at || payment.created_at)}
                </p>
              </div>
              {payment.paid_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Thanh toán lúc</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                    {formatDateTime(payment.paid_at)}
                  </p>
                </div>
              )}
              {payment.confirmed_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Xác nhận lúc</p>
                  <p className="font-medium text-emerald-600 mt-0.5 font-mono">
                    {formatDateTime(payment.confirmed_at)}
                  </p>
                </div>
              )}
              {payment.refunded_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Hoàn tiền lúc</p>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {formatDateTime(payment.refunded_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer linh hoạt, tự co giãn, không bị chồng đè, tuân thủ đúng ma trận */}
        <DialogFooter className="p-4 sm:p-5 border-t bg-muted/10 flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full cursor-pointer hover:bg-muted text-xs text-muted-foreground"
            onClick={handleCopyRef}
          >
            <CopyIcon className="size-3.5 mr-1.5" />
            Sao chép mã đơn
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer hover:bg-muted text-xs"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>

            {actions.canConfirm && (
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

            {actions.canSync && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium text-sky-600 border-sky-200 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onSync(payment);
                }}
              >
                <RefreshCwIcon className="size-3.5 mr-1" />
                Đồng bộ PayOS
              </Button>
            )}

            {actions.canMarkRefund && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onMarkRefund(payment);
                }}
              >
                <BanknoteIcon className="size-3.5 mr-1" />
                Đánh dấu hoàn tiền (B1)
              </Button>
            )}

            {actions.canConfirmRefund && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onConfirmRefund(payment);
                }}
              >
                <CalendarCheckIcon className="size-3.5 mr-1" />
                Xác nhận đã hoàn tiền (B2)
              </Button>
            )}

            {actions.canResolveOverpayment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onResolveOverpayment(payment);
                }}
              >
                <ScaleIcon className="size-3.5 mr-1" />
                Xử lý nộp thừa tiền
              </Button>
            )}

            {actions.canTopUp && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs font-medium text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onTopUp(payment);
                }}
              >
                <ArrowUpRightIcon className="size-3.5 mr-1" />
                Nộp bổ sung (Top-up)
              </Button>
            )}

            {/* HỦY GIAO DỊCH: CHỈ HIỆN CHO TRẠNG THÁI PENDING, TUYỆT ĐỐI ẨN KHI SUCCESS, FAILED, EXPIRED */}
            {actions.canCancel && (
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);

  const [paymentToSync, setPaymentToSync] = React.useState<AdminPayment | null>(null);
  const [isSyncAlertOpen, setIsSyncAlertOpen] = React.useState(false);

  const [paymentToCancel, setPaymentToCancel] = React.useState<AdminPayment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);

  const [paymentToMarkRefund, setPaymentToMarkRefund] = React.useState<AdminPayment | null>(null);
  const [isMarkRefundDialogOpen, setIsMarkRefundDialogOpen] = React.useState(false);

  const [paymentToConfirmRefund, setPaymentToConfirmRefund] = React.useState<AdminPayment | null>(null);
  const [isConfirmRefundDialogOpen, setIsConfirmRefundDialogOpen] = React.useState(false);

  const [paymentToTopUp, setPaymentToTopUp] = React.useState<AdminPayment | null>(null);
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = React.useState(false);

  const [paymentToResolveOverpayment, setPaymentToResolveOverpayment] = React.useState<AdminPayment | null>(null);
  const [isResolveOverpaymentDialogOpen, setIsResolveOverpaymentDialogOpen] = React.useState(false);

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
    setSearchParams(next, { preventScrollReset: true });
  };

  // Local state cho ô tìm kiếm mã đơn PayOS để gõ phím mượt mà 60fps
  const [orderCodeInput, setOrderCodeInput] = React.useState(orderCodeQuery);

  // Đồng bộ với URL param khi URL thay đổi (reset, history back/forward)
  React.useEffect(() => {
    setOrderCodeInput(orderCodeQuery);
  }, [orderCodeQuery]);

  // Debounce (350ms) cập nhật URL params
  const debouncedUpdateOrderCode = useDebouncedCallback((val: string) => {
    const trimmed = val.trim();
    if (trimmed !== (orderCodeQuery || "")) {
      updateParams({ order_code: trimmed || null, page: null });
    }
  }, 350);

  const handleOrderCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrderCodeInput(val);
    debouncedUpdateOrderCode(val);
  };

  const handleOrderCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      debouncedUpdateOrderCode.flush(orderCodeInput);
    }
  };

  const handleClearOrderCode = () => {
    setOrderCodeInput("");
    debouncedUpdateOrderCode.cancel();
    updateParams({ order_code: null, page: null });
  };

  const handleResetFilters = () => {
    setOrderCodeInput("");
    debouncedUpdateOrderCode.cancel();
    setSearchParams(new URLSearchParams(), { preventScrollReset: true });
  };

  const handleThrottledRevalidate = useThrottledCallback(() => {
    revalidator.revalidate();
  }, 1000);

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
      setIsConfirmDialogOpen(false);
      setPaymentToSync(null);
      setIsSyncAlertOpen(false);
      setPaymentToCancel(null);
      setIsCancelDialogOpen(false);
      setPaymentToMarkRefund(null);
      setIsMarkRefundDialogOpen(false);
      setPaymentToConfirmRefund(null);
      setIsConfirmRefundDialogOpen(false);
      setPaymentToTopUp(null);
      setIsTopUpDialogOpen(false);
      setPaymentToResolveOverpayment(null);
      setIsResolveOverpaymentDialogOpen(false);
    } else if (actionFetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể hoàn tất thao tác",
        description: actionFetcher.data.error,
      });
    }
  }, [actionFetcher.data, revalidator]);

  // ── Actions gọi API thông qua fetcher ────────────────────────────────────
  const handleConfirmPayment = (data: { evidenceUrl: string; note: string }) => {
    if (!paymentToConfirm) return;
    actionFetcher.submit(
      {
        intent: "confirm",
        payment_id: String(paymentToConfirm.id),
        evidence_url: data.evidenceUrl,
        note: data.note,
      },
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

  const handleCancelPayment = (data: { reason: string; evidenceUrl: string }) => {
    if (!paymentToCancel) return;
    actionFetcher.submit(
      {
        intent: "cancel",
        payment_id: String(paymentToCancel.id),
        reason: data.reason,
        evidence_url: data.evidenceUrl,
      },
      { method: "post" }
    );
  };

  const handleMarkRefundPayment = (data: { reason: string; evidenceUrl: string }) => {
    if (!paymentToMarkRefund) return;
    actionFetcher.submit(
      {
        intent: "mark-refund",
        payment_id: String(paymentToMarkRefund.id),
        reason: data.reason,
        evidence_url: data.evidenceUrl,
      },
      { method: "post" }
    );
  };

  const handleConfirmRefundPayment = (data: { bankRef: string; note: string; evidenceUrl: string }) => {
    if (!paymentToConfirmRefund) return;
    actionFetcher.submit(
      {
        intent: "confirm-refund",
        payment_id: String(paymentToConfirmRefund.id),
        bank_ref: data.bankRef,
        note: data.note,
        evidence_url: data.evidenceUrl,
      },
      { method: "post" }
    );
  };

  const handleTopUpPayment = (data: { additionalAmount?: number; extendHours: number; note: string; evidenceUrl: string }) => {
    if (!paymentToTopUp) return;
    actionFetcher.submit(
      {
        intent: "top-up",
        payment_id: String(paymentToTopUp.id),
        additional_amount: String(data.additionalAmount ?? 0),
        extend_hours: String(data.extendHours),
        note: data.note,
        evidence_url: data.evidenceUrl,
      },
      { method: "post" }
    );
  };

  const handleResolveOverpayment = (data: { refundAmount?: number; note: string; evidenceUrl: string }) => {
    if (!paymentToResolveOverpayment) return;
    actionFetcher.submit(
      {
        intent: "resolve-overpayment",
        payment_id: String(paymentToResolveOverpayment.id),
        refund_amount: String(data.refundAmount ?? 0),
        note: data.note,
        evidence_url: data.evidenceUrl,
      },
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
            onClick={handleThrottledRevalidate}
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
                value={orderCodeInput}
                onChange={handleOrderCodeChange}
                onKeyDown={handleOrderCodeKeyDown}
                placeholder="Tìm mã đơn PayOS..."
                className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                aria-label="Tìm kiếm theo mã đơn PayOS"
              />
              {orderCodeInput && (
                <button
                  type="button"
                  onClick={handleClearOrderCode}
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
                const actions = getPaymentActions(payment);

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
                          {payment.candidate_name || "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {payment.exam_type_name || "—"}
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
                          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                              Giao dịch #{payment.id}
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs rounded-lg font-medium"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <EyeIcon className="size-3.5 mr-2 text-muted-foreground" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs rounded-lg font-medium"
                                onClick={() =>
                                  navigator.clipboard
                                    ?.writeText(payment.transaction_ref)
                                    .then(() =>
                                      toast.add({
                                        type: "info",
                                        title: "Đã sao chép mã đơn hàng",
                                        description: `Mã ${payment.transaction_ref} đã lưu vào bộ nhớ tạm.`,
                                      })
                                    )
                                }
                              >
                                <CopyIcon className="size-3.5 mr-2 text-muted-foreground" />
                                Sao chép mã đơn
                              </DropdownMenuItem>
                              {actions.canCopyGatewayRef && (
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs rounded-lg font-medium"
                                  onClick={() =>
                                    navigator.clipboard
                                      ?.writeText(payment.gateway_trans_id!)
                                      .then(() =>
                                        toast.add({
                                          type: "info",
                                          title: "Đã sao chép mã GD cổng",
                                          description: `Mã cổng ${payment.gateway_trans_id} đã lưu vào bộ nhớ tạm.`,
                                        })
                                      )
                                  }
                                >
                                  <CreditCardIcon className="size-3.5 mr-2 text-muted-foreground" />
                                  Sao chép mã GD cổng
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>

                            {/* Hành động quản trị & nghiệp vụ sinh động theo đúng Ma trận Action */}
                            {actions.hasOperationalActions && (
                              <>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                  Quản trị & Nghiệp vụ
                                </DropdownMenuLabel>
                                <DropdownMenuGroup>
                                  {actions.canConfirm && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                      onClick={() => {
                                        setPaymentToConfirm(payment);
                                        setIsConfirmDialogOpen(true);
                                      }}
                                    >
                                      <CheckIcon className="size-3.5 mr-2" />
                                      Xác nhận thủ công
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canSync && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-sky-600 dark:text-sky-400 focus:text-sky-600 focus:bg-sky-50 dark:focus:bg-sky-950/40"
                                      onClick={() => {
                                        setPaymentToSync(payment);
                                        setIsSyncAlertOpen(true);
                                      }}
                                    >
                                      <RefreshCwIcon className="size-3.5 mr-2" />
                                      Đồng bộ PayOS
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canMarkRefund && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-amber-600 dark:text-amber-400 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                      onClick={() => {
                                        setPaymentToMarkRefund(payment);
                                        setIsMarkRefundDialogOpen(true);
                                      }}
                                    >
                                      <BanknoteIcon className="size-3.5 mr-2" />
                                      Đánh dấu hoàn tiền (B1)
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canConfirmRefund && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                      onClick={() => {
                                        setPaymentToConfirmRefund(payment);
                                        setIsConfirmRefundDialogOpen(true);
                                      }}
                                    >
                                      <CalendarCheckIcon className="size-3.5 mr-2" />
                                      Xác nhận đã hoàn tiền (B2)
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canResolveOverpayment && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-purple-600 dark:text-purple-400 focus:text-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/40"
                                      onClick={() => {
                                        setPaymentToResolveOverpayment(payment);
                                        setIsResolveOverpaymentDialogOpen(true);
                                      }}
                                    >
                                      <ScaleIcon className="size-3.5 mr-2" />
                                      Xử lý nộp thừa tiền
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canTopUp && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium text-blue-600 dark:text-blue-400 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950/40"
                                      onClick={() => {
                                        setPaymentToTopUp(payment);
                                        setIsTopUpDialogOpen(true);
                                      }}
                                    >
                                      <ArrowUpRightIcon className="size-3.5 mr-2" />
                                      Nộp bổ sung (Top-up)
                                    </DropdownMenuItem>
                                  )}

                                  {actions.canCancel && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onClick={() => {
                                        setPaymentToCancel(payment);
                                        setIsCancelDialogOpen(true);
                                      }}
                                    >
                                      <XCircleIcon className="size-3.5 mr-2" />
                                      Hủy giao dịch
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
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

      {/* ── Dialog: Chi Tiết Giao Dịch ────────────────────────────────────── */}
      <PaymentDetailDialog
        payment={selectedPayment}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onConfirm={(p) => {
          setPaymentToConfirm(p);
          setIsConfirmDialogOpen(true);
        }}
        onSync={(p) => {
          setPaymentToSync(p);
          setIsSyncAlertOpen(true);
        }}
        onCancel={(p) => {
          setPaymentToCancel(p);
          setIsCancelDialogOpen(true);
        }}
        onMarkRefund={(p) => {
          setPaymentToMarkRefund(p);
          setIsMarkRefundDialogOpen(true);
        }}
        onConfirmRefund={(p) => {
          setPaymentToConfirmRefund(p);
          setIsConfirmRefundDialogOpen(true);
        }}
        onTopUp={(p) => {
          setPaymentToTopUp(p);
          setIsTopUpDialogOpen(true);
        }}
        onResolveOverpayment={(p) => {
          setPaymentToResolveOverpayment(p);
          setIsResolveOverpaymentDialogOpen(true);
        }}
      />

      {/* ── Dialog: Xác Nhận Thanh Toán Thủ Công (Hỗ trợ upload ảnh bằng chứng) */}
      <ConfirmPaymentDialog
        payment={paymentToConfirm}
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDialogOpen(open);
          if (!open) setPaymentToConfirm(null);
        }}
        onSubmit={handleConfirmPayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />

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

      {/* ── Dialog: Hủy Giao Dịch Chờ (Hỗ trợ upload ảnh chứng từ) ────────── */}
      <CancelPaymentDialog
        payment={paymentToCancel}
        open={isCancelDialogOpen}
        onOpenChange={(open) => {
          setIsCancelDialogOpen(open);
          if (!open) setPaymentToCancel(null);
        }}
        onSubmit={handleCancelPayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />

      {/* ── Dialog: Đánh Dấu Hoàn Tiền B1 (Hỗ trợ upload ảnh chứng từ) ─────── */}
      <MarkRefundDialog
        payment={paymentToMarkRefund}
        open={isMarkRefundDialogOpen}
        onOpenChange={(open) => {
          setIsMarkRefundDialogOpen(open);
          if (!open) setPaymentToMarkRefund(null);
        }}
        onSubmit={handleMarkRefundPayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />

      {/* ── Dialog: Xác Nhận Đã Hoàn Tiền B2 (Hỗ trợ upload ủy nhiệm chi) ──── */}
      <ConfirmRefundDialog
        payment={paymentToConfirmRefund}
        open={isConfirmRefundDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmRefundDialogOpen(open);
          if (!open) setPaymentToConfirmRefund(null);
        }}
        onSubmit={handleConfirmRefundPayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />

      {/* ── Dialog: Tạo Link Nộp Tiền Bổ Sung (Top-up) ─────────────────────── */}
      <TopUpDialog
        payment={paymentToTopUp}
        open={isTopUpDialogOpen}
        onOpenChange={(open) => {
          setIsTopUpDialogOpen(open);
          if (!open) setPaymentToTopUp(null);
        }}
        onSubmit={handleTopUpPayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />

      {/* ── Dialog: Xử Lý Nộp Thừa Tiền (Overpayment) ───────────────────────── */}
      <ResolveOverpaymentDialog
        payment={paymentToResolveOverpayment}
        open={isResolveOverpaymentDialogOpen}
        onOpenChange={(open) => {
          setIsResolveOverpaymentDialogOpen(open);
          if (!open) setPaymentToResolveOverpayment(null);
        }}
        onSubmit={handleResolveOverpayment}
        isSubmitting={actionFetcher.state === "submitting"}
        token={token}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
}
