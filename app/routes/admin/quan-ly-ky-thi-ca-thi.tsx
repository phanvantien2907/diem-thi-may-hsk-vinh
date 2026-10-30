import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  type ShouldRevalidateFunctionArgs,
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/quan-ly-ky-thi-ca-thi";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import {
  canClosePeriodRegistration,
  canCloseSessionRegistration,
  canPeriod,
  canSession,
  getPeriodDuplicateBlockReason,
  getPeriodLockReason,
  getPeriodRescheduleBlockReason,
  getPeriodStatusDetails,
  getSessionLockReason,
  getSessionStatusDetails,
  isSessionExpired,
} from "~/lib/exam-status";
import type {
  ApiResponse,
  ExamPeriod,
  ExamPeriodStatus,
  ExamPublicationStatus,
  ExamSession,
  ExamSessionStatus,
  ExamShift,
  ExamType,
} from "~/types/exam";
import { CreatePeriodDialog } from "~/components/dashboard/CreatePeriodDialog";
import { EditPeriodDialog } from "~/components/dashboard/EditPeriodDialog";
import { DuplicatePeriodDialog } from "~/components/dashboard/DuplicatePeriodDialog";
import { ReschedulePeriodDialog } from "~/components/dashboard/ReschedulePeriodDialog";
import {
  CloseRegistrationAlertDialog,
  type CloseRegistrationTarget,
} from "~/components/dashboard/CloseRegistrationAlertDialog";
import {
  ReopenRegistrationDialog,
  type ReopenRegistrationTarget,
} from "~/components/dashboard/ReopenRegistrationDialog";
import { SessionCompletionSafeguardDialog } from "~/components/dashboard/SessionCompletionSafeguardDialog";
import {
  PeriodActionConfirmationDialog,
  type PeriodConfirmationType,
} from "~/components/dashboard/PeriodActionConfirmationDialog";
import { EditSessionDialog } from "~/components/dashboard/EditSessionDialog";
import { PeriodDetailDialog } from "~/components/dashboard/PeriodDetailDialog";
import { useDebouncedCallback, useThrottledCallback } from "~/hooks/use-debounce";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
import {
  CalendarDaysIcon,
  CalendarIcon,
  CalendarClockIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  FilterIcon,
  GlobeIcon,
  InfoIcon,
  LayersIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  SunIcon,
  SunsetIcon,
  MoonIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  BuildingIcon,
  DatabaseIcon,
  AlertTriangleIcon,
  LockIcon,
  Trash2Icon,
} from "lucide-react";

const PAGE_SIZE = 10;

// ─── Zod Schema Tạo Ca Thi ──────────────────────────────────────────────────
const createSessionSchema = z
  .object({
    exam_type_id: z.coerce.number().int().min(1, "Vui lòng chọn loại kỳ thi"),
    period_id: z.coerce.number().int().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng chọn ngày thi hợp lệ"),
    shift: z.enum(["morning", "afternoon"]),
    capacity: z.coerce.number().int().min(1, "Số slot tiếp nhận phải lớn hơn 0"),
    fee: z.coerce.number().int().min(0, "Lệ phí không được là số âm"),
    registration_deadline: z.string().min(1, "Vui lòng chọn thời hạn đăng ký"),
    publication_status: z
      .enum(["published", "draft", "scheduled"])
      .default("published"),
    publish_at: z.string().optional(),
    check_in_at: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publication_status === "scheduled") {
        return !!data.publish_at && data.publish_at.trim().length > 0;
      }
      return true;
    },
    {
      message: "Vui lòng chọn thời điểm công khai khi lên lịch",
      path: ["publish_at"],
    }
  );

type CreateSessionInput = z.input<typeof createSessionSchema>;
type CreateSessionValues = z.output<typeof createSessionSchema>;
type SessionAction = { success?: boolean; message?: string; error?: string };

function getData<T>(json: ApiResponse<T>): T {
  return json.data;
}

// ─── Định dạng ngày giờ chuẩn BẮT BUỘC theo Project Rules (Rule 6) ────────────
// Định dạng chuẩn: dd/MM/yyyy và dd/MM/yyyy HH:mm:ss (hoặc dd/MM/yyyy HH:mm)
function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(
  value: string | null | undefined,
  includeSeconds = false
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (!includeSeconds) {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatCurrency(value: number): string {
  if (value === 0) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getShiftDetails(shift: ExamShift) {
  switch (shift) {
    case "morning":
      return {
        label: "Ca Sáng",
        timeRange: "08:30 - 11:30",
        icon: SunIcon,
        className:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      };
    case "afternoon":
      return {
        label: "Ca Chiều",
        timeRange: "13:30 - 16:30",
        icon: SunsetIcon,
        className:
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
      };
    case "evening":
      return {
        label: "Ca Tối",
        timeRange: "18:00 - 21:00",
        icon: MoonIcon,
        className:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
      };
  }
}

function getStatusDetails(
  status: ExamSessionStatus | string,
  isExpired?: boolean,
  closedReason?: string | null
) {
  const reason = isExpired ? "deadline" : closedReason;
  return getSessionStatusDetails(status, reason);
}

function getPublicationStatusDetails(
  status?: ExamPublicationStatus | string | null
) {
  switch (status) {
    case "draft":
      return {
        label: "Bản nháp",
        variant: "secondary" as const,
        badgeClass:
          "bg-muted text-muted-foreground border-border dark:bg-muted/60",
      };
    case "scheduled":
      return {
        label: "Lên lịch",
        variant: "outline" as const,
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
      };
    case "published":
    default:
      return {
        label: "Công khai",
        variant: "outline" as const,
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
      };
  }
}

// ─── React Router v7 Loader ─────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  const url = new URL(request.url);
  const examTypeId = url.searchParams.get("exam_type_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const params = new URLSearchParams();
  if (examTypeId) params.set("exam_type_id", examTypeId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const [sessionsResponse, examTypesResponse, periodsResponse] = await Promise.all([
    fetch(
      `${API_BASE_URL}/api/v1/admin/exam-sessions${params.size ? `?${params}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ),
    fetch(`${API_BASE_URL}/api/v1/exam-types`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${API_BASE_URL}/api/v1/admin/exam-periods`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
  ]);

  if (!sessionsResponse.ok || !examTypesResponse.ok) {
    throw new Response("Không thể tải dữ liệu ca thi từ máy chủ.", {
      status: 502,
    });
  }

  const [sessionsJson, examTypesJson, periodsJson] = await Promise.all([
    sessionsResponse.json() as Promise<ApiResponse<ExamSession[]>>,
    examTypesResponse.json() as Promise<ApiResponse<ExamType[]>>,
    periodsResponse && periodsResponse.ok
      ? (periodsResponse.json() as Promise<ApiResponse<ExamPeriod[]>>)
      : Promise.resolve({ success: true, data: [], error: null, meta: null } as ApiResponse<ExamPeriod[]>),
  ]);

  return {
    user,
    token,
    periods: getData(periodsJson) ?? [],
    sessions: getData(sessionsJson) ?? [],
    examTypes: getData(examTypesJson) ?? [],
  };
}

// ─── React Router v7 ShouldRevalidate (Tối ưu chuyển tab & lọc không reload) ──
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  // Điều hướng sang trang hoặc route khác thì giữ nguyên hành vi mặc định
  if (currentUrl.pathname !== nextUrl.pathname) {
    return defaultShouldRevalidate;
  }

  // Luôn revalidate khi có thao tác Form/Action (POST, PUT, DELETE, PATCH)
  if (formMethod && formMethod.toUpperCase() !== "GET") {
    return true;
  }

  // Khi người dùng bấm nút làm mới thủ công (URL không đổi)
  if (currentUrl.href === nextUrl.href) {
    return defaultShouldRevalidate;
  }

  // Chỉ revalidate khi các query param tải dữ liệu từ máy chủ thay đổi
  const curParams = currentUrl.searchParams;
  const nextParams = nextUrl.searchParams;

  if (
    curParams.get("exam_type_id") !== nextParams.get("exam_type_id") ||
    curParams.get("from") !== nextParams.get("from") ||
    curParams.get("to") !== nextParams.get("to")
  ) {
    return true;
  }

  // Chuyển tab ("tab"), chuyển trang ("page"), tìm kiếm ("q"), lọc ("status", "period_status",...)
  // xử lý hoàn toàn phía Client, không gửi request tải lại dữ liệu từ Backend
  return false;
}

// ─── React Router v7 Action ─────────────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAdminAuth(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const periodId = String(formData.get("period_id") ?? "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let endpoint = "";
  let method = "POST";
  let body: string | undefined;

  if (intent === "create") {
    endpoint = "/api/v1/admin/exam-sessions/batch-create";
    const examTypeId = Number(formData.get("exam_type_id"));
    const periodIdVal = formData.get("period_id") ? Number(formData.get("period_id")) : undefined;
    const date = String(formData.get("date"));
    const shift = String(formData.get("shift"));
    const capacity = Number(formData.get("capacity"));
    const fee = Number(String(formData.get("fee") ?? "0").replace(/\D/g, ""));
    const regDeadlineRaw = String(formData.get("registration_deadline"));
    const publicationStatus = String(
      formData.get("publication_status") || "published"
    );
    const publishAtRaw = formData.get("publish_at")
      ? String(formData.get("publish_at"))
      : "";
    const checkInAtRaw = formData.get("check_in_at")
      ? String(formData.get("check_in_at"))
      : "";

    const sessionPayload: Record<string, unknown> = {
      exam_type_id: examTypeId,
      date,
      shift,
      capacity,
      fee,
      registration_deadline: regDeadlineRaw
        ? new Date(regDeadlineRaw).toISOString()
        : "",
      exam_session_publication_status: publicationStatus,
    };
    if (periodIdVal) {
      sessionPayload.period_id = periodIdVal;
    }
    if (publicationStatus === "scheduled" && publishAtRaw) {
      sessionPayload.exam_session_publish_at = new Date(publishAtRaw).toISOString();
    }
    if (checkInAtRaw) {
      sessionPayload.exam_session_check_in_at = new Date(checkInAtRaw).toISOString();
    }

    body = JSON.stringify({
      sessions: [sessionPayload],
    });
  } else if (intent === "cancel" && sessionId) {
    const sessionStatus = String(formData.get("session_status") ?? "");
    // Locking Rule: Tuyệt đối chặn hủy khi ca thi đã đóng đăng ký. Lịch thi là bất biến (immutable).
    if (sessionStatus === "closed") {
      return {
        error:
          "Ca thi đã đóng đăng ký; lịch thi và slot thi là bất biến (immutable), bị khóa hoàn toàn. Không thể hủy ca thi đã đóng.",
      } satisfies SessionAction;
    }
    if (sessionStatus === "completed" || sessionStatus === "cancelled") {
      return {
        error: "Không thể hủy ca thi đã kết thúc hoặc đã bị hủy.",
      } satisfies SessionAction;
    }
    if (sessionStatus === "draft" || sessionStatus === "scheduled") {
      endpoint = `/api/v1/admin/exam-sessions/${sessionId}/draft`;
      method = "DELETE";
    } else if (sessionStatus === "open") {
      // Cancellation Restriction: Ca thi chỉ có thể bị hủy nếu trạng thái hiện tại là registration open.
      endpoint = `/api/v1/admin/exam-sessions/${sessionId}/cancel`;
      method = "POST";
    } else {
      return {
        error: "Chỉ có thể hủy ca thi khi đang ở trạng thái mở đăng ký (registration open).",
      } satisfies SessionAction;
    }
  } else if (
    (intent === "update-publication-status" ||
      intent === "publish-session" ||
      intent === "schedule-publish-session" ||
      intent === "unpublish-session") &&
    sessionId
  ) {
    const pubStatus = String(formData.get("publication_status") || "published");
    const pubAt = formData.get("publish_at") ? String(formData.get("publish_at")) : "";
    const currentPubStatusClient = String(formData.get("current_publication_status") ?? "");
    const sessionStatus = String(formData.get("session_status") ?? "");

    // Strict State Transition 1: Ca thi đang 'open' tuyệt đối không được hoàn tác về 'draft'.
    if ((intent === "unpublish-session" || pubStatus === "draft") && sessionStatus === "open") {
      return {
        error: "Ca thi đang ở trạng thái mở đăng ký (registration open) không thể hoàn tác về bản nháp.",
      } satisfies SessionAction;
    }

    // Strict State Transition 2: Chỉ ca thi đang ở trạng thái bản nháp (draft) mới có thể chuyển sang mở đăng ký.
    if (
      (intent === "publish-session" || (intent === "update-publication-status" && pubStatus === "published")) &&
      sessionStatus &&
      sessionStatus !== "draft"
    ) {
      return {
        error: "Chỉ ca thi đang ở trạng thái bản nháp (draft) mới có thể chuyển sang mở đăng ký.",
      } satisfies SessionAction;
    }

    if (currentPubStatusClient === "published" && pubStatus === "scheduled") {
      return {
        error: "Ca thi đã được công khai trên hệ thống. Không thể lên lịch hẹn giờ cho ca thi đã công khai.",
      } satisfies SessionAction;
    }

    if (pubStatus === "scheduled" || intent === "schedule-publish-session") {
      endpoint = `/api/v1/admin/exam-sessions/${sessionId}/schedule-publish`;
      method = "POST";
      if (!pubAt || pubAt.trim() === "") {
        return {
          error: "Vui lòng chọn thời điểm công khai khi lên lịch.",
        } satisfies SessionAction;
      }
      const pubTime = new Date(pubAt).getTime();
      if (isNaN(pubTime) || pubTime <= Date.now()) {
        return {
          error: "Thời điểm công khai phải ở tương lai.",
        } satisfies SessionAction;
      }
      body = JSON.stringify({ publish_at: new Date(pubAt).toISOString() });
    } else if (pubStatus === "draft" || intent === "unpublish-session") {
      endpoint = `/api/v1/admin/exam-sessions/${sessionId}/unpublish`;
      method = "POST";
    } else {
      endpoint = `/api/v1/admin/exam-sessions/${sessionId}/publish`;
      method = "POST";
    }
  } else if (intent === "reopen-session-registration" && sessionId) {
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/reopen-registration`;
    method = "POST";
    const regDeadlineRaw = formData.get("registration_deadline");
    const closedReason = String(formData.get("closed_reason") ?? "");

    if (regDeadlineRaw && String(regDeadlineRaw).trim()) {
      const parsed = new Date(String(regDeadlineRaw));
      if (isNaN(parsed.getTime())) {
        return { error: "Hạn đăng ký mới không hợp lệ." } satisfies SessionAction;
      }
      if (parsed.getTime() <= Date.now()) {
        return { error: "Hạn đăng ký mới phải ở tương lai." } satisfies SessionAction;
      }
      body = JSON.stringify({ registration_deadline: parsed.toISOString() });
    } else {
      if (closedReason === "deadline") {
        return {
          error: "Ca thi đóng do hết hạn đăng ký, bắt buộc phải cung cấp hạn chót mới ở tương lai.",
        } satisfies SessionAction;
      }
      body = JSON.stringify({});
    }
  } else if (intent === "update-session-capacity" && sessionId) {
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/capacity`;
    method = "POST";
    const capacity = Number(formData.get("capacity"));
    const reason = formData.get("reason") ? String(formData.get("reason")) : undefined;
    body = JSON.stringify({ capacity, ...(reason ? { reason } : {}) });
  } else if (intent === "create-period") {
    endpoint = "/api/v1/admin/exam-periods";
    method = "POST";
    const name = String(formData.get("name") ?? "");
    const code = String(formData.get("code") ?? "");
    const startDate = formData.get("start_date") ? String(formData.get("start_date")) : null;
    const endDate = formData.get("end_date") ? String(formData.get("end_date")) : null;
    const regStart = formData.get("registration_start") ? new Date(String(formData.get("registration_start"))).toISOString() : null;
    const regDeadline = formData.get("registration_deadline") ? new Date(String(formData.get("registration_deadline"))).toISOString() : null;
    const description = formData.get("description") ? String(formData.get("description")) : null;
    const instructions = formData.get("instructions") ? String(formData.get("instructions")) : null;
    const status = String(formData.get("status") || "draft");

    body = JSON.stringify({
      name,
      code,
      start_date: startDate,
      end_date: endDate,
      registration_start: regStart,
      registration_deadline: regDeadline,
      description,
      instructions,
      status,
    });
  } else if (intent === "update-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}`;
    method = "PUT";
    const name = String(formData.get("name") ?? "");
    const code = String(formData.get("code") ?? "");
    const startDate = formData.get("start_date") ? String(formData.get("start_date")) : null;
    const endDate = formData.get("end_date") ? String(formData.get("end_date")) : null;
    const regStart = formData.get("registration_start") ? new Date(String(formData.get("registration_start"))).toISOString() : null;
    const regDeadline = formData.get("registration_deadline") ? new Date(String(formData.get("registration_deadline"))).toISOString() : null;
    const description = formData.get("description") ? String(formData.get("description")) : null;
    const instructions = formData.get("instructions") ? String(formData.get("instructions")) : null;
    const status = formData.get("status") ? String(formData.get("status")) : undefined;

    body = JSON.stringify({
      name,
      code,
      start_date: startDate,
      end_date: endDate,
      registration_start: regStart,
      registration_deadline: regDeadline,
      description,
      instructions,
      ...(status ? { status } : {}),
    });
  } else if (intent === "publish-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/publish`;
    method = "POST";
  } else if (intent === "unpublish-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/unpublish`;
    method = "POST";
  } else if (intent === "reopen-period-registration" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/reopen-registration`;
    method = "POST";
    const regDeadlineRaw = formData.get("registration_deadline");
    if (!regDeadlineRaw || !String(regDeadlineRaw).trim()) {
      return {
        error: "Vui lòng nhập hạn chót đăng ký mới ở tương lai để mở lại đợt thi.",
      } satisfies SessionAction;
    }
    const parsed = new Date(String(regDeadlineRaw));
    if (isNaN(parsed.getTime())) {
      return { error: "Hạn đăng ký mới không hợp lệ." } satisfies SessionAction;
    }
    if (parsed.getTime() <= Date.now()) {
      return { error: "Hạn đăng ký mới phải ở tương lai." } satisfies SessionAction;
    }
    body = JSON.stringify({ registration_deadline: parsed.toISOString() });
  } else if (intent === "complete-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/complete`;
    method = "POST";
  } else if (intent === "cancel-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/cancel`;
    method = "POST";
    const reason = formData.get("reason") ? String(formData.get("reason")) : "";
    body = JSON.stringify({ reason });
  } else if (intent === "delete-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}`;
    method = "DELETE";
  } else if (intent === "duplicate-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/duplicate`;
    method = "POST";
    const name = String(formData.get("name") ?? "");
    const code = String(formData.get("code") ?? "");
    body = JSON.stringify({ name, code });
  } else if (intent === "reschedule-period" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/reschedule`;
    method = "POST";
    const newStartDate = String(formData.get("new_start_date") ?? "");
    const newEndDate = String(formData.get("new_end_date") ?? "");
    const newRegDeadline = String(formData.get("new_registration_deadline") ?? "");
    const reason = String(formData.get("reason") ?? "");
    const sendNotification = formData.get("send_notification") !== "false";

    body = JSON.stringify({
      new_start_date: newStartDate,
      ...(newEndDate ? { new_end_date: newEndDate } : {}),
      ...(newRegDeadline ? { new_registration_deadline: newRegDeadline } : {}),
      reason,
      send_notification: sendNotification,
    });
  } else if (intent === "close-period-registration" && periodId) {
    endpoint = `/api/v1/admin/exam-periods/${periodId}/close-registration`;
    method = "POST";
    const reason = String(formData.get("reason") ?? "");
    body = JSON.stringify({ reason });
  } else if (intent === "update-session" && sessionId) {
    const sessionStatus = String(formData.get("session_status") ?? "");
    // Immutability: Một khi ở trạng thái closed, lịch thi và cấu hình là bất biến
    if (sessionStatus === "closed") {
      return {
        error: "Ca thi đã đóng đăng ký; lịch thi và slot thi là bất biến (immutable), không thể chỉnh sửa.",
      } satisfies SessionAction;
    }
    if (sessionStatus === "completed" || sessionStatus === "cancelled") {
      return {
        error: "Không thể chỉnh sửa ca thi đã kết thúc hoặc đã hủy.",
      } satisfies SessionAction;
    }
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}`;
    method = "PUT";
    const date = formData.get("date") ? String(formData.get("date")) : null;
    const shift = String(formData.get("shift") ?? "morning");
    const capacity = Number(formData.get("capacity") ?? 40);
    const fee = Number(String(formData.get("fee") ?? "0").replace(/\D/g, ""));
    const regDeadlineRaw = formData.get("registration_deadline") ? String(formData.get("registration_deadline")) : null;
    const publicationStatus = String(formData.get("exam_session_publication_status") || "published");
    const publishAtRaw = formData.get("exam_session_publish_at") ? String(formData.get("exam_session_publish_at")) : null;

    const payload: Record<string, unknown> = {
      date,
      shift,
      capacity,
      fee,
      registration_deadline: regDeadlineRaw ? new Date(regDeadlineRaw).toISOString() : null,
      exam_session_publication_status: publicationStatus,
    };
    if (publicationStatus === "scheduled" && publishAtRaw) {
      payload.exam_session_publish_at = new Date(publishAtRaw).toISOString();
    }
    body = JSON.stringify(payload);
  } else if (intent === "close-session-registration" && sessionId) {
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/close-registration`;
    method = "POST";
    const reason = String(formData.get("reason") ?? "");
    body = JSON.stringify({ reason });
  } else if (intent === "complete-session" && sessionId) {
    const sessionStatus = String(formData.get("session_status") ?? "");
    if (sessionStatus === "completed") {
      return {
        error: "Ca thi đã ở trạng thái hoàn tất.",
      } satisfies SessionAction;
    }
    if (sessionStatus !== "open" && sessionStatus !== "closed") {
      return {
        error: "Chỉ có thể hoàn tất ca thi đang mở đăng ký hoặc đã đóng đăng ký.",
      } satisfies SessionAction;
    }
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/complete`;
    method = "POST";
  } else if (intent === "clear-cache") {
    endpoint = "/api/v1/admin/exam-sessions/clear-cache";
  } else {
    return { error: "Thao tác không hợp lệ." } satisfies SessionAction;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body } : {}),
  });

  const json = (await response.json().catch(() => null)) as
    | ApiResponse<unknown>
    | { message?: string; error?: string; msg?: string; code?: string }
    | null;

  if (!response.ok) {
    let errMsg = "Thao tác không thành công. Vui lòng thử lại sau.";
    if (json && "msg" in json && typeof json.msg === "string" && json.msg) {
      errMsg = json.msg;
    } else if (json && "error" in json && typeof json.error === "string" && json.error) {
      errMsg = json.error;
    } else if (json && "message" in json && typeof json.message === "string" && json.message) {
      errMsg = json.message;
    } else if (response.status === 409) {
      errMsg =
        intent === "update-session"
          ? "Ca thi đã ở trạng thái đã công khai hoặc đã có thí sinh đăng ký; không thể thay đổi trực tiếp ngày thi hoặc cấu hình. Vui lòng sử dụng tính năng Dời lịch thi (Reschedule)."
          : "Xung đột dữ liệu (HTTP 409): Không thể thực hiện chuyển đổi trạng thái này theo quy định nghiệp vụ.";
    }
    return { error: errMsg } satisfies SessionAction;
  }

  // Tự động xóa bộ nhớ đệm ca thi & đợt thi trên Redis
  fetch(`${API_BASE_URL}/api/v1/admin/exam-sessions/clear-cache`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch((err) => console.warn("[action] Lỗi khi tự động xóa cache Redis:", err));

  return {
    success: true,
    message:
      intent === "create"
        ? "Đã tạo ca thi mới thành công."
        : intent === "cancel"
          ? "Đã hủy ca thi thành công."
          : intent === "create-period"
            ? "Đã tạo đợt thi mới thành công."
            : intent === "update-period"
              ? "Cập nhật thông tin đợt thi thành công."
              : intent === "publish-period"
                ? "Đã công bố đợt thi thành công."
                : intent === "unpublish-period"
                  ? "Đã hủy công bố đợt thi về trạng thái nháp."
                  : intent === "reopen-period-registration"
                    ? "Đã mở lại đăng ký đợt thi thành công."
                    : intent === "complete-period"
                      ? "Đã hoàn tất đợt thi thành công."
                      : intent === "cancel-period"
                        ? "Đã hủy đợt thi thành công."
                        : intent === "delete-period"
                          ? "Đã xóa bản nháp đợt thi thành công."
                          : intent === "duplicate-period"
                            ? "Nhân bản đợt thi (ACID) thành công. Các ca thi con đã được khởi tạo ở trạng thái bản nháp an toàn."
                            : intent === "reschedule-period"
                              ? "Đã dời lịch thi bất khả kháng thành công. Các ca thi con và thí sinh đã được cập nhật."
                              : intent === "close-period-registration"
                                ? "Đã đóng đăng ký sớm cho đợt thi thành công."
                                : intent === "update-session"
                                  ? "Cập nhật ca thi thành công."
                                  : intent === "close-session-registration"
                                    ? "Đã đóng đăng ký sớm cho ca thi thành công."
                                    : intent === "complete-session"
                                      ? "Đã hoàn tất ca thi thành công."
                                      : intent === "reopen-session-registration"
                                      ? "Đã mở lại đăng ký ca thi thành công."
                                      : intent === "update-session-capacity"
                                        ? "Đã cập nhật sĩ số ca thi thành công."
                                        : intent === "clear-cache"
                                          ? (json && "data" in json && typeof (json.data as { message?: string })?.message === "string"
                                            ? (json.data as { message?: string }).message
                                            : "Đã làm mới bộ nhớ đệm thành công.")
                                          : "Cập nhật trạng thái thành công.",
  } satisfies SessionAction;
}

// ─── Modal Dialog: Tạo Ca Thi Mới ───────────────────────────────────────────
function SessionCreateDialog({
  examTypes,
  periods,
}: {
  examTypes: ExamType[];
  periods?: ExamPeriod[];
}) {
  const fetcher = useFetcher<SessionAction>();
  const [open, setOpen] = React.useState(false);
  const [displayFee, setDisplayFee] = React.useState("");

  const form = useForm<CreateSessionInput, unknown, CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      shift: "morning",
      capacity: 40,
      fee: 0,
      date: "",
      registration_deadline: "",
      publication_status: "published",
      publish_at: "",
      check_in_at: "",
    },
  });

  const publicationStatus = form.watch("publication_status");

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplayFee("");
      form.setValue("fee", 0, { shouldValidate: true });
      return;
    }
    const num = parseInt(digits, 10);
    const formatted = new Intl.NumberFormat("vi-VN").format(num);
    setDisplayFee(formatted);
    form.setValue("fee", num, { shouldValidate: true });
  };

  const submit = (values: CreateSessionValues) => {
    fetcher.submit(
      {
        ...values,
        period_id: values.period_id ? String(values.period_id) : "",
        fee: String(values.fee),
        intent: "create",
      },
      { method: "post", encType: "application/x-www-form-urlencoded" }
    );
  };

  React.useEffect(() => {
    if (open) {
      const currentFee = form.getValues("fee");
      setDisplayFee(
        currentFee
          ? new Intl.NumberFormat("vi-VN").format(Number(currentFee))
          : ""
      );
    }
  }, [open, form]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Tạo ca thi thành công",
        description: fetcher.data.message,
      });
      setOpen(false);
      form.reset();
      setDisplayFee("");
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể tạo ca thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, form]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full cursor-pointer hover:bg-primary/90 shadow-2xs font-medium">
            <PlusIcon className="size-4 mr-1.5" />
            Tạo ca thi mới
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-primary border-primary/20 bg-primary/5"
            >
              Tạo mới
            </Badge>
            <span className="text-xs text-muted-foreground">• Phân bổ ca thi</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Khởi tạo Ca thi HSK máy tính
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Điền đầy đủ thông tin kỳ thi, số slot và thiết lập thời gian biểu cho ca thi.
          </DialogDescription>
        </DialogHeader>

        <Form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Loại kỳ thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="exam_type_id"
                  className="text-xs font-semibold text-foreground"
                >
                  Loại kỳ thi <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="exam_type_id"
                  value={
                    form.watch("exam_type_id")
                      ? String(form.watch("exam_type_id"))
                      : ""
                  }
                  onValueChange={(value) =>
                    form.setValue("exam_type_id", Number(value), {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="exam_type_id"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn loại kỳ thi HSK">
                      {(val) => {
                        const current = val ?? form.watch("exam_type_id");
                        if (!current) return "Chọn loại kỳ thi HSK";
                        const matched = examTypes.find(
                          (type) => String(type.id) === String(current)
                        );
                        return matched ? matched.name : "Chọn loại kỳ thi HSK";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      {examTypes.map((type) => (
                        <SelectItem
                          key={type.id}
                          value={String(type.id)}
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          <span className="font-medium">{type.name}</span>
                          {type.code ? (
                            <span className="text-muted-foreground text-[11px] ml-1.5">
                              ({type.code})
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {form.formState.errors.exam_type_id && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.exam_type_id.message}
                  </p>
                )}
              </div>

              {/* Thuộc Đợt thi (Tùy chọn) */}
              {periods && periods.length > 0 && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label
                    htmlFor="period_id"
                    className="text-xs font-semibold text-foreground flex items-center gap-1"
                  >
                    <span>Thuộc Đợt thi</span>
                    <span className="text-[11px] text-muted-foreground font-normal">(Tùy chọn theo mô hình 2 tầng)</span>
                  </Label>
                  <Select
                    name="period_id"
                    value={
                      form.watch("period_id")
                        ? String(form.watch("period_id"))
                        : "none"
                    }
                    onValueChange={(val) => {
                      form.setValue(
                        "period_id",
                        val === "none" ? undefined : Number(val)
                      );
                    }}
                  >
                    <SelectTrigger
                      id="period_id"
                      className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                    >
                      <SelectValue placeholder="Không gắn đợt thi cụ thể">
                        {(val) => {
                          const current = val ?? form.watch("period_id");
                          if (!current || current === "none") return "Không gắn đợt thi cụ thể";
                          const matched = periods.find(
                            (p) => String(p.id) === String(current)
                          );
                          return matched ? `${matched.code} - ${matched.name}` : "Không gắn đợt thi cụ thể";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectGroup>
                        <SelectItem value="none" className="cursor-pointer text-xs sm:text-sm">
                          Không gắn đợt thi cụ thể
                        </SelectItem>
                        {periods.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={String(p.id)}
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            <span className="font-semibold">{p.code}</span> — {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Ngày thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="date"
                  className="text-xs font-semibold text-foreground"
                >
                  Ngày thi tổ chức <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={todayStr}
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              {/* Buổi thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="shift"
                  className="text-xs font-semibold text-foreground"
                >
                  Buổi thi <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="shift"
                  defaultValue="morning"
                  onValueChange={(value) =>
                    form.setValue("shift", value as "morning" | "afternoon")
                  }
                >
                  <SelectTrigger
                    id="shift"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn buổi thi">
                      {(val) => {
                        const current = val ?? form.watch("shift");
                        if (current === "morning")
                          return "Buổi sáng (08:30 - 11:30)";
                        if (current === "afternoon")
                          return "Buổi chiều (13:30 - 16:30)";
                        return "Buổi sáng (08:30 - 11:30)";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem
                        value="morning"
                        className="cursor-pointer text-xs sm:text-sm"
                      >
                        Buổi sáng (08:30 - 11:30)
                      </SelectItem>
                      <SelectItem
                        value="afternoon"
                        className="cursor-pointer text-xs sm:text-sm"
                      >
                        Buổi chiều (13:30 - 16:30)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Giờ thí sinh có mặt */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="check_in_at"
                  className="text-xs font-semibold text-foreground"
                >
                  Giờ có mặt
                </Label>
                <Input
                  id="check_in_at"
                  type="datetime-local"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("check_in_at")}
                />
              </div>

              {/* Số slot */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="capacity"
                    className="text-xs font-semibold text-foreground"
                  >
                    Số slot <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("capacity")}
                />
                {form.formState.errors.capacity && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.capacity.message}
                  </p>
                )}
              </div>

              {/* Lệ phí */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="fee"
                    className="text-xs font-semibold text-foreground"
                  >
                    Lệ phí thi (VNĐ) <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] font-medium text-primary">
                    {displayFee ? `${displayFee} đ` : "0 đ"}
                  </span>
                </div>
                <input type="hidden" {...form.register("fee")} />
                <Input
                  id="fee"
                  type="text"
                  inputMode="numeric"
                  value={displayFee}
                  onChange={handleFeeChange}
                  placeholder="Ví dụ: 1.330.000"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm font-medium"
                />
                {form.formState.errors.fee && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.fee.message}
                  </p>
                )}
              </div>
            </div>

            {/* Hạn đăng ký */}
            {/* Hạn chót tiếp nhận hồ sơ */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="registration_deadline"
                className="text-xs font-semibold text-foreground"
              >
                Hạn chót tiếp nhận hồ sơ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                className="h-9 rounded-full px-3 text-xs sm:text-sm"
                {...form.register("registration_deadline")}
              />
              <p className="text-[11px] text-muted-foreground">
                Hệ thống sẽ tự động khóa nhận đăng ký mới khi đến thời điểm này.
              </p>
              {form.formState.errors.registration_deadline && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                  <AlertTriangleIcon className="size-3" />
                  {form.formState.errors.registration_deadline.message}
                </p>
              )}
            </div>

            {/* Trạng thái công khai */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="publication_status"
                className="text-xs font-semibold text-foreground"
              >
                Trạng thái hiển thị ca thi <span className="text-destructive">*</span>
              </Label>
              <Select
                name="publication_status"
                value={form.watch("publication_status")}
                onValueChange={(value) =>
                  form.setValue(
                    "publication_status",
                    value as "published" | "draft" | "scheduled",
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger
                  id="publication_status"
                  className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                >
                  <SelectValue placeholder="Chọn trạng thái công khai">
                    {(val) => {
                      const current = val ?? form.watch("publication_status");
                      if (current === "published")
                        return "Công khai ngay";
                      if (current === "draft")
                        return "Bản nháp";
                      if (current === "scheduled")
                        return "Lên lịch công khai";
                      return "Công khai ngay";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    <SelectItem
                      value="published"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Công khai ngay
                    </SelectItem>
                    <SelectItem
                      value="draft"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Bản nháp
                    </SelectItem>
                    <SelectItem
                      value="scheduled"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Lên lịch công khai
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Thời điểm công khai nếu chọn scheduled */}
            {publicationStatus === "scheduled" && (
              <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-sky-200/70 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/60">
                <Label
                  htmlFor="publish_at"
                  className="text-xs font-semibold text-foreground"
                >
                  Thời gian công khai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="publish_at"
                  type="datetime-local"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm bg-background"
                  {...form.register("publish_at")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ tự động chuyển ca thi sang trạng thái công khai cho thí sinh vào thời điểm này.
                </p>
                {form.formState.errors.publish_at && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.publish_at.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full cursor-pointer hover:bg-muted text-xs sm:text-sm"
              onClick={() => setOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="rounded-full cursor-pointer hover:bg-primary/90 text-xs sm:text-sm"
            >
              {fetcher.state === "submitting" ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                "Tạo ca thi"
              )}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Kiểm tra ràng buộc khóa phát hành ck_exam_publish_needs_date_slots theo API v1.2.3 (§4.19)
function canPublishSession(session: ExamSession | null | undefined): boolean {
  if (!session) return false;
  return Boolean(
    session.date &&
    session.date.trim() !== "" &&
    session.registration_deadline &&
    session.registration_deadline.trim() !== "" &&
    session.capacity !== null &&
    session.capacity > 0
  );
}

// ─── Modal Dialog: Xem Chi Tiết Ca Thi ──────────────────────────────────────
function SessionDetailDialog({
  session,
  examType,
  open,
  onOpenChange,
  onCancelSession,
  onOpenPublishSchedule,
  onPublishNow,
  onCompleteSession,
  parentPeriod,
}: {
  session: ExamSession | null;
  parentPeriod?: ExamPeriod;
  examType?: ExamType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelSession: (session: ExamSession) => void;
  onOpenPublishSchedule?: (session: ExamSession) => void;
  onPublishNow?: (session: ExamSession) => void;
  onCompleteSession?: (session: ExamSession) => void;
}) {
  if (!session) return null;

  const isExpired = isSessionExpired(session);
  const lockReason = getSessionLockReason(session, parentPeriod);
  const isLocked = lockReason !== null;
  const shiftInfo = getShiftDetails(session.shift);
  const statusInfo = getSessionStatusDetails(session.status, session.closed_reason);
  const pubStatusInfo = getPublicationStatusDetails(
    session.exam_session_publication_status ??
    (session.status === "open" ? "published" : session.status)
  );
  const ShiftIcon = shiftInfo.icon;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(String(session.id));
    toast.add({
      type: "info",
      title: "Đã sao chép mã ca thi",
      description: `Mã ca thi #${session.id} đã được lưu vào bộ nhớ tạm.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Mã ca #{session.id}
            </Badge>
            <Badge
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
              title={lockReason ?? undefined}
            >
              <span
                className={`size-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.pulse ? "animate-pulse" : ""
                  }`}
              />
              {statusInfo.label}
              {statusInfo.subLabel && (
                <span className="text-[10px] opacity-80">({statusInfo.subLabel})</span>
              )}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {examType?.name ?? `Kỳ thi HSK #${session.exam_type_id}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {examType?.description ??
              "Hệ thống thi trắc nghiệm trên máy tính chuẩn khảo thí quốc tế HSK."}
          </DialogDescription>
        </DialogHeader>

        {isLocked && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 flex items-start gap-2.5">
            <LockIcon className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-200">
                {session.status === "cancelled"
                  ? "Ca thi đã bị hủy"
                  : session.status === "closed"
                    ? "Ca thi đã đóng đăng ký"
                    : "Ca thi đã khóa chỉnh sửa"}
              </p>
              <p className="mt-0.5 text-xs text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                {lockReason} Hệ thống không cho phép công khai hoặc điều chỉnh thông tin ca thi ở trạng thái này.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {/* Card thông tin thời gian */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-primary" />
              Lịch thi & Ca thi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Ngày tổ chức thi</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {formatDateOnly(session.date)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Buổi thi & Khung giờ</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium border flex items-center gap-1 ${shiftInfo.className}`}
                  >
                    <ShiftIcon className="size-3" />
                    {shiftInfo.label} ({shiftInfo.timeRange})
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Giờ thí sinh có mặt</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-sky-500" />
                  {session.exam_session_check_in_at
                    ? formatDateTime(session.exam_session_check_in_at, false)
                    : "Theo thông báo ca thi"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Hạn chót tiếp nhận hồ sơ</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-amber-500" />
                  {formatDateTime(session.registration_deadline, false)}
                </p>
              </div>
            </div>
          </div>

          {/* Card thông tin slot, lệ phí & công khai */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="size-3.5 text-primary" />
              Chỉ tiêu & Thông tin vận hành
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Số slot tiếp nhận</p>
                <p className="font-semibold text-foreground mt-1 flex items-center gap-1.5">
                  <UsersIcon className="size-3.5 text-primary" />
                  {session.capacity} thí sinh
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Lệ phí đăng ký</p>
                <p className="font-bold text-foreground text-sm sm:text-base mt-0.5">
                  {formatCurrency(session.fee)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Trạng thái phát hành</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-muted-foreground text-xs">Thời gian công khai</p>
                  {canSession(session, "schedule_publish", parentPeriod) && onOpenPublishSchedule && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="rounded-full cursor-pointer hover:bg-muted text-[11px] h-5 px-1.5 font-normal text-primary hover:text-primary"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenPublishSchedule(session);
                      }}
                    >
                      <CalendarClockIcon className="size-3 mr-1 text-primary" />
                      Lên lịch
                    </Button>
                  )}
                </div>
                <p className="font-semibold text-foreground text-xs sm:text-sm mt-1">
                  {session.exam_session_publish_at
                    ? formatDateTime(session.exam_session_publish_at, false)
                    : session.status === "draft"
                      ? "Chưa lên lịch (Bản nháp)"
                      : session.status === "open"
                        ? "Đang công khai"
                        : "Theo lịch hệ thống"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full cursor-pointer hover:bg-muted text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto justify-center"
            onClick={handleCopyId}
          >
            <CopyIcon className="size-3.5 mr-1" />
            Sao chép mã ca
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
            {canSession(session, "complete", parentPeriod) && onCompleteSession && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  onOpenChange(false);
                  onCompleteSession(session);
                }}
              >
                <CheckCircle2Icon className="size-3.5 mr-1 text-emerald-600" />
                Hoàn tất ca thi
              </Button>
            )}
            {canSession(session, "cancel", parentPeriod) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer text-xs text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onCancelSession(session);
                }}
              >
                <XCircleIcon className="size-3.5 mr-1" />
                Hủy ca thi
              </Button>
            )}
            {canSession(session, "delete", parentPeriod) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer text-xs text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onCancelSession(session);
                }}
              >
                <Trash2Icon className="size-3.5 mr-1" />
                Xóa ca thi
              </Button>
            )}
            {canSession(session, "publish", parentPeriod) && onPublishNow && (
              <Button
                type="button"
                size="sm"
                className="rounded-full cursor-pointer text-xs font-medium"
                onClick={() => {
                  onOpenChange(false);
                  onPublishNow(session);
                }}
              >
                <GlobeIcon className="size-3.5 mr-1" />
                Công khai ca thi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Dialog: Xem Chi Tiết & Chỉnh Sửa Ngày Công Khai ─────────────────
interface PublishScheduleDialogProps {
  session: ExamSession | null;
  examTypes: ExamType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishNow?: (session: ExamSession) => void;
  parentPeriod?: ExamPeriod;
}

const updatePublishScheduleSchema = z
  .object({
    publication_status: z.enum(["draft", "scheduled"]),
    publish_at: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publication_status === "scheduled") {
        if (!data.publish_at || data.publish_at.trim().length === 0) {
          return false;
        }
        const time = new Date(data.publish_at).getTime();
        return !isNaN(time) && time > Date.now();
      }
      return true;
    },
    {
      message: "Thời gian công khai phải ở tương lai",
      path: ["publish_at"],
    }
  );

type UpdatePublishScheduleInput = z.input<typeof updatePublishScheduleSchema>;
type UpdatePublishScheduleValues = z.output<typeof updatePublishScheduleSchema>;

function PublishScheduleDialog({
  session,
  examTypes,
  open,
  onOpenChange,
  onPublishNow,
  parentPeriod,
}: PublishScheduleDialogProps) {
  const fetcher = useFetcher<SessionAction>();
  const examType = examTypes.find((t) => t.id === session?.exam_type_id);
  const shiftInfo = session ? getShiftDetails(session.shift) : null;
  const canSchedule = canSession(session, "schedule_publish", parentPeriod);
  const publishLockReason = !canSchedule
    ? session?.status === "open"
      ? "Ca thi đã được công khai trên hệ thống nên không thể lên lịch lại."
      : getSessionLockReason(session, parentPeriod) ?? "Ca thi không cho phép lên lịch ở trạng thái hiện tại."
    : null;
  const isPublishScheduleBlocked = publishLockReason !== null;

  const form = useForm<
    UpdatePublishScheduleInput,
    unknown,
    UpdatePublishScheduleValues
  >({
    resolver: zodResolver(updatePublishScheduleSchema),
    defaultValues: {
      publication_status: "scheduled",
      publish_at: "",
    },
  });

  const selectedPubStatus = form.watch("publication_status");

  React.useEffect(() => {
    if (open && session) {
      if (isPublishScheduleBlocked) {
        toast.add({
          type: "error",
          title: "Không thể chỉnh sửa lịch",
          description:
            publishLockReason ??
            "Ca thi đang ở trạng thái không cho phép lên lịch công khai.",
        });
        onOpenChange(false);
        return;
      }
      const currentPubStatus = session.status === "scheduled" ? "scheduled" : "draft";
      form.reset({
        publication_status: currentPubStatus,
        publish_at: toDateTimeLocalInput(session.exam_session_publish_at),
      });
    }
  }, [open, session, form, onOpenChange, isPublishScheduleBlocked, publishLockReason]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Cập nhật thành công",
        description: fetcher.data.message || "Đã lưu lịch công khai ca thi.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể cập nhật lịch công khai",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!session || isPublishScheduleBlocked) return null;

  const onSubmit = (values: UpdatePublishScheduleValues) => {
    if (isPublishScheduleBlocked) {
      toast.add({
        type: "error",
        title: "Thao tác bị chặn",
        description:
          publishLockReason ??
          "Ca thi đang ở trạng thái không cho phép lên lịch công khai.",
      });
      return;
    }
    fetcher.submit(
      {
        intent: "update-publication-status",
        session_id: String(session.id),
        current_publication_status: session.status || "",
        publication_status: values.publication_status,
        publish_at: values.publish_at || "",
      },
      { method: "post" }
    );
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Mã ca #{session.id}
            </Badge>
            <span className="text-xs text-muted-foreground/60">•</span>
            <Badge
              variant="outline"
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${session.status === "scheduled"
                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60"
                : "bg-muted text-muted-foreground border-border dark:bg-muted/60"
                }`}
            >
              {session.status === "scheduled" ? "Đã lên lịch" : "Bản nháp"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Lịch công khai ca thi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Xem chi tiết ngày công khai và cập nhật lịch phát hành tự động cho ca thi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Tóm tắt ca thi */}
            <div className="rounded-xl border bg-card/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kỳ thi:</span>
                <span className="font-semibold text-foreground">
                  {examType?.name ?? `Kỳ thi #${session.exam_type_id}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ngày thi & Ca:</span>
                <span className="font-medium text-foreground">
                  {formatDateOnly(session.date)} ({shiftInfo?.label})
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Lịch hiện tại:</span>
                <span className="font-semibold text-foreground">
                  {session.exam_session_publish_at
                    ? formatDateTime(session.exam_session_publish_at, true)
                    : "Chưa thiết lập (Bản nháp)"}
                </span>
              </div>
            </div>

            {/* Chỉnh sửa trạng thái & thời gian công khai */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit_pub_status"
                  className="text-xs font-semibold text-foreground"
                >
                  Trạng thái phát hành <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="publication_status"
                  value={selectedPubStatus}
                  onValueChange={(val) =>
                    form.setValue(
                      "publication_status",
                      val as "draft" | "scheduled",
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger
                    id="edit_pub_status"
                    disabled={isSubmitting}
                    className="w-full h-9 rounded-full px-3 text-xs cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn trạng thái">
                      {selectedPubStatus === "scheduled"
                        ? "Lên lịch công khai tự động"
                        : "Lưu làm bản nháp (chưa công khai)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem
                        value="scheduled"
                        className="cursor-pointer text-xs"
                      >
                        Lên lịch công khai tự động
                      </SelectItem>
                      <SelectItem
                        value="draft"
                        className="cursor-pointer text-xs"
                      >
                        Lưu làm bản nháp (chưa công khai)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {selectedPubStatus === "scheduled" && (
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-sky-200/70 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/60">
                  <Label
                    htmlFor="edit_publish_at"
                    className="text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span>
                      Thời gian công khai tự động{" "}
                      <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (Định dạng: Ngày / Giờ)
                    </span>
                  </Label>
                  <Input
                    id="edit_publish_at"
                    type="datetime-local"
                    disabled={isSubmitting}
                    className="h-9 rounded-full px-3 text-xs bg-background"
                    {...form.register("publish_at")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống sẽ tự động chuyển ca thi này sang trạng thái công khai vào thời điểm đã đặt.
                  </p>
                  {form.formState.errors.publish_at && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangleIcon className="size-3" />
                      {form.formState.errors.publish_at.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {onPublishNow ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-emerald-50 text-emerald-600 border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 text-xs w-full sm:w-auto"
                onClick={() => {
                  onOpenChange(false);
                  onPublishNow(session);
                }}
              >
                <GlobeIcon className="size-3.5 mr-1.5 text-emerald-600" />
                Công khai ngay
              </Button>
            ) : <div />}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs"
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCwIcon className="size-3 mr-1.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Meta Function ──────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Kỳ thi & Ca Thi" },
  {
    name: "description",
    content:
      "Quản lý lịch mở đăng ký, điều phối ca thi và phát hành ca thi HSK máy tính.",
  },
];

// ─── Main Route Component ───────────────────────────────────────────────────
export default function QuanLyKyThiCaThiPage() {
  const { periods, sessions, examTypes } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const actionFetcher = useFetcher<SessionAction>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Subtab: "periods" | "sessions" (đồng bộ mượt mà không delay)
  const tabParam = (searchParams.get("tab") as "periods" | "sessions") || "periods";
  const [activeTab, setActiveTab] = React.useState<"periods" | "sessions">(tabParam);

  React.useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Common Search & Page state
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  // Period Filters state
  const periodStatusFilter = searchParams.get("period_status") ?? "all";

  // Session Filters state
  const examTypeFilter = searchParams.get("exam_type_id") ?? "all";
  const periodFilter = searchParams.get("period_id") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const shiftFilter = searchParams.get("shift") ?? "all";
  const pubStatusFilter = searchParams.get("pub_status") ?? "all";

  // Period Action & Dialogs state
  const [isCreatePeriodOpen, setIsCreatePeriodOpen] = React.useState(false);
  const [periodToEdit, setPeriodToEdit] = React.useState<ExamPeriod | null>(null);
  const [periodToDuplicate, setPeriodToDuplicate] = React.useState<ExamPeriod | null>(null);
  const [periodToReschedule, setPeriodToReschedule] = React.useState<ExamPeriod | null>(null);
  const [selectedPeriodIdForDetail, setSelectedPeriodIdForDetail] = React.useState<number | null>(null);
  const [periodToCancel, setPeriodToCancel] = React.useState<ExamPeriod | null>(null);
  const [isPeriodCancelAlertOpen, setIsPeriodCancelAlertOpen] = React.useState(false);

  // Session Detail & Action Dialogs state
  const [selectedSessionForDetail, setSelectedSessionForDetail] =
    React.useState<ExamSession | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [sessionToEdit, setSessionToEdit] = React.useState<ExamSession | null>(null);
  const [sessionToCancel, setSessionToCancel] = React.useState<ExamSession | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);
  const [sessionToPublish, setSessionToPublish] = React.useState<ExamSession | null>(null);
  const [isPublishAlertOpen, setIsPublishAlertOpen] = React.useState(false);
  const [sessionForPublishSchedule, setSessionForPublishSchedule] =
    React.useState<ExamSession | null>(null);
  const [isPublishScheduleOpen, setIsPublishScheduleOpen] = React.useState(false);

  // Shared Early Close Registration AlertDialog state (for period or session)
  const [closeRegTarget, setCloseRegTarget] = React.useState<CloseRegistrationTarget | null>(null);

  // Shared Reopen Registration Dialog state (for period or session)
  const [reopenTarget, setReopenTarget] = React.useState<ReopenRegistrationTarget | null>(null);

  // Period Action Confirmation Dialog state (publish, unpublish, complete)
  const [periodForAction, setPeriodForAction] = React.useState<ExamPeriod | null>(null);
  const [periodActionType, setPeriodActionType] = React.useState<PeriodConfirmationType | null>(null);
  const [isPeriodActionAlertOpen, setIsPeriodActionAlertOpen] = React.useState(false);

  // Session Completion Safeguard Dialog state
  const [sessionToComplete, setSessionToComplete] = React.useState<ExamSession | null>(null);
  const [isSessionCompleteAlertOpen, setIsSessionCompleteAlertOpen] = React.useState(false);

  // Session Unpublish Confirmation AlertDialog state
  const [sessionToUnpublish, setSessionToUnpublish] = React.useState<ExamSession | null>(null);
  const [isSessionUnpublishAlertOpen, setIsSessionUnpublishAlertOpen] = React.useState(false);

  // Filtered periods
  const filteredPeriods = React.useMemo(() => {
    return periods.filter((period) => {
      const haystack = `${period.code} ${period.name} ${period.description ?? ""}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase().trim());
      const matchesStatus =
        periodStatusFilter === "all" || period.status === periodStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [periods, query, periodStatusFilter]);

  const totalPeriodPages = Math.max(1, Math.ceil(filteredPeriods.length / PAGE_SIZE));
  const currentPeriodPage = Math.min(page, totalPeriodPages);
  const visiblePeriods = React.useMemo(() => {
    return filteredPeriods.slice(
      (currentPeriodPage - 1) * PAGE_SIZE,
      currentPeriodPage * PAGE_SIZE
    );
  }, [filteredPeriods, currentPeriodPage]);

  // Filtered sessions
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((session) => {
      const type = examTypes.find((item) => item.id === session.exam_type_id);
      const haystack = `${session.id} ${session.name ?? ""} ${type?.name ?? ""} ${type?.code ?? ""}`.toLowerCase();

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase().trim());
      const matchesType =
        examTypeFilter === "all" ||
        String(session.exam_type_id) === examTypeFilter;
      const matchesPeriod =
        periodFilter === "all" ||
        String(session.period_id) === periodFilter;
      const isExpired = isSessionExpired(session);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && session.status === "open" && !isExpired) ||
        (statusFilter === "expired" && isExpired && session.status !== "cancelled") ||
        (statusFilter === "closed" && (session.status === "closed" || (isExpired && session.status !== "cancelled"))) ||
        (statusFilter === "cancelled" && session.status === "cancelled");
      const matchesShift =
        shiftFilter === "all" || session.shift === shiftFilter;
      const matchesPubStatus =
        pubStatusFilter === "all" ||
        session.status === pubStatusFilter ||
        (pubStatusFilter === "published" && session.status === "open") ||
        (session.exam_session_publication_status ?? "published") === pubStatusFilter;

      return matchesQuery && matchesType && matchesPeriod && matchesStatus && matchesShift && matchesPubStatus;
    });
  }, [sessions, examTypes, query, examTypeFilter, periodFilter, statusFilter, shiftFilter, pubStatusFilter]);

  // Session Pagination calculation
  const totalSessionPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const currentSessionPage = Math.min(page, totalSessionPages);
  const visibleSessions = React.useMemo(() => {
    return filteredSessions.slice(
      (currentSessionPage - 1) * PAGE_SIZE,
      currentSessionPage * PAGE_SIZE
    );
  }, [filteredSessions, currentSessionPage]);

  // Period Metrics summary
  const periodOpenRegCount = periods.filter((p) => p.status === "registration_open").length;
  const periodPublishedCount = periods.filter((p) => p.status === "published").length;
  const periodDraftCount = periods.filter((p) => p.status === "draft").length;
  const periodClosedCount = periods.filter((p) => p.status === "registration_closed").length;
  const periodRescheduledCount = periods.filter((p) => p.status === "rescheduled").length;
  const periodCompletedOrCancelledCount = periods.filter(
    (p) => p.status === "completed" || p.status === "cancelled"
  ).length;

  // Session Metrics summary
  const openCount = sessions.filter(
    (s) => s.status === "open" && !isSessionExpired(s)
  ).length;
  const expiredCount = sessions.filter(
    (s) => s.status !== "cancelled" && isSessionExpired(s)
  ).length;
  const closedCount = sessions.filter((s) => s.status === "closed").length;
  const cancelledCount = sessions.filter((s) => s.status === "cancelled").length;
  const totalCapacity = sessions.reduce((sum, s) => sum + (s.capacity ?? 0), 0);
  const draftCount = sessions.filter(
    (s) => s.status === "draft" || s.exam_session_publication_status === "draft"
  ).length;
  const scheduledCount = sessions.filter(
    (s) => s.status === "scheduled" || s.exam_session_publication_status === "scheduled"
  ).length;

  // Helper cập nhật params (tuân thủ Rule 100: reset về trang 1 khi đổi lọc/tìm kiếm)
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

  // Local state cho ô tìm kiếm để người dùng gõ mượt mà 60fps không bị khựng
  const [searchInput, setSearchInput] = React.useState(query);

  // Đồng bộ search input khi URL query thay đổi từ ngoài (đổi tab, reset, forward/back)
  React.useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Debounce cập nhật URL params (350ms) để triệt tiêu spam query / revalidate theo từng phím
  const debouncedUpdateSearch = useDebouncedCallback((val: string) => {
    const trimmed = val.trim();
    if (trimmed !== (query || "")) {
      updateParams({ q: trimmed || null, page: null });
    }
  }, 350);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setSearchInput(val);
    debouncedUpdateSearch(val);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      debouncedUpdateSearch.flush(searchInput);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    debouncedUpdateSearch.cancel();
    updateParams({ q: null, page: null });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    debouncedUpdateSearch.cancel();
    const next = new URLSearchParams();
    if (activeTab) next.set("tab", activeTab);
    setSearchParams(next, { preventScrollReset: true });
  };

  const handleTabChange = (nextTab: "periods" | "sessions") => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    setSearchInput("");
    debouncedUpdateSearch.cancel();
    updateParams({ tab: nextTab, page: null, q: null });
  };

  const hasActiveSessionFilters =
    Boolean(query) ||
    examTypeFilter !== "all" ||
    periodFilter !== "all" ||
    statusFilter !== "all" ||
    shiftFilter !== "all" ||
    pubStatusFilter !== "all";

  const hasActivePeriodFilters =
    Boolean(query) || periodStatusFilter !== "all";

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  // Throttled refresh (1000ms): Ngăn chặn spam click nút làm mới liên tục
  const handleRefresh = useThrottledCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetch("/internal/admin/system/clear-cache?target=exam-sessions", { method: "POST" });
      toast.add({
        type: "success",
        title: "Làm mới dữ liệu thành công",
        description: "Đã làm mới bộ nhớ đệm ca thi và đồng bộ dữ liệu mới nhất.",
      });
      revalidator.revalidate();
    } catch {
      revalidator.revalidate();
    } finally {
      setIsRefreshing(false);
    }
  }, 1000);

  // Notifications from actionFetcher (guarded against revalidation loops)
  const lastHandledActionRef = React.useRef<SessionAction | null>(null);
  React.useEffect(() => {
    if (actionFetcher.data && actionFetcher.data !== lastHandledActionRef.current) {
      lastHandledActionRef.current = actionFetcher.data;
      if (actionFetcher.data.success) {
        toast.add({
          type: "success",
          title: "Thao tác thành công",
          description: actionFetcher.data.message,
        });
        setSessionToCancel(null);
        setIsCancelAlertOpen(false);
        setSessionToPublish(null);
        setIsPublishAlertOpen(false);
        setSessionForPublishSchedule(null);
        setIsPublishScheduleOpen(false);
        setIsCreatePeriodOpen(false);
        setPeriodToCancel(null);
        setIsPeriodCancelAlertOpen(false);
        setPeriodToEdit(null);
        setPeriodToDuplicate(null);
        setPeriodToReschedule(null);
        setSelectedPeriodIdForDetail(null);
        setSessionToEdit(null);
        setCloseRegTarget(null);
      } else if (actionFetcher.data.error) {
        toast.add({
          type: "error",
          title: "Không thể hoàn tất thao tác",
          description: actionFetcher.data.error,
        });
      }
    }
  }, [actionFetcher.data]);

  const confirmCancelSession = () => {
    if (!sessionToCancel) return;
    actionFetcher.submit(
      {
        intent: "cancel",
        session_id: String(sessionToCancel.id),
        session_status: sessionToCancel.status,
      },
      { method: "post" }
    );
  };

  const confirmCancelPeriod = () => {
    if (!periodToCancel) return;
    const isDraft = periodToCancel.status === "draft";
    actionFetcher.submit(
      {
        intent: isDraft ? "delete-period" : "cancel-period",
        period_id: String(periodToCancel.id),
      },
      { method: "post" }
    );
  };

  const handleOpenPublishConfirm = (session: ExamSession) => {
    const parentPeriod = session.period_id ? periods.find((p) => p.id === session.period_id) : undefined;
    if (parentPeriod?.status === "draft") {
      toast.add({
        type: "error",
        title: "Đợt thi chưa được công bố",
        description: `Đợt thi "${parentPeriod.name}" đang là Bản nháp. Vui lòng chuyển sang tab "Quản lý Đợt thi" để công bố đợt thi trước khi công khai ca thi con.`,
      });
      return;
    }
    if (!canSession(session, "publish", parentPeriod)) {
      toast.add({
        type: "error",
        title: "Chưa đủ điều kiện công khai",
        description:
          getSessionLockReason(session, parentPeriod) ??
          "Ca thi chưa được thiết lập Ngày thi, Hạn đăng ký hoặc Sức chứa (> 0) hoặc đợt thi cha chưa công bố/đã đóng.",
      });
      return;
    }
    setSessionToPublish(session);
    setIsPublishAlertOpen(true);
  };

  const handleOpenPublishSchedule = (session: ExamSession) => {
    const parentPeriod = session.period_id ? periods.find((p) => p.id === session.period_id) : undefined;
    if (parentPeriod?.status === "draft") {
      toast.add({
        type: "error",
        title: "Đợt thi chưa được công bố",
        description: `Đợt thi "${parentPeriod.name}" đang là Bản nháp. Vui lòng công bố đợt thi trước khi lên lịch công khai ca thi con.`,
      });
      return;
    }
    if (!canSession(session, "schedule_publish", parentPeriod)) {
      toast.add({
        type: "error",
        title: "Không thể lên lịch",
        description:
          getSessionLockReason(session, parentPeriod) ??
          "Ca thi không cho phép lên lịch ở trạng thái hiện tại.",
      });
      return;
    }
    setSessionForPublishSchedule(session);
    setIsPublishScheduleOpen(true);
  };

  const confirmPublishSession = () => {
    if (!sessionToPublish) return;
    actionFetcher.submit(
      {
        intent: "publish-session",
        session_id: String(sessionToPublish.id),
        session_status: sessionToPublish.status,
      },
      { method: "post" }
    );
  };

  const handleConfirmPeriodAction = (period: ExamPeriod, actionType: PeriodConfirmationType) => {
    setIsPeriodActionAlertOpen(false);
    setPeriodForAction(null);
    setPeriodActionType(null);
    const intentMap: Record<PeriodConfirmationType, string> = {
      publish: "publish-period",
      unpublish: "unpublish-period",
      complete: "complete-period",
    };
    actionFetcher.submit(
      { intent: intentMap[actionType], period_id: String(period.id) },
      { method: "post" }
    );
  };

  const handleConfirmCompleteSession = (session: ExamSession) => {
    setIsSessionCompleteAlertOpen(false);
    setSessionToComplete(null);
    actionFetcher.submit(
      {
        intent: "complete-session",
        session_id: String(session.id),
        session_status: session.status,
      },
      { method: "post" }
    );
  };

  const handleConfirmUnpublishSession = () => {
    if (!sessionToUnpublish) return;
    setIsSessionUnpublishAlertOpen(false);
    const target = sessionToUnpublish;
    setSessionToUnpublish(null);
    actionFetcher.submit(
      {
        intent: "unpublish-session",
        session_id: String(target.id),
        session_status: target.status,
      },
      { method: "post" }
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
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
            <span className="text-muted-foreground/60 text-xs">•</span>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Mô hình 2 tầng
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Kỳ thi & Ca thi
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quản lý đợt thi theo mô hình 2 tầng, điều phối ca thi con, dời lịch thi và theo dõi chỉ số lấp đầy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm shadow-2xs"
            onClick={handleRefresh}
            disabled={isRefreshing || revalidator.state === "loading"}
          >
            <RefreshCwIcon
              className={`size-3.5 mr-1.5 ${isRefreshing || revalidator.state === "loading" ? "animate-spin" : ""}`}
            />
            {isRefreshing || revalidator.state === "loading" ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </Button>

          {activeTab === "periods" ? (
            <Button
              onClick={() => setIsCreatePeriodOpen(true)}
              className="rounded-full cursor-pointer hover:bg-primary/90 shadow-2xs font-medium text-xs sm:text-sm"
            >
              <PlusIcon className="size-4 mr-1.5" />
              Tạo đợt thi mới
            </Button>
          ) : (
            <SessionCreateDialog examTypes={examTypes} periods={periods} />
          )}
        </div>
      </div>

      {/* ── Subtab Switcher: Đợt thi vs Ca thi (Mô hình 2 tầng) ─────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 rounded-2xl border w-fit">
        <button
          type="button"
          onClick={() => handleTabChange("periods")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "periods"
            ? "bg-background text-foreground shadow-xs border border-border/60"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
        >
          <LayersIcon className="size-4 text-primary" />
          <span>Quản lý Đợt thi</span>
          <Badge
            variant={activeTab === "periods" ? "default" : "secondary"}
            className="ml-1 rounded-full px-2 py-0 text-[10px] font-bold"
          >
            {periods.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("sessions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${activeTab === "sessions"
            ? "bg-background text-foreground shadow-xs border border-border/60"
            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
        >
          <ClockIcon className="size-4 text-sky-600 dark:text-sky-400" />
          <span>Quản lý Ca thi</span>
          <Badge
            variant={activeTab === "sessions" ? "default" : "secondary"}
            className="ml-1 rounded-full px-2 py-0 text-[10px] font-bold"
          >
            {sessions.length}
          </Badge>
        </button>
      </div>

      <div key={activeTab} className="animate-in fade-in-50 duration-200">
        {activeTab === "periods" ? (
          <>
            {/* ── Metric / Stat Cards cho Đợt thi ──────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Tổng đợt thi */}
              <Card
                onClick={handleResetFilters}
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-primary/40 ${!hasActivePeriodFilters ? "ring-1 ring-primary/30 border-primary/40 bg-primary/5" : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <LayersIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Tổng đợt thi</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {periods.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Đang mở đăng ký */}
              <Card
                onClick={() =>
                  updateParams({
                    period_status: periodStatusFilter === "registration_open" ? null : "registration_open",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-emerald-500/40 ${periodStatusFilter === "registration_open"
                  ? "ring-1 ring-emerald-500/40 border-emerald-500/40 bg-emerald-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đang mở ĐK</p>
                    <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {periodOpenRegCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Đã công bố */}
              <Card
                onClick={() =>
                  updateParams({
                    period_status: periodStatusFilter === "published" ? null : "published",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-sky-500/40 ${periodStatusFilter === "published"
                  ? "ring-1 ring-sky-500/40 border-sky-500/40 bg-sky-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                    <GlobeIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đã công bố</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {periodPublishedCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Bản nháp */}
              <Card
                onClick={() =>
                  updateParams({
                    period_status: periodStatusFilter === "draft" ? null : "draft",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-500/40 ${periodStatusFilter === "draft"
                  ? "ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Bản nháp</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {periodDraftCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: Đã dời lịch */}
              <Card
                onClick={() =>
                  updateParams({
                    period_status: periodStatusFilter === "rescheduled" ? null : "rescheduled",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-purple-500/40 ${periodStatusFilter === "rescheduled"
                  ? "ring-1 ring-purple-500/40 border-purple-500/40 bg-purple-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <CalendarClockIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đã dời lịch</p>
                    <p className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                      {periodRescheduledCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 6: Đã đóng / Hủy */}
              <Card
                onClick={() =>
                  updateParams({
                    period_status: periodStatusFilter === "registration_closed" ? null : "registration_closed",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-muted-foreground/40 ${periodStatusFilter === "registration_closed"
                  ? "ring-1 ring-muted-foreground/40 border-muted-foreground/40 bg-muted/20"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                    <LockIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đóng / Hết hạn</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {periodClosedCount + periodCompletedOrCancelledCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Bảng Dữ liệu Đợt thi ─────────────────────────────────────────── */}
            <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-2xs">
              <CardHeader className="gap-3.5 border-b bg-card/50 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        Danh sách Đợt thi HSK
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground"
                      >
                        {filteredPeriods.length} đợt thi
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Mô hình 2 tầng: Mỗi đợt thi bao gồm nhiều ca thi con tương ứng với từng cấp độ thi.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => updateParams({ period_status: null, page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 ${periodStatusFilter === "all"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Tất cả ({periods.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ period_status: "registration_open", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${periodStatusFilter === "registration_open"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang mở ĐK ({periodOpenRegCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ period_status: "published", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${periodStatusFilter === "published"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <GlobeIcon className="size-3 text-sky-600 dark:text-sky-400" />
                      Đã công bố ({periodPublishedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ period_status: "draft", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${periodStatusFilter === "draft"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <FileTextIcon className="size-3 text-amber-600 dark:text-amber-400" />
                      Bản nháp ({periodDraftCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ period_status: "rescheduled", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${periodStatusFilter === "rescheduled"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <CalendarClockIcon className="size-3 text-purple-600 dark:text-purple-400" />
                      Đã dời lịch ({periodRescheduledCount})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50">
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Tìm mã đợt thi (HSK-2026-T06), tên đợt thi..."
                      className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                      aria-label="Tìm kiếm đợt thi"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Xóa từ khóa tìm kiếm"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {hasActivePeriodFilters && (
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
              </CardHeader>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                      <TableHead className="w-[120px] py-3 text-xs font-semibold text-muted-foreground pl-5">
                        Mã đợt
                      </TableHead>
                      <TableHead className="min-w-[220px] py-3 text-xs font-semibold text-muted-foreground">
                        Tên đợt thi
                      </TableHead>
                      <TableHead className="min-w-[190px] py-3 text-xs font-semibold text-muted-foreground">
                        Thời gian tổ chức
                      </TableHead>
                      <TableHead className="min-w-[170px] py-3 text-xs font-semibold text-muted-foreground">
                        Hạn chót đăng ký
                      </TableHead>
                      <TableHead className="min-w-[100px] py-3 text-xs font-semibold text-muted-foreground text-center">
                        Số ca thi
                      </TableHead>
                      <TableHead className="min-w-[130px] py-3 text-xs font-semibold text-muted-foreground">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-[90px] py-3 text-xs font-semibold text-muted-foreground text-right pr-5">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePeriods.map((period) => {
                      const statusInfo = getPeriodStatusDetails(period.status);
                      const lockReason = getPeriodLockReason(period);
                      const isLocked = lockReason !== null;
                      const canEdit = canPeriod(period, "edit");
                      const canPublish = canPeriod(period, "publish");
                      const canUnpublish = canPeriod(period, "unpublish");
                      const canReopenReg = canPeriod(period, "reopen_registration");
                      const canComplete = canPeriod(period, "complete");
                      const canCloseEarly = canClosePeriodRegistration(period);
                      const canCancel = canPeriod(period, "cancel");
                      const canDelete = canPeriod(period, "delete");
                      const rescheduleBlockReason = getPeriodRescheduleBlockReason(period);
                      const duplicateBlockReason = getPeriodDuplicateBlockReason(period);

                      return (
                        <TableRow key={period.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="pl-5">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {period.code}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                #{period.id}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground text-xs sm:text-sm">
                                {period.name}
                              </span>
                              {period.description && (
                                <span className="text-[11px] text-muted-foreground line-clamp-1">
                                  {period.description}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <CalendarDaysIcon className="size-3.5 text-primary shrink-0" />
                              <span>
                                {formatDateOnly(period.start_date)}
                                {period.end_date && period.end_date !== period.start_date && (
                                  <> - {formatDateOnly(period.end_date)}</>
                                )}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <ClockIcon className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{formatDateTime(period.registration_deadline)}</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              onClick={() => setSelectedPeriodIdForDetail(period.id)}
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-muted"
                              title="Bấm để xem danh sách ca thi con"
                            >
                              <LayersIcon className="size-3 mr-1 text-primary" />
                              {period.session_count ?? 0} ca
                            </Badge>
                          </TableCell>

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

                          <TableCell className="text-right pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Xem chi tiết đợt thi & ca thi"
                                onClick={() => setSelectedPeriodIdForDetail(period.id)}
                              >
                                <EyeIcon className="size-3.5" />
                                <span className="sr-only">Xem chi tiết</span>
                              </Button>

                              {canPublish && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full cursor-pointer hover:bg-emerald-50 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                  title="Công bố đợt thi này"
                                  onClick={() => {
                                    setPeriodForAction(period);
                                    setPeriodActionType("publish");
                                    setIsPeriodActionAlertOpen(true);
                                  }}
                                >
                                  <GlobeIcon className="size-3.5" />
                                  <span className="sr-only">Công bố đợt thi</span>
                                </Button>
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                      aria-label={`Thao tác đợt ${period.code}`}
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5 shadow-lg border">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5 truncate">
                                    Đợt thi: {period.code}
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() => setSelectedPeriodIdForDetail(period.id)}
                                    >
                                      <EyeIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Xem chi tiết & ca thi con
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() =>
                                        navigator.clipboard?.writeText(period.code).then(() =>
                                          toast.add({
                                            type: "info",
                                            title: "Đã sao chép mã đợt thi",
                                            description: `Mã: ${period.code}`,
                                          })
                                        )
                                      }
                                    >
                                      <CopyIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Sao chép mã đợt thi
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>

                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                    Quản lý & Cấu hình
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      disabled={!canEdit || isLocked}
                                      className="cursor-pointer text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={
                                        lockReason
                                          ? `${lockReason} Không thể chỉnh sửa.`
                                          : "Chỉnh sửa thông tin đợt thi"
                                      }
                                      onClick={() => {
                                        if (!canEdit || isLocked) return;
                                        setPeriodToEdit(period);
                                      }}
                                    >
                                      <EditIcon className="size-3.5 mr-2 text-primary" />
                                      Chỉnh sửa thông tin
                                    </DropdownMenuItem>

                                    {canPublish && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                        onClick={() => {
                                          setPeriodForAction(period);
                                          setPeriodActionType("publish");
                                          setIsPeriodActionAlertOpen(true);
                                        }}
                                      >
                                        <GlobeIcon className="size-3.5 mr-2" />
                                        Công bố đợt thi
                                      </DropdownMenuItem>
                                    )}

                                    {canUnpublish && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-amber-700 dark:text-amber-400 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                        onClick={() => {
                                          setPeriodForAction(period);
                                          setPeriodActionType("unpublish");
                                          setIsPeriodActionAlertOpen(true);
                                        }}
                                      >
                                        <FileTextIcon className="size-3.5 mr-2" />
                                        Hủy công bố (Về bản nháp)
                                      </DropdownMenuItem>
                                    )}

                                    {canReopenReg && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                        onClick={() => {
                                          setReopenTarget({
                                            type: "period",
                                            id: period.id,
                                            title: period.name,
                                            code: period.code,
                                            currentDeadline: period.registration_deadline,
                                            startDate: period.start_date,
                                          });
                                        }}
                                      >
                                        <RotateCcwIcon className="size-3.5 mr-2" />
                                        Mở lại cổng đăng ký
                                      </DropdownMenuItem>
                                    )}

                                    {canComplete && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                                        onClick={() => {
                                          setPeriodForAction(period);
                                          setPeriodActionType("complete");
                                          setIsPeriodActionAlertOpen(true);
                                        }}
                                      >
                                        <CheckCircle2Icon className="size-3.5 mr-2" />
                                        Hoàn tất đợt thi
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem
                                      disabled={rescheduleBlockReason !== null}
                                      className="cursor-pointer text-xs rounded-lg font-medium text-purple-700 dark:text-purple-400 focus:text-purple-700 focus:bg-purple-50 dark:focus:bg-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={
                                        rescheduleBlockReason ??
                                        "Dời lịch thi do sự kiện bất khả kháng (§4.15)"
                                      }
                                      onClick={() => {
                                        if (rescheduleBlockReason !== null) return;
                                        setPeriodToReschedule(period);
                                      }}
                                    >
                                      <CalendarClockIcon className="size-3.5 mr-2" />
                                      Dời lịch thi (Bất khả kháng)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={duplicateBlockReason !== null}
                                      className="cursor-pointer text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={
                                        duplicateBlockReason ??
                                        "Nhân bản toàn bộ cấu hình đợt thi (ACID) sang đợt mới"
                                      }
                                      onClick={() => {
                                        if (duplicateBlockReason !== null) return;
                                        setPeriodToDuplicate(period);
                                      }}
                                    >
                                      <CopyIcon className="size-3.5 mr-2 text-sky-600 dark:text-sky-400" />
                                      Nhân bản đợt thi (ACID)
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>

                                  {isLocked && period.status !== "cancelled" && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuItem
                                        disabled
                                        title={lockReason ?? undefined}
                                        className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-not-allowed select-none"
                                      >
                                        <LockIcon className="size-3.5 text-muted-foreground" />
                                        {lockReason} (Khóa chỉnh sửa)
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {canCloseEarly && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuGroup>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          className="cursor-pointer text-xs rounded-lg font-medium text-amber-700 dark:text-amber-400 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                          onClick={() =>
                                            setCloseRegTarget({
                                              type: "period",
                                              id: period.id,
                                              title: period.name,
                                            })
                                          }
                                        >
                                          <LockIcon className="size-3.5 mr-2" />
                                          Đóng đăng ký sớm
                                        </DropdownMenuItem>
                                      </DropdownMenuGroup>
                                    </>
                                  )}

                                  {(canCancel || canDelete) && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuGroup>
                                        {canCancel && (
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => {
                                              setPeriodToCancel(period);
                                              setIsPeriodCancelAlertOpen(true);
                                            }}
                                          >
                                            <AlertTriangleIcon className="size-3.5 mr-2" />
                                            Hủy đợt thi
                                          </DropdownMenuItem>
                                        )}
                                        {canDelete && (
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => {
                                              setPeriodToCancel(period);
                                              setIsPeriodCancelAlertOpen(true);
                                            }}
                                          >
                                            <Trash2Icon className="size-3.5 mr-2" />
                                            Xóa bản nháp đợt thi
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

                    {visiblePeriods.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center gap-2">
                            <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-1">
                              <LayersIcon className="size-6" />
                            </div>
                            <p className="text-base font-semibold text-foreground">
                              Không tìm thấy đợt thi phù hợp
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Không có đợt thi nào khớp với từ khóa tìm kiếm hoặc trạng thái đã chọn.
                            </p>
                            {hasActivePeriodFilters && (
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

              {/* Period Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t bg-card/30 p-4 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {filteredPeriods.length > 0 ? (
                    <>
                      Hiển thị{" "}
                      <span className="font-semibold text-foreground">
                        {(currentPeriodPage - 1) * PAGE_SIZE + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-semibold text-foreground">
                        {Math.min(currentPeriodPage * PAGE_SIZE, filteredPeriods.length)}
                      </span>{" "}
                      trên tổng số{" "}
                      <span className="font-semibold text-foreground">
                        {filteredPeriods.length}
                      </span>{" "}
                      đợt thi
                    </>
                  ) : (
                    "Không có dữ liệu hiển thị"
                  )}
                </p>

                {totalPeriodPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          disabled={currentPeriodPage <= 1}
                          onClick={() => updateParams({ page: String(currentPeriodPage - 1) })}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPeriodPages }, (_, index) => index + 1).map((item) => (
                        <PaginationItem key={item}>
                          <PaginationButton
                            isActive={item === currentPeriodPage}
                            onClick={() => updateParams({ page: String(item) })}
                          >
                            {item}
                          </PaginationButton>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          disabled={currentPeriodPage >= totalPeriodPages}
                          onClick={() => updateParams({ page: String(currentPeriodPage + 1) })}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* ── Metric / Stat Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Tổng ca thi */}
              <Card
                onClick={handleResetFilters}
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-primary/40 ${!hasActiveSessionFilters ? "ring-1 ring-primary/30 border-primary/40 bg-primary/5" : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <CalendarDaysIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Tổng ca thi</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {sessions.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Đang mở đăng ký */}
              <Card
                onClick={() =>
                  updateParams({
                    status: statusFilter === "open" ? null : "open",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-emerald-500/40 ${statusFilter === "open"
                  ? "ring-1 ring-emerald-500/40 border-emerald-500/40 bg-emerald-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đang mở</p>
                    <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      {openCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Bản nháp */}
              <Card
                onClick={() =>
                  updateParams({
                    pub_status: pubStatusFilter === "draft" ? null : "draft",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-500/40 ${pubStatusFilter === "draft"
                  ? "ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <FileTextIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Bản nháp</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {draftCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Lên lịch */}
              <Card
                onClick={() =>
                  updateParams({
                    pub_status: pubStatusFilter === "scheduled" ? null : "scheduled",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-sky-500/40 ${pubStatusFilter === "scheduled"
                  ? "ring-1 ring-sky-500/40 border-sky-500/40 bg-sky-500/5"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                    <CalendarClockIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Lên lịch</p>
                    <p className="text-xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                      {scheduledCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: Đã đóng / Hủy */}
              <Card
                onClick={() =>
                  updateParams({
                    status: statusFilter === "closed" ? null : "closed",
                    page: null,
                  })
                }
                className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-muted-foreground/40 ${statusFilter === "closed"
                  ? "ring-1 ring-muted-foreground/40 border-muted-foreground/40 bg-muted/20"
                  : ""
                  }`}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <ClockIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Đóng / Hết hạn</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {closedCount + expiredCount + cancelledCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 6: Tổng số slot thi */}
              <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <UsersIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">Tổng slot</p>
                    <p className="text-xl font-bold tracking-tight text-foreground">
                      {totalCapacity}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Main Data Card: Filters & Table ─────────────────────────────────── */}
            <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-2xs">
              <CardHeader className="gap-3.5 border-b bg-card/50 p-4 sm:p-5">
                {/* Top Row: Title, Counter & Publication Status Tabs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                        Danh sách ca thi HSK
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground"
                      >
                        {filteredSessions.length} ca thi
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Hiển thị {filteredSessions.length} kết quả
                      {hasActiveSessionFilters && sessions.length !== filteredSessions.length
                        ? ''
                        : ""}
                      {" · "}
                      {PAGE_SIZE} bản ghi mỗi trang
                    </CardDescription>
                  </div>

                  {/* Quick Publication Status Tabs */}
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => updateParams({ pub_status: null, page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 ${pubStatusFilter === "all"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Tất cả ({sessions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ pub_status: "published", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "published"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <GlobeIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                      Công khai (
                      {
                        sessions.filter(
                          (s) => s.status === "open" || (s.exam_session_publication_status ?? "published") === "published"
                        ).length
                      }
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ pub_status: "draft", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "draft"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <FileTextIcon className="size-3 text-amber-600 dark:text-amber-400" />
                      Bản nháp ({draftCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => updateParams({ pub_status: "scheduled", page: null })}
                      className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "scheduled"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <CalendarClockIcon className="size-3 text-sky-600 dark:text-sky-400" />
                      Lên lịch ({scheduledCount})
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Search & Filters Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchInput}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Tìm mã ca thi, loại kỳ thi HSK..."
                      className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                      aria-label="Tìm kiếm ca thi"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Xóa từ khóa tìm kiếm"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Dropdowns Group */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    {/* Lọc Loại kỳ thi */}
                    <Select
                      value={examTypeFilter}
                      onValueChange={(value) =>
                        updateParams({ exam_type_id: value, page: null })
                      }
                    >
                      <SelectTrigger className="h-9 w-full sm:w-48 rounded-full px-3 text-xs cursor-pointer truncate">
                        <SelectValue placeholder="Mọi loại kỳ thi">
                          {(val) => {
                            const current = val ?? examTypeFilter;
                            if (!current || current === "all") return "Mọi loại kỳ thi";
                            const matched = examTypes.find(
                              (type) => String(type.id) === String(current)
                            );
                            return matched ? matched.name : "Mọi loại kỳ thi";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-64">
                        <SelectGroup>
                          <SelectItem value="all" className="cursor-pointer text-xs">
                            Mọi loại kỳ thi
                          </SelectItem>
                          {examTypes.map((type) => (
                            <SelectItem
                              key={type.id}
                              value={String(type.id)}
                              className="cursor-pointer text-xs"
                            >
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {/* Lọc Đợt thi */}
                    {periods && periods.length > 0 && (
                      <Select
                        value={periodFilter}
                        onValueChange={(value) =>
                          updateParams({ period_id: value, page: null })
                        }
                      >
                        <SelectTrigger className="h-9 w-full sm:w-44 rounded-full px-3 text-xs cursor-pointer truncate">
                          <SelectValue placeholder="Mọi đợt thi">
                            {(val) => {
                              const current = val ?? periodFilter;
                              if (!current || current === "all") return "Mọi đợt thi";
                              const matched = periods.find(
                                (p) => String(p.id) === String(current)
                              );
                              return matched ? matched.code : "Mọi đợt thi";
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-64">
                          <SelectGroup>
                            <SelectItem value="all" className="cursor-pointer text-xs">
                              Mọi đợt thi
                            </SelectItem>
                            {periods.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={String(p.id)}
                                className="cursor-pointer text-xs"
                              >
                                <span className="font-semibold">{p.code}</span> — {p.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Lọc Trạng thái */}
                    <Select
                      value={statusFilter}
                      onValueChange={(value) =>
                        updateParams({ status: value, page: null })
                      }
                    >
                      <SelectTrigger className="h-9 w-full sm:w-36 rounded-full px-3 text-xs cursor-pointer">
                        <SelectValue placeholder="Mọi trạng thái">
                          {(val) => {
                            const current = val ?? statusFilter;
                            if (!current || current === "all") return "Mọi trạng thái";
                            if (current === "open") return "Đang mở";
                            if (current === "expired") return "Đã hết hạn";
                            if (current === "closed") return "Đã đóng";
                            if (current === "cancelled") return "Đã hủy";
                            return "Mọi trạng thái";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectGroup>
                          <SelectItem value="all" className="cursor-pointer text-xs">
                            Mọi trạng thái
                          </SelectItem>
                          <SelectItem value="open" className="cursor-pointer text-xs">
                            Đang mở ({openCount})
                          </SelectItem>
                          <SelectItem value="expired" className="cursor-pointer text-xs">
                            Đã hết hạn ({expiredCount})
                          </SelectItem>
                          <SelectItem value="closed" className="cursor-pointer text-xs">
                            Đã đóng ({closedCount})
                          </SelectItem>
                          <SelectItem value="cancelled" className="cursor-pointer text-xs">
                            Đã hủy ({cancelledCount})
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {/* Lọc Buổi thi */}
                    <Select
                      value={shiftFilter}
                      onValueChange={(value) =>
                        updateParams({ shift: value, page: null })
                      }
                    >
                      <SelectTrigger className="h-9 w-full sm:w-36 rounded-full px-3 text-xs cursor-pointer">
                        <SelectValue placeholder="Mọi buổi thi">
                          {(val) => {
                            const current = val ?? shiftFilter;
                            if (!current || current === "all") return "Mọi buổi thi";
                            if (current === "morning") return "Buổi sáng (08:30)";
                            if (current === "afternoon") return "Buổi chiều (13:30)";
                            return "Mọi buổi thi";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectGroup>
                          <SelectItem value="all" className="cursor-pointer text-xs">
                            Mọi buổi thi
                          </SelectItem>
                          <SelectItem value="morning" className="cursor-pointer text-xs">
                            Buổi sáng (08:30)
                          </SelectItem>
                          <SelectItem value="afternoon" className="cursor-pointer text-xs">
                            Buổi chiều (13:30)
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {/* Nút Xóa lọc nếu có lọc */}
                    {hasActiveSessionFilters && (
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
                      <TableHead className="w-[85px] py-3 text-xs font-semibold text-muted-foreground pl-5">
                        Mã ca
                      </TableHead>
                      <TableHead className="min-w-[220px] py-3 text-xs font-semibold text-muted-foreground">
                        Loại kỳ thi
                      </TableHead>
                      <TableHead className="min-w-[200px] py-3 text-xs font-semibold text-muted-foreground">
                        Lịch thi & Ca thi
                      </TableHead>
                      <TableHead className="min-w-[110px] py-3 text-xs font-semibold text-muted-foreground">
                        Số slot
                      </TableHead>
                      <TableHead className="min-w-[120px] py-3 text-xs font-semibold text-muted-foreground">
                        Lệ phí
                      </TableHead>
                      <TableHead className="min-w-[130px] py-3 text-xs font-semibold text-muted-foreground">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-[90px] py-3 text-xs font-semibold text-muted-foreground text-right pr-5">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSessions.map((session) => {
                      const isExpired = isSessionExpired(session);
                      const type = examTypes.find((item) => item.id === session.exam_type_id);
                      const shiftInfo = getShiftDetails(session.shift);
                      const parentPeriod = session.period_id
                        ? periods.find((item) => item.id === session.period_id)
                        : undefined;
                      const statusInfo = getSessionStatusDetails(session.status, session.closed_reason);
                      const lockReason = getSessionLockReason(session, parentPeriod);
                      const isLocked = lockReason !== null;
                      const canEdit = canSession(session, "edit", parentPeriod);
                      const canSchedule = canSession(session, "schedule_publish", parentPeriod);
                      const canPublish = canSession(session, "publish", parentPeriod);
                      const canUnpublish = canSession(session, "unpublish", parentPeriod);
                      const canCloseEarly = canSession(session, "close_registration", parentPeriod);
                      const canReopenReg = canSession(session, "reopen_registration", parentPeriod);
                      const canCancel = canSession(session, "cancel", parentPeriod);
                      const canDelete = canSession(session, "delete", parentPeriod);
                      const ShiftIcon = shiftInfo.icon;

                      return (
                        <TableRow
                          key={session.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          {/* Mã ca */}
                          <TableCell className="pl-5 font-mono text-xs font-medium text-muted-foreground">
                            #{session.id}
                          </TableCell>

                          {/* Loại kỳ thi & Tên ca thi */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground text-xs sm:text-sm">
                                  {session.name ? session.name : (type?.name ?? `Loại thi #${session.exam_type_id}`)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {type?.name && session.name ? (
                                  <span className="text-[11px] font-medium text-primary">
                                    {type.name}
                                  </span>
                                ) : null}
                                {type?.code ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full px-1.5 py-0 text-[10px] font-medium border-border/80"
                                  >
                                    {type.code}
                                  </Badge>
                                ) : null}
                                {type?.description ? (
                                  <span className="text-[11px] text-muted-foreground line-clamp-1">
                                    {type.description}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>

                          {/* Lịch thi & Ca thi */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-foreground">
                                <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                                <span>{formatDateOnly(session.date)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium border flex items-center gap-1 ${shiftInfo.className}`}
                                >
                                  <ShiftIcon className="size-3 shrink-0" />
                                  {shiftInfo.label}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  Hạn: {formatDateTime(session.registration_deadline, false)}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Số slot */}
                          <TableCell>
                            {session.capacity != null ? (
                              <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground">
                                <UsersIcon className="size-3.5 text-muted-foreground shrink-0" />
                                <span>{session.capacity}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  slot
                                </span>
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                              >
                                Chưa đặt slot
                              </Badge>
                            )}
                          </TableCell>

                          {/* Lệ phí */}
                          <TableCell className="font-semibold text-xs sm:text-sm tabular-nums text-foreground">
                            {formatCurrency(session.fee)}
                          </TableCell>

                          {/* Trạng thái */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <Badge
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit ${statusInfo.badgeClass}`}
                                title={lockReason ?? undefined}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.pulse ? "animate-pulse" : ""
                                    }`}
                                />
                                {statusInfo.label}
                              </Badge>
                              {statusInfo.subLabel && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  {statusInfo.subLabel}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Thao tác */}
                          <TableCell className="text-right pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Xem chi tiết ca thi"
                                onClick={() => {
                                  setSelectedSessionForDetail(session);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <EyeIcon className="size-3.5" />
                                <span className="sr-only">Xem chi tiết</span>
                              </Button>

                              {canSchedule && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full cursor-pointer hover:bg-sky-50 text-sky-600 dark:text-sky-400 hover:text-sky-700"
                                  title={
                                    session.status === "draft"
                                      ? "Lên lịch công khai ca thi"
                                      : "Chỉnh sửa lịch hẹn công khai"
                                  }
                                  onClick={() => handleOpenPublishSchedule(session)}
                                >
                                  <CalendarClockIcon className="size-3.5" />
                                  <span className="sr-only">Lịch công khai</span>
                                </Button>
                              )}

                              {parentPeriod?.status === "draft" &&
                                (session.status === "draft" || session.status === "scheduled") && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="rounded-full cursor-pointer hover:bg-amber-50 text-amber-600 dark:text-amber-400"
                                    title={`Đợt thi "${parentPeriod.name}" đang là Bản nháp. Nhấn để chuyển sang công bố đợt thi trước.`}
                                    onClick={() => {
                                      handleTabChange("periods");
                                      toast.add({
                                        type: "warning",
                                        title: "Cần công bố đợt thi trước",
                                        description: `Đợt thi "${parentPeriod.name}" (mã: ${parentPeriod.code}) đang ở trạng thái Bản nháp. Hãy công bố đợt thi trước khi công khai ca thi này.`,
                                      });
                                    }}
                                  >
                                    <GlobeIcon className="size-3.5" />
                                    <span className="sr-only">Cần công bố đợt thi trước</span>
                                  </Button>
                                )}

                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                      aria-label={`Thao tác ca ${session.id}`}
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5 truncate">
                                    Ca thi #{session.id}
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() => {
                                        setSelectedSessionForDetail(session);
                                        setIsDetailOpen(true);
                                      }}
                                    >
                                      <EyeIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Xem chi tiết ca thi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() =>
                                        navigator.clipboard
                                          ?.writeText(String(session.id))
                                          .then(() =>
                                            toast.add({
                                              type: "info",
                                              title: "Đã sao chép mã ca thi",
                                              description: `Mã ca: #${session.id}`,
                                            })
                                          )
                                      }
                                    >
                                      <CopyIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Sao chép mã ca thi
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>

                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                    Chỉnh sửa & Điều chỉnh
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      disabled={!canEdit}
                                      title={
                                        !canEdit
                                          ? lockReason ?? "Ca thi không cho phép chỉnh sửa ở trạng thái hiện tại"
                                          : "Chỉnh sửa ca thi"
                                      }
                                      className="cursor-pointer text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={() => {
                                        if (!canEdit) return;
                                        setSessionToEdit(session);
                                      }}
                                    >
                                      <EditIcon className="size-3.5 mr-2 text-primary" />
                                      Chỉnh sửa ca thi
                                    </DropdownMenuItem>
                                    {canCloseEarly && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-amber-700 dark:text-amber-400 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                        onClick={() =>
                                          setCloseRegTarget({
                                            type: "session",
                                            id: session.id,
                                            title: `Ca thi #${session.id}`,
                                          })
                                        }
                                      >
                                        <LockIcon className="size-3.5 mr-2" />
                                        Đóng đăng ký sớm
                                      </DropdownMenuItem>
                                    )}
                                    {canReopenReg && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                        onClick={() => {
                                          setReopenTarget({
                                            type: "session",
                                            id: session.id,
                                            title: session.name || `Ca thi #${session.id}`,
                                            currentDeadline: session.registration_deadline,
                                            closedReason: session.closed_reason,
                                            startDate: session.date,
                                          });
                                        }}
                                      >
                                        <RotateCcwIcon className="size-3.5 mr-2" />
                                        Mở lại cổng đăng ký
                                      </DropdownMenuItem>
                                    )}

                                    {canSession(session, "complete", parentPeriod) && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                                        onClick={() => {
                                          setSessionToComplete(session);
                                          setIsSessionCompleteAlertOpen(true);
                                        }}
                                      >
                                        <CheckCircle2Icon className="size-3.5 mr-2" />
                                        Hoàn tất ca thi
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuGroup>

                                  {/* Khối Phát hành & Lịch */}
                                  {(canSchedule || canPublish || canUnpublish || session.status === "open") && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                        Phát hành & Công khai
                                      </DropdownMenuLabel>
                                      <DropdownMenuGroup>
                                        {canSchedule && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-sky-700 dark:text-sky-400 focus:text-sky-700 focus:bg-sky-50 dark:focus:bg-sky-950/40"
                                            onClick={() => handleOpenPublishSchedule(session)}
                                          >
                                            <CalendarClockIcon className="size-3.5 mr-2" />
                                            {session.status === "scheduled"
                                              ? "Chỉnh sửa lịch hẹn"
                                              : "Lên lịch công khai"}
                                          </DropdownMenuItem>
                                        )}

                                        {canPublish && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                            onClick={() => handleOpenPublishConfirm(session)}
                                          >
                                            <GlobeIcon className="size-3.5 mr-2" />
                                            Công khai ngay
                                          </DropdownMenuItem>
                                        )}

                                        {canUnpublish && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-amber-700 dark:text-amber-400 focus:text-amber-700 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                            onClick={() => {
                                              setSessionToUnpublish(session);
                                              setIsSessionUnpublishAlertOpen(true);
                                            }}
                                          >
                                            <FileTextIcon className="size-3.5 mr-2" />
                                            Hủy công bố (Về bản nháp)
                                          </DropdownMenuItem>
                                        )}

                                        {session.status === "open" && (
                                          <DropdownMenuItem
                                            disabled
                                            className="text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 cursor-default opacity-90 select-none"
                                          >
                                            <CheckCircle2Icon className="size-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                            Đang công khai trên hệ thống
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuGroup>
                                    </>
                                  )}

                                  {/* Hướng dẫn công bố Đợt thi cha khi Đợt thi còn ở trạng thái nháp */}
                                  {parentPeriod?.status === "draft" &&
                                    (session.status === "draft" || session.status === "scheduled") && (
                                      <>
                                        <DropdownMenuSeparator className="my-1" />
                                        <DropdownMenuLabel className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider px-2 py-1">
                                          Cần công bố đợt thi trước
                                        </DropdownMenuLabel>
                                        <DropdownMenuGroup>
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-emerald-700 dark:text-emerald-400 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                            onClick={() => {
                                              handleTabChange("periods");
                                              toast.add({
                                                type: "info",
                                                title: "Chuyển sang Quản lý Đợt thi",
                                                description: `Đợt thi "${parentPeriod.name}" đang là Bản nháp. Nhấn "Công bố đợt thi" tại đây trước khi công khai ca thi con.`,
                                              });
                                            }}
                                          >
                                            <GlobeIcon className="size-3.5 mr-2" />
                                            Công bố đợt thi #{parentPeriod.id} trước
                                          </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                      </>
                                    )}

                                  {/* Khối Vùng nguy hiểm: Hủy hoặc Xóa ca thi */}
                                  {(canCancel || canDelete) && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuGroup>
                                        {canCancel && (
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => {
                                              setSessionToCancel(session);
                                              setIsCancelAlertOpen(true);
                                            }}
                                          >
                                            <XCircleIcon className="size-3.5 mr-2" />
                                            Hủy ca thi
                                          </DropdownMenuItem>
                                        )}
                                        {canDelete && (
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => {
                                              setSessionToCancel(session);
                                              setIsCancelAlertOpen(true);
                                            }}
                                          >
                                            <Trash2Icon className="size-3.5 mr-2" />
                                            Xóa bản nháp
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuGroup>
                                    </>
                                  )}

                                  {isLocked && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuItem
                                        disabled
                                        title={lockReason ?? undefined}
                                        className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-not-allowed select-none"
                                      >
                                        <LockIcon className="size-3.5 text-muted-foreground" />
                                        {lockReason}
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
                    {visibleSessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center gap-2">
                            <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-1">
                              <CalendarDaysIcon className="size-6" />
                            </div>
                            <p className="text-base font-semibold text-foreground">
                              Không tìm thấy ca thi phù hợp
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Không có ca thi nào khớp với từ khóa tìm kiếm hoặc các tiêu chí bộ lọc đã chọn.
                            </p>
                            {hasActiveSessionFilters && (
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

              {/* ── Pagination (Tuân thủ Project Rules 99-101) ────────────────────── */}
              <div className="flex flex-col items-center justify-between gap-3 border-t bg-card/30 p-4 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {filteredSessions.length > 0 ? (
                    <>
                      Hiển thị{" "}
                      <span className="font-semibold text-foreground">
                        {(currentSessionPage - 1) * PAGE_SIZE + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-semibold text-foreground">
                        {Math.min(currentSessionPage * PAGE_SIZE, filteredSessions.length)}
                      </span>{" "}
                      trên tổng số{" "}
                      <span className="font-semibold text-foreground">
                        {filteredSessions.length}
                      </span>{" "}
                      ca thi
                    </>
                  ) : (
                    "Không có dữ liệu hiển thị"
                  )}
                </p>

                {totalSessionPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          disabled={currentSessionPage <= 1}
                          onClick={() => updateParams({ page: String(currentSessionPage - 1) })}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalSessionPages }, (_, index) => index + 1).map(
                        (item) => {
                          // Logic hiển thị trang thông minh
                          const isFirst = item === 1;
                          const isLast = item === totalSessionPages;
                          const isNearCurrent = Math.abs(item - currentSessionPage) <= 1;

                          if (!isFirst && !isLast && !isNearCurrent) {
                            if (item === 2 && currentSessionPage > 3) {
                              return (
                                <PaginationItem key="ellipsis-start">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            if (
                              item === totalSessionPages - 1 &&
                              currentSessionPage < totalSessionPages - 2
                            ) {
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
                                isActive={item === currentSessionPage}
                                onClick={() => updateParams({ page: String(item) })}
                              >
                                {item}
                              </PaginationButton>
                            </PaginationItem>
                          );
                        }
                      )}

                      <PaginationItem>
                        <PaginationNext
                          disabled={currentSessionPage >= totalSessionPages}
                          onClick={() => updateParams({ page: String(currentSessionPage + 1) })}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Thông tin hỗ trợ */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 px-1">
        <InfoIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span>
          Dữ liệu đợt thi & ca thi được đồng bộ trực tiếp từ máy chủ API. Nhấn "Làm mới dữ liệu" để cập nhật tình trạng mới nhất.
        </span>
      </div>

      {/* ── Dialog Xem Chi Tiết Ca Thi ──────────────────────────────────────── */}
      <SessionDetailDialog
        session={selectedSessionForDetail}
        examType={examTypes.find(
          (t) => t.id === selectedSessionForDetail?.exam_type_id
        )}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onCancelSession={(session) => {
          setSessionToCancel(session);
          setIsCancelAlertOpen(true);
        }}
        onOpenPublishSchedule={handleOpenPublishSchedule}
        onPublishNow={handleOpenPublishConfirm}
        onCompleteSession={(session) => {
          setSessionToComplete(session);
          setIsSessionCompleteAlertOpen(true);
        }}
        parentPeriod={
          selectedSessionForDetail?.period_id
            ? periods.find((item) => item.id === selectedSessionForDetail.period_id)
            : undefined
        }
      />

      {/* ── Dialog Xem Chi Tiết & Chỉnh Sửa Lịch Công Khai ───────────────── */}
      <PublishScheduleDialog
        session={sessionForPublishSchedule}
        examTypes={examTypes}
        open={isPublishScheduleOpen}
        onOpenChange={setIsPublishScheduleOpen}
        onPublishNow={handleOpenPublishConfirm}
        parentPeriod={
          sessionForPublishSchedule?.period_id
            ? periods.find((item) => item.id === sessionForPublishSchedule.period_id)
            : undefined
        }
      />

      {/* ── AlertDialog: Xác Nhận Công Khai Ca Thi (Bản nháp & Lên lịch) ─────── */}
      <AlertDialog
        open={isPublishAlertOpen}
        onOpenChange={(open) => {
          setIsPublishAlertOpen(open);
          if (!open) setSessionToPublish(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <GlobeIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận công khai ca thi?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>
                Bạn có chắc chắn muốn công khai{" "}
                <span className="font-semibold text-foreground">
                  ca thi #{sessionToPublish?.id}
                </span>
                {sessionToPublish && (
                  <>
                    {" "}
                    (
                    {examTypes.find((t) => t.id === sessionToPublish.exam_type_id)
                      ?.name ?? `Kỳ thi #${sessionToPublish.exam_type_id}`}
                    {" - "}
                    {formatDateOnly(sessionToPublish.date)})
                  </>
                )}{" "}
                ngay bây giờ không?
              </p>
              {(sessionToPublish?.status === "scheduled" ||
                sessionToPublish?.exam_session_publication_status === "scheduled") && (
                  <p className="text-sky-600 dark:text-sky-400 font-medium">
                    Ca thi này đang được hẹn giờ công khai vào lúc{" "}
                    {formatDateTime(
                      sessionToPublish.publish_at ?? sessionToPublish.exam_session_publish_at,
                      true
                    )}
                    . Việc công khai ngay sẽ lập tức hiển thị ca thi cho thí sinh.
                  </p>
                )}
              <p>
                Sau khi công khai, ca thi sẽ xuất hiện trên trang đăng ký của thí sinh và các thí sinh có thể bắt đầu đăng ký thi.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={confirmPublishSession}
            >
              Công khai ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Hủy / Xóa Ca Thi (Project Rule 3 BẮT BUỘC) ────────────────── */}
      <AlertDialog
        open={isCancelAlertOpen}
        onOpenChange={(open) => {
          setIsCancelAlertOpen(open);
          if (!open) setSessionToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {sessionToCancel?.status === "draft" || sessionToCancel?.status === "scheduled"
                ? `Xác nhận xóa bản nháp ca thi #${sessionToCancel?.id}?`
                : `Xác nhận hủy ca thi #${sessionToCancel?.id}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {sessionToCancel?.status === "draft" || sessionToCancel?.status === "scheduled"
                ? "Bạn có chắc chắn muốn xóa bản nháp ca thi này không? Bản nháp và toàn bộ ghế ngồi liên quan sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu."
                : "Bạn có chắc chắn muốn hủy ca thi này không? Ca thi sau khi hủy sẽ đóng toàn bộ tiếp nhận thí sinh và chuyển trạng thái sang 'Đã hủy'. Hành động này không thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              {sessionToCancel?.status === "draft" || sessionToCancel?.status === "scheduled"
                ? "Không, giữ lại bản nháp"
                : "Không, giữ lại ca thi"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full cursor-pointer hover:bg-destructive/90 text-xs font-medium"
              onClick={confirmCancelSession}
            >
              {sessionToCancel?.status === "draft" || sessionToCancel?.status === "scheduled"
                ? "Xác nhận xóa bản nháp"
                : "Xác nhận hủy ca thi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Hủy / Xóa Đợt Thi ─────────────────────────────────── */}
      <AlertDialog
        open={isPeriodCancelAlertOpen}
        onOpenChange={(open) => {
          setIsPeriodCancelAlertOpen(open);
          if (!open) setPeriodToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {periodToCancel?.status === "draft"
                ? `Xác nhận xóa bản nháp đợt thi "${periodToCancel?.name}"?`
                : `Xác nhận hủy đợt thi "${periodToCancel?.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {periodToCancel?.status === "draft"
                ? "Bạn có chắc chắn muốn xóa bản nháp đợt thi này không? Bản nháp đợt thi cùng các ca thi con chưa công bố sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu."
                : "Bạn có chắc chắn muốn hủy đợt thi này không? Đợt thi sau khi hủy sẽ đóng toàn bộ tiếp nhận thí sinh ở tất cả ca thi con và chuyển trạng thái sang 'Đã hủy'. Hành động này không thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              {periodToCancel?.status === "draft"
                ? "Không, giữ lại bản nháp"
                : "Không, giữ lại đợt thi"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full cursor-pointer hover:bg-destructive/90 text-xs font-medium"
              onClick={confirmCancelPeriod}
            >
              {periodToCancel?.status === "draft"
                ? "Xác nhận xóa bản nháp"
                : "Xác nhận hủy đợt thi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog Tạo Đợt Thi Mới ────────────────────────────────────────── */}
      <CreatePeriodDialog
        open={isCreatePeriodOpen}
        onOpenChange={setIsCreatePeriodOpen}
      />

      {/* ── Dialog Chỉnh Sửa Đợt Thi ──────────────────────────────────────── */}
      <EditPeriodDialog
        period={periodToEdit}
        open={!!periodToEdit}
        onOpenChange={(open) => !open && setPeriodToEdit(null)}
        onOpenReschedule={(period) => {
          setPeriodToEdit(null);
          setPeriodToReschedule(period);
        }}
      />

      {/* ── Dialog Nhân Bản Đợt Thi ACID ──────────────────────────────────── */}
      <DuplicatePeriodDialog
        period={periodToDuplicate}
        open={!!periodToDuplicate}
        onOpenChange={(open) => !open && setPeriodToDuplicate(null)}
      />

      {/* ── Dialog Dời Lịch Thi (Bất Khả Kháng) ────────────────────────────── */}
      <ReschedulePeriodDialog
        period={periodToReschedule}
        open={!!periodToReschedule}
        onOpenChange={(open) => !open && setPeriodToReschedule(null)}
      />

      {/* ── Dialog Xem Chi Tiết Đợt Thi & Danh Sách Ca Thi Con ────────────── */}
      <PeriodDetailDialog
        periodId={selectedPeriodIdForDetail}
        examTypes={examTypes}
        open={selectedPeriodIdForDetail !== null}
        onOpenChange={(open) => !open && setSelectedPeriodIdForDetail(null)}
        onPublishPeriod={(period) => {
          setPeriodForAction(period);
          setPeriodActionType("publish");
          setIsPeriodActionAlertOpen(true);
        }}
        onEditPeriod={(period) => setPeriodToEdit(period)}
        onDuplicatePeriod={(period) => setPeriodToDuplicate(period)}
        onReschedulePeriod={(period) => setPeriodToReschedule(period)}
        onEditSession={(session: ExamSession) => setSessionToEdit(session)}
      />

      {/* ── Dialog Chỉnh Sửa Ca Thi ───────────────────────────────────────── */}
      <EditSessionDialog
        session={sessionToEdit}
        examTypes={examTypes}
        open={!!sessionToEdit}
        onOpenChange={(open) => !open && setSessionToEdit(null)}
        parentPeriod={
          sessionToEdit?.period_id
            ? periods.find((item) => item.id === sessionToEdit.period_id)
            : undefined
        }
      />

      {/* ── AlertDialog Đóng Đăng Ký Sớm (Đợt thi / Ca thi) ────────────────── */}
      <CloseRegistrationAlertDialog
        target={closeRegTarget}
        open={!!closeRegTarget}
        onOpenChange={(open) => !open && setCloseRegTarget(null)}
      />

      {/* ── Dialog Mở Lại Cổng Đăng Ký (Đợt thi / Ca thi) ──────────────────── */}
      <ReopenRegistrationDialog
        target={reopenTarget}
        open={!!reopenTarget}
        onOpenChange={(open) => !open && setReopenTarget(null)}
      />

      {/* ── AlertDialog: Xác Nhận Thao Tác Đợt Thi (Công bố, Thu hồi, Hoàn tất) ── */}
      <PeriodActionConfirmationDialog
        period={periodForAction}
        actionType={periodActionType}
        open={isPeriodActionAlertOpen}
        onOpenChange={(open) => {
          setIsPeriodActionAlertOpen(open);
          if (!open) {
            setPeriodForAction(null);
            setPeriodActionType(null);
          }
        }}
        onConfirm={handleConfirmPeriodAction}
      />

      {/* ── AlertDialog: Session Completion Safeguard (Bất khả đảo ngược) ──── */}
      <SessionCompletionSafeguardDialog
        session={sessionToComplete}
        examType={examTypes.find((t) => t.id === sessionToComplete?.exam_type_id)}
        open={isSessionCompleteAlertOpen}
        onOpenChange={(open) => {
          setIsSessionCompleteAlertOpen(open);
          if (!open) setSessionToComplete(null);
        }}
        onConfirm={handleConfirmCompleteSession}
      />

      {/* ── AlertDialog: Xác Nhận Hủy Công Bố Ca Thi Về Bản Nháp ───────────── */}
      <AlertDialog
        open={isSessionUnpublishAlertOpen}
        onOpenChange={(open) => {
          setIsSessionUnpublishAlertOpen(open);
          if (!open) setSessionToUnpublish(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <FileTextIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận hủy công bố ca thi #{sessionToUnpublish?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Ca thi sẽ được thu hồi lịch hẹn giờ công khai và quay trở về trạng thái{" "}
              <strong>Bản nháp (Draft)</strong>. Ca thi sẽ không tự động phát hành cho thí sinh cho đến khi được công khai hoặc lên lịch lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ, giữ nguyên
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
              onClick={handleConfirmUnpublishSession}
            >
              Xác nhận về bản nháp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
