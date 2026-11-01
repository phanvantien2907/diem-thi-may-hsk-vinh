import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "./+types/quan-ly-ho-so-dang-ky";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import { rejectCandidateSchema, type RejectCandidateFormValues } from "~/lib/schemas/admin-candidate";
import { CandidateAuditLogDialog } from "~/components/dashboard/CandidateAuditLogDialog";
import type {
  AdminCandidateResponseDTO,
  ApiEnvelope,
  CandidateMetrics,
  CandidateRowActions,
  DuplicateCandidateItem,
  PaginationMeta,
} from "~/types/admin";
import {
  UsersRoundIcon,
  SearchIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  EyeIcon,
  DownloadIcon,
  RotateCcwIcon,
  XIcon,
  CalendarIcon,
  GraduationCapIcon,
  CopyIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  FileTextIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  Image as ImageIcon,
  BuildingIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileCheckIcon,
  HistoryIcon,
  HashIcon,
  ScanSearchIcon,
  Undo2Icon,
  UserXIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
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
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationButton,
} from "~/components/ui/pagination";
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
import { toast } from "~/components/ui/toast";
import { useLoaderData, useSearchParams, useFetcher, useRevalidator } from "react-router";
import { useDebouncedCallback, useThrottledCallback } from "~/hooks/use-debounce";

// ─── Metadata chuẩn theo Project Rules (Rule 8) ──────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Hồ sơ Đăng ký" },
  {
    name: "description",
    content: "Phê duyệt giấy tờ tùy thân, kiểm tra hồ sơ trùng lặp và xác nhận hồ sơ thí sinh dự thi HSK.",
  },
];

import {
  CandidateDetailDialog,
  EmptyFieldBadge,
  renderFieldOrBadge,
  formatGender,
  formatDateOrBadge,
} from "~/components/dashboard/CandidateDetailDialog";
import { maskAddress, maskDocumentNumber, maskEmail, maskPhoneNumber } from "~/lib/mask";

export { EmptyFieldBadge, renderFieldOrBadge, formatGender, formatDateOrBadge };

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatDateTime(value: string | null | undefined, includeSeconds = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (!includeSeconds) {
    return `${d}/${m}/${y} ${hh}:${mm}`;
  }
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

// ─── Types & DTOs: định nghĩa tại ~/types/admin (Project Rules) ──────────────
export type {
  AdminCandidateResponseDTO,
  CandidateDocument,
  CandidateMetrics,
  DuplicateCandidateItem,
  PaginationMeta,
} from "~/types/admin";

/** Ma trận hành động theo trạng thái giấy tờ — quyết định item nào hiển thị trong dropdown */
function getCandidateActions(c: AdminCandidateResponseDTO): CandidateRowActions {
  const doc = c.latest_document;
  const status = doc?.verification_status;
  return {
    canApprove: Boolean(doc) && status === "pending",
    canReject: Boolean(doc) && status === "pending",
    canReapprove: Boolean(doc) && status === "rejected",
    canRevoke: Boolean(doc) && status === "verified",
    canCheckDuplicate: Boolean(doc?.doc_number),
    canCopyDocNumber: Boolean(doc?.doc_number),
    canCopyPhone: Boolean(c.phone?.trim()),
    canEmail: Boolean(c.email?.trim()),
    canDisableAccount: Number.isInteger(c.account_id) && c.account_id > 0,
  };
}

function copyToClipboard(value: string, title: string) {
  if (!navigator.clipboard) {
    toast.add({ type: "error", title: "Trình duyệt không hỗ trợ sao chép" });
    return;
  }
  navigator.clipboard.writeText(value).then(
    () => toast.add({ type: "info", title, description: value }),
    () => toast.add({ type: "error", title: "Không thể sao chép", description: "Vui lòng thử lại." })
  );
}

type CandidateIntent = "approve" | "reject" | "reapprove" | "revoke" | "disable-account" | "clear-cache";

type ActionResult =
  | { success: true; intent: CandidateIntent; message: string; error?: undefined }
  | { success?: false; intent?: CandidateIntent; error: string; message?: undefined };

// ─── Dữ liệu mẫu Fallback khi Database môi trường Dev chưa có bản ghi ────────
const fallbackSampleCandidates: AdminCandidateResponseDTO[] = [
  {
    id: 1,
    account_id: 101,
    full_name: "Nguyễn Văn An",
    full_name_cn: "阮文安",
    dob: "2002-04-15T00:00:00Z",
    gender: "male",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 3,
    phone: "0912345678",
    email: "nguyenvanan@gmail.com",
    exam_level: "HSK 4 & HSKK Trung cấp",
    created_at: "2026-10-02T08:15:00Z",
    latest_document: {
      id: 1,
      candidate_id: 1,
      doc_type: "cccd",
      doc_number: "038099012345",
      issue_date: "2021-05-20T00:00:00Z",
      issue_place: "Cục Cảnh sát QLHC về TTXH",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      verification_status: "pending",
      address_detail: "Xã Hưng Lộc, Thành phố Vinh, Tỉnh Nghệ An",
    },
  },
  {
    id: 2,
    account_id: 102,
    full_name: "Trần Thị Mai",
    full_name_cn: "陈氏梅",
    dob: "2001-11-20T00:00:00Z",
    gender: "female",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 4,
    phone: "0987654321",
    email: "tranmai2001@gmail.com",
    exam_level: "HSK 5 & HSKK Cao cấp",
    created_at: "2026-10-01T16:40:00Z",
    latest_document: {
      id: 2,
      candidate_id: 2,
      doc_type: "cccd",
      doc_number: "040098005678",
      issue_date: "2020-08-12T00:00:00Z",
      issue_place: "Cục Cảnh sát QLHC về TTXH",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      verification_status: "verified",
      address_detail: "Phường Trường Thi, Thành phố Vinh, Tỉnh Nghệ An",
    },
  },
  {
    id: 3,
    account_id: 103,
    full_name: "Lê Hoàng Long",
    full_name_cn: "黎黄龙",
    dob: "2000-09-05T00:00:00Z",
    gender: "male",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 2,
    phone: "0934567890",
    email: "long.lh@gmail.com",
    exam_level: "HSK 3 & HSKK Sơ cấp",
    created_at: "2026-10-02T07:30:00Z",
    latest_document: {
      id: 3,
      candidate_id: 3,
      doc_type: "cccd",
      doc_number: "038097009876",
      issue_date: "2019-12-05T00:00:00Z",
      issue_place: "Cục Cảnh sát QLHC về TTXH",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      verification_status: "pending",
      address_detail: "Xã Nghi Phú, Thành phố Vinh, Tỉnh Nghệ An",
    },
  },
  {
    id: 4,
    account_id: 104,
    full_name: "Phạm Thu Hương",
    full_name_cn: "范秋香",
    dob: "2003-08-12T00:00:00Z",
    gender: "female",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 5,
    phone: "0971234567",
    email: "thuhuong03@gmail.com",
    exam_level: "HSK 6 & HSKK Cao cấp",
    created_at: "2026-09-30T14:20:00Z",
    latest_document: {
      id: 4,
      candidate_id: 4,
      doc_type: "cccd",
      doc_number: "042099003412",
      issue_date: "2021-03-10T00:00:00Z",
      issue_place: "Cục Cảnh sát QLHC về TTXH",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      verification_status: "rejected",
      rejection_reason: "Ảnh CCCD chụp bị lóa ánh sáng đèn, góc dưới bên phải bị mờ không đọc được thông tin nơi cấp.",
      address_detail: "Phường Bến Thủy, Thành phố Vinh, Tỉnh Nghệ An",
    },
  },
  {
    id: 5,
    account_id: 105,
    full_name: "Hoàng Gia Huy",
    full_name_cn: "黄嘉辉",
    dob: "2001-03-25T00:00:00Z",
    gender: "male",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 3,
    phone: "0968112233",
    email: "giahuy.hoang@gmail.com",
    exam_level: "HSK 4 & HSKK Trung cấp",
    created_at: "2026-10-02T09:10:00Z",
    latest_document: {
      id: 5,
      candidate_id: 5,
      doc_type: "cccd",
      doc_number: "038099023456",
      issue_date: "2021-09-18T00:00:00Z",
      issue_place: "Cục Cảnh sát QLHC về TTXH",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      verification_status: "verified",
      address_detail: "Phường Lê Lợi, Thành phố Vinh, Tỉnh Nghệ An",
    },
  },
  {
    id: 6,
    account_id: 106,
    full_name: "Vũ Thị Bích Ngọc",
    full_name_cn: "武氏碧玉",
    dob: "2002-12-18T00:00:00Z",
    gender: "female",
    nationality: "Việt Nam",
    ethnicity: "Kinh",
    religion: "Không",
    chinese_study_years: 2,
    phone: "0945998877",
    email: "bichngoc.vu@gmail.com",
    exam_level: "HSK 3 & HSKK Sơ cấp",
    created_at: "2026-10-03T10:05:00Z",
    latest_document: {
      id: 6,
      candidate_id: 6,
      doc_type: "passport",
      doc_number: "P01928374",
      issue_date: "2022-01-15T00:00:00Z",
      issue_place: "Cục Quản lý Xuất nhập cảnh",
      front_image_url: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80",
      back_image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      portrait_image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      verification_status: "pending",
      address_detail: "Thị xã Cửa Lò, Tỉnh Nghệ An",
    },
  },
];

// ─── React Router v7 Loader ──────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  // JWT chỉ dùng phía server — KHÔNG trả về client
  const { user, token } = await requireAdminAuth(request);
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const search = url.searchParams.get("search") || "";
  const tab = url.searchParams.get("tab") || "all";
  const level = url.searchParams.get("level") || "";
  const examDate = url.searchParams.get("exam_date") || "";

  let status = "";
  if (tab === "pending") status = "pending";
  if (tab === "approved") status = "verified";
  if (tab === "rejected") status = "rejected";

  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", "10"); // Rule 7: pageSize = 10
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (level && level !== "all") params.set("level", level);
  if (examDate && examDate !== "all") params.set("exam_date", examDate);

  const [candidatesRes, metricsRes, sessionsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/admin/candidates?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
    fetch(`${API_BASE_URL}/api/v1/admin/candidates/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
    fetch(`${API_BASE_URL}/api/v1/admin/exam-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
  ]);

  let candidates: AdminCandidateResponseDTO[] = [];
  let meta: PaginationMeta = {
    page: Number(page) || 1,
    per_page: 10,
    total_items: 0,
    total_pages: 1,
  };
  let metrics: CandidateMetrics = {
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  };
  let examDates: string[] = [];

  let isApiData = false;

  if (candidatesRes && candidatesRes.ok) {
    const json = await candidatesRes.json().catch(() => null);
    if (json?.success) {
      candidates = json.data || [];
      if (json.meta) meta = json.meta;
      isApiData = true;
    }
  }

  if (metricsRes && metricsRes.ok) {
    const json = await metricsRes.json().catch(() => null);
    if (json?.success && json.data) {
      metrics = json.data;
    }
  }

  if (sessionsRes && sessionsRes.ok) {
    const json = await sessionsRes.json().catch(() => null);
    if (json?.success && Array.isArray(json.data)) {
      const datesSet = new Set<string>();
      (json.data as { date?: string | null }[]).forEach((s) => {
        if (s.date) datesSet.add(s.date.split("T")[0]);
      });
      examDates = Array.from(datesSet).sort();
    }
  }

  // Graceful fallback nếu DB trống chưa có dữ liệu và metrics = 0
  if (candidates.length === 0 && metrics.total === 0 && !isApiData) {
    let filtered = [...fallbackSampleCandidates];
    if (tab === "pending") filtered = filtered.filter((c) => c.latest_document?.verification_status === "pending");
    if (tab === "approved") filtered = filtered.filter((c) => c.latest_document?.verification_status === "verified");
    if (tab === "rejected") filtered = filtered.filter((c) => c.latest_document?.verification_status === "rejected");
    if (level && level !== "all") filtered = filtered.filter((c) => c.exam_level?.includes(level));
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.latest_document?.doc_number.includes(q)
      );
    }

    candidates = filtered;
    metrics = {
      total: fallbackSampleCandidates.length,
      pending: fallbackSampleCandidates.filter((c) => c.latest_document?.verification_status === "pending").length,
      verified: fallbackSampleCandidates.filter((c) => c.latest_document?.verification_status === "verified").length,
      rejected: fallbackSampleCandidates.filter((c) => c.latest_document?.verification_status === "rejected").length,
    };
    meta = {
      page: 1,
      per_page: 10,
      total_items: filtered.length,
      total_pages: Math.ceil(filtered.length / 10) || 1,
    };
  }

  return {
    user,
    candidates,
    meta,
    metrics,
    tab,
    search,
    level,
    examDate,
    examDates,
  };
}

// ─── React Router v7 Action ──────────────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAdminAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  const candidateId = formData.get("candidate_id")?.toString();

  // Helper bust cache Redis ngay sau các thao tác thay đổi trạng thái
  const clearCandidatesCache = async () => {
    await fetch(`${API_BASE_URL}/api/v1/admin/candidates/clear-cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  };

  if (intent === "approve") {
    if (!candidateId) return { error: "Thiếu ID thí sinh" };
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/candidates/${candidateId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => null);
      return { error: err?.msg || "Không thể phê duyệt hồ sơ thí sinh." };
    }
    await clearCandidatesCache();
    return { success: true, intent: "approve", message: "Đã phê duyệt hồ sơ thí sinh thành công." };
  }

  if (intent === "reapprove") {
    if (!candidateId) return { error: "Thiếu ID thí sinh" };
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/candidates/${candidateId}/approve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => null);
      return { error: err?.msg || "Không thể phê duyệt lại hồ sơ thí sinh." };
    }
    await clearCandidatesCache();
    return { success: true, intent: "reapprove", message: "Đã phê duyệt lại hồ sơ thí sinh thành công." };
  }

  if (intent === "reject" || intent === "revoke") {
    if (!candidateId) return { error: "Thiếu ID thí sinh" };
    const reasonRaw = formData.get("reason")?.toString() || "";
    const parsed = rejectCandidateSchema.safeParse({ reason: reasonRaw });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Lý do không hợp lệ (tối đa 500 ký tự)." };
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/candidates/${candidateId}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: parsed.data.reason }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => null);
      return {
        error:
          err?.msg ||
          (intent === "revoke" ? "Không thể thu hồi phê duyệt hồ sơ." : "Không thể từ chối hồ sơ thí sinh."),
      };
    }
    await clearCandidatesCache();
    return {
      success: true,
      intent,
      message:
        intent === "revoke"
          ? "Đã thu hồi phê duyệt và gửi thông báo tới thí sinh."
          : "Đã gửi thông báo từ chối hồ sơ tới thí sinh.",
    };
  }

  if (intent === "disable-account") {
    const accountId = formData.get("account_id")?.toString();
    if (!accountId) return { error: "Thiếu ID tài khoản cần vô hiệu hóa" };
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/delete-account/${accountId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => null);
      return { error: err?.msg || "Không thể vô hiệu hóa tài khoản thí sinh." };
    }
    await clearCandidatesCache();
    return {
      success: true,
      intent: "disable-account",
      message: "Đã vô hiệu hóa tài khoản thí sinh thành công.",
    };
  }

  if (intent === "clear-cache") {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/candidates/clear-cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => null);
      return { error: err?.msg || "Không thể xoá bộ nhớ đệm thí sinh." };
    }
    const json = await res.json().catch(() => null);
    return {
      success: true,
      intent: "clear-cache",
      message: (json && json.data && json.data.message) || "Đã làm mới toàn bộ bộ nhớ đệm thí sinh trên Redis.",
    };
  }

  return { error: "Hành động không hợp lệ" };
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function QuanLyHoSoDangKyPage() {
  const {
    candidates,
    meta,
    metrics,
    tab,
    search,
    level,
    examDate,
    examDates,
  } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = React.useState(search);
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Throttled refresh (1000ms): Ngăn chặn spam click nút làm mới liên tục
  const handleRefresh = useThrottledCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetch("/internal/admin/system/clear-cache?target=candidates", { method: "POST" });
      toast.add({
        type: "success",
        title: "Làm mới dữ liệu thành công",
        description: "Đã làm mới bộ nhớ đệm hồ sơ và đồng bộ dữ liệu mới nhất.",
      });
      revalidator.revalidate();
    } catch {
      revalidator.revalidate();
    } finally {
      setIsRefreshing(false);
    }
  }, 1000);

  // State Modal Chi tiết thí sinh & thẩm định giấy tờ (API §3.10)
  const [selectedCandidate, setSelectedCandidate] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // State Dialog Lịch sử thao tác (Audit Log - API §11.1)
  const [auditLogCandidate, setAuditLogCandidate] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [isAuditLogOpen, setIsAuditLogOpen] = React.useState(false);

  // State Dialog Từ chối / Thu hồi kèm lý do (RHF + Zod theo chuẩn dự án)
  const [candidateToReject, setCandidateToReject] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [rejectMode, setRejectMode] = React.useState<"reject" | "revoke">("reject");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    setValue: setRejectValue,
    reset: resetRejectForm,
    formState: { errors: rejectErrors },
  } = useForm<RejectCandidateFormValues>({
    resolver: zodResolver(rejectCandidateSchema),
    defaultValues: { reason: "" },
  });

  // State Dialog Phê duyệt lại hồ sơ đã từ chối
  const [candidateToReapprove, setCandidateToReapprove] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [isReapproveAlertOpen, setIsReapproveAlertOpen] = React.useState(false);

  // State Dialog Vô hiệu hóa tài khoản thí sinh (§2.13)
  const [candidateToDisable, setCandidateToDisable] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [isDisableAlertOpen, setIsDisableAlertOpen] = React.useState(false);

  // State Dialog Quét hồ sơ trùng lặp (API §3.11)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = React.useState(false);
  const [duplicateList, setDuplicateList] = React.useState<DuplicateCandidateItem[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = React.useState(false);
  const [targetDocNumber, setTargetDocNumber] = React.useState<string | null>(null);

  // State Dialog Xuất danh sách PDF (API §3.9)
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [exportExamDate, setExportExamDate] = React.useState(examDate || examDates[0] || "2026-11-27");
  const [exportStatus, setExportStatus] = React.useState("all");
  const [exportLevel, setExportLevel] = React.useState("all");
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  // State Xem ảnh phóng to
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);

  // Đồng bộ search term khi url thay đổi
  React.useEffect(() => {
    setQuery(search);
  }, [search]);

  // Xử lý thông báo sau khi fetcher thực thi action (guarded against revalidation loops)
  const lastHandledFetcherRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (fetcher.data && fetcher.state === "idle" && fetcher.data !== lastHandledFetcherRef.current) {
      lastHandledFetcherRef.current = fetcher.data;
      const data = fetcher.data as any;
      if (data.success) {
        toast.add({
          type: "success",
          title: "Thao tác thành công",
          description: data.message || "Hệ thống đã cập nhật trạng thái hồ sơ.",
        });
        setIsRejectDialogOpen(false);
        setIsReapproveAlertOpen(false);
        setIsDisableAlertOpen(false);
        setIsDetailOpen(false);
        resetRejectForm({ reason: "" });
      } else if (data.error) {
        toast.add({
          type: "error",
          title: "Không thể hoàn thành",
          description: data.error,
        });
      }
    }
  }, [fetcher.data, fetcher.state, resetRejectForm]);

  // Hàm updateParams chuẩn theo temple quan-ly-ky-thi-ca-thi.tsx
  const updateParams = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, val]) => {
        // "all" là một tab hợp lệ; chỉ các bộ lọc mới cần xoá tham số khi chọn "all".
        if (key === "tab" && val === "all") {
          params.set(key, val);
        } else if (val === null || val === "" || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      setSearchParams(params, { preventScrollReset: true });
    },
    [searchParams, setSearchParams]
  );

  // Debounce (350ms) cập nhật URL params
  const debouncedUpdateSearch = useDebouncedCallback((val: string) => {
    const trimmed = val.trim();
    if (trimmed !== (search || "")) {
      updateParams({ search: trimmed || null, page: null });
    }
  }, 350);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    debouncedUpdateSearch(val);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      debouncedUpdateSearch.flush(query);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    debouncedUpdateSearch.cancel();
    updateParams({ search: null, page: null });
  };

  const handleResetFilters = () => {
    setQuery("");
    debouncedUpdateSearch.cancel();
    setSearchParams(new URLSearchParams(), { preventScrollReset: true });
  };

  const hasActiveFilters = Boolean(
    search ||
    (tab && tab !== "all") ||
    (level && level !== "all") ||
    (examDate && examDate !== "all")
  );

  // Thao tác duyệt nhanh từ hàng bảng
  const handleQuickApprove = (candidate: AdminCandidateResponseDTO) => {
    fetcher.submit(
      { intent: "approve", candidate_id: String(candidate.id) },
      { method: "post" }
    );
  };

  // Mở Dialog Từ chối / Thu hồi
  const handleOpenReject = (candidate: AdminCandidateResponseDTO, mode: "reject" | "revoke" = "reject") => {
    setCandidateToReject(candidate);
    setRejectMode(mode);
    resetRejectForm({
      reason:
        mode === "revoke"
          ? "Thu hồi phê duyệt để thí sinh chụp lại ảnh giấy tờ rõ nét hơn"
          : "Ảnh CCCD bị mờ, không đọc được thông tin",
    });
    setIsRejectDialogOpen(true);
  };

  // Xác nhận từ chối / thu hồi (qua form validation)
  const onSubmitReject = (data: RejectCandidateFormValues) => {
    if (!candidateToReject) return;
    fetcher.submit(
      {
        intent: rejectMode,
        candidate_id: String(candidateToReject.id),
        reason: data.reason.trim(),
      },
      { method: "post" }
    );
  };

  // Mở Dialog Phê duyệt lại
  const handleOpenReapprove = (candidate: AdminCandidateResponseDTO) => {
    setCandidateToReapprove(candidate);
    setIsReapproveAlertOpen(true);
  };

  const handleConfirmReapprove = () => {
    if (!candidateToReapprove) return;
    fetcher.submit(
      { intent: "reapprove", candidate_id: String(candidateToReapprove.id) },
      { method: "post" }
    );
  };

  // Mở Dialog Vô hiệu hóa tài khoản
  const handleOpenDisableAccount = (candidate: AdminCandidateResponseDTO) => {
    setCandidateToDisable(candidate);
    setIsDisableAlertOpen(true);
  };

  const handleConfirmDisableAccount = () => {
    if (!candidateToDisable || !candidateToDisable.account_id) return;
    fetcher.submit(
      { intent: "disable-account", account_id: String(candidateToDisable.account_id) },
      { method: "post" }
    );
  };

  // Quét hồ sơ trùng lặp (qua resource route an toàn phía server)
  const handleScanDuplicates = async (filterDoc?: string) => {
    setTargetDocNumber(filterDoc || null);
    setIsScanningDuplicates(true);
    setIsDuplicateDialogOpen(true);
    try {
      const res = await fetch("/internal/admin/candidates/duplicates");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDuplicateList(json.data || []);
        } else {
          setDuplicateList([]);
        }
      } else {
        setDuplicateList([]);
      }
    } catch {
      setDuplicateList([]);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  // Xuất file PDF danh sách thí sinh (qua resource route an toàn)
  const handleExportPdf = async () => {
    if (!exportExamDate) {
      toast.add({
        type: "error",
        title: "Thiếu ngày thi",
        description: "Vui lòng chọn ngày thi để xuất danh sách theo đúng quy định.",
      });
      return;
    }

    setIsExportingPdf(true);
    try {
      const exportParams = new URLSearchParams();
      exportParams.set("exam_date", exportExamDate);
      exportParams.set("status", exportStatus || "all");
      if (exportLevel && exportLevel !== "all") exportParams.set("level", exportLevel);
      if (search) exportParams.set("search", search);

      const res = await fetch(`/internal/admin/candidates/export?${exportParams.toString()}`);

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.msg || errJson?.error || "Lỗi tải file PDF từ máy chủ.");
      }

      const contentType = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if (contentType !== "application/pdf") {
        const responseText = await res.text().catch(() => "");
        throw new Error(
          responseText || "Máy chủ không trả về tệp PDF hợp lệ. Vui lòng kiểm tra API xuất PDF."
        );
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Tệp PDF từ máy chủ đang rỗng, không thể tải xuống.");
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const contentDisposition = res.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = filenameMatch?.[1]
        ? decodeURIComponent(filenameMatch[1])
        : `candidates_${exportExamDate}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.add({
        type: "success",
        title: "Xuất dữ liệu thành công",
        description: `Tệp PDF danh sách đợt thi ${formatDateOnly(exportExamDate)} đã được tải xuống.`,
      });
      setIsExportDialogOpen(false);
    } catch (err: any) {
      toast.add({
        type: "error",
        title: "Không thể xuất PDF",
        description: err?.message || "Có lỗi xảy ra khi tạo tệp PDF.",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Page Header Chuẩn ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hồ sơ Đăng ký
            </h1>
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Redis Cache: 6h
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Xác minh danh tính thí sinh, kiểm tra căn cước công dân và phê duyệt giấy tờ dự thi HSK.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || revalidator.state === "loading"}
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm h-9 shadow-2xs"
            title="Làm mới bộ nhớ đệm và đồng bộ dữ liệu hồ sơ mới nhất"
          >
            <RefreshCwIcon className={`size-3.5 mr-1.5 ${isRefreshing || revalidator.state === "loading" ? "animate-spin" : ""}`} />
            {isRefreshing || revalidator.state === "loading" ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleScanDuplicates()}
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm h-9"
          >
            <AlertTriangleIcon className="size-4 mr-1.5 text-amber-500" />
            Quét hồ sơ trùng
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm h-9"
          >
            <DownloadIcon className="size-4 mr-1.5 text-primary" />
            Xuất danh sách
          </Button>
        </div>
      </div>

      {/* ── 2. KPI Cards (Thống kê chuẩn theo temple) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng thí sinh */}
        <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-primary/40">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng thí sinh đăng ký</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <UsersRoundIcon className="size-4.5" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {metrics.total.toLocaleString("vi-VN")}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Hồ sơ lưu trữ trên hệ thống</span>
              </div>
            </div>
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Toàn bộ đợt thi</span>
              <span className="font-medium text-foreground">100% dữ liệu</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Chờ duyệt */}
        <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-500/40">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Hồ sơ chờ phê duyệt</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ClockIcon className="size-4.5" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {metrics.pending.toLocaleString("vi-VN")}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Cần thẩm định CCCD/Hộ chiếu</span>
              </div>
            </div>
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Ưu tiên xử lý</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{metrics.pending} hồ sơ</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Đã duyệt */}
        <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-emerald-500/40">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Đã duyệt hợp lệ</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2Icon className="size-4.5" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {metrics.verified.toLocaleString("vi-VN")}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2Icon className="size-3.5" />
                <span>Đủ điều kiện xuất thẻ dự thi</span>
              </div>
            </div>
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Tỷ lệ hoàn thành</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {metrics.total > 0 ? `${Math.round((metrics.verified / metrics.total) * 100)}%` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Từ chối */}
        <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-destructive/40">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Hồ sơ từ chối / cần sửa</span>
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <XCircleIcon className="size-4.5" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                {metrics.rejected.toLocaleString("vi-VN")}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <XCircleIcon className="size-3.5" />
                <span>Đã thông báo nộp lại</span>
              </div>
            </div>
            <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Hồ sơ có sai lệch</span>
              <span className="font-semibold text-destructive">{metrics.rejected} hồ sơ</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Table Card Chuẩn Temple quan-ly-ky-thi-ca-thi.tsx ───────────── */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-2xs">
        <CardHeader className="gap-3.5 border-b bg-card/50 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Hàng 1: Tabs bộ lọc */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-full w-fit max-w-full overflow-x-auto">
                <button
                  type="button"
                  onClick={() => updateParams({ tab: "all", page: null })}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium whitespace-nowrap ${tab === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Tất cả ({metrics.total})
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ tab: "pending", page: null })}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium whitespace-nowrap ${tab === "pending"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Chờ duyệt ({metrics.pending})
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ tab: "approved", page: null })}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium whitespace-nowrap ${tab === "approved"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Đã duyệt ({metrics.verified})
                </button>
                <button
                  type="button"
                  onClick={() => updateParams({ tab: "rejected", page: null })}
                  className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium whitespace-nowrap ${tab === "rejected"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Từ chối ({metrics.rejected})
                </button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-auto">
                <ShieldCheckIcon className="size-4 text-primary shrink-0" />
                <span>Quy trình xác minh danh tính 3 bước</span>
              </div>
            </div>

            {/* Hàng 2: Toolbar tìm kiếm + Select Filters + Nút Reset */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-full lg:max-w-md">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Tìm theo họ tên thí sinh hoặc số CCCD..."
                  className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns Group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {/* Lọc Cấp độ HSK */}
                <Select
                  value={level || "all"}
                  onValueChange={(val) => updateParams({ level: val, page: null })}
                >
                  <SelectTrigger className="h-9 w-full sm:w-44 rounded-full px-3 text-xs cursor-pointer">
                    <SelectValue placeholder="Mọi cấp độ HSK">
                      {(val) => {
                        const current = val ?? level;
                        if (!current || current === "all") return "Mọi cấp độ HSK";
                        return current;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem value="all" className="cursor-pointer text-xs">Mọi cấp độ HSK</SelectItem>
                      <SelectItem value="HSK 1" className="cursor-pointer text-xs">HSK 1</SelectItem>
                      <SelectItem value="HSK 2" className="cursor-pointer text-xs">HSK 2</SelectItem>
                      <SelectItem value="HSK 3" className="cursor-pointer text-xs">HSK 3</SelectItem>
                      <SelectItem value="HSK 4" className="cursor-pointer text-xs">HSK 4</SelectItem>
                      <SelectItem value="HSK 5" className="cursor-pointer text-xs">HSK 5</SelectItem>
                      <SelectItem value="HSK 6" className="cursor-pointer text-xs">HSK 6</SelectItem>
                      <SelectItem value="HSKK" className="cursor-pointer text-xs">HSKK Khẩu ngữ</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Lọc Ngày thi nếu có danh sách */}
                {examDates.length > 0 && (
                  <Select
                    value={examDate || "all"}
                    onValueChange={(val) => updateParams({ exam_date: val, page: null })}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-40 rounded-full px-3 text-xs cursor-pointer">
                      <SelectValue placeholder="Mọi ngày thi">
                        {(val) => {
                          const current = val ?? examDate;
                          if (!current || current === "all") return "Mọi ngày thi";
                          return formatDateOnly(current);
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectGroup>
                        <SelectItem value="all" className="cursor-pointer text-xs">Mọi ngày thi</SelectItem>
                        {examDates.map((dateStr) => (
                          <SelectItem key={dateStr} value={dateStr} className="cursor-pointer text-xs">
                            {formatDateOnly(dateStr)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}

                {/* Nút Đặt lại nếu có filter */}
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
          </div>
        </CardHeader>

        {/* ── Table Container ─────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                <TableHead className="w-[85px] py-3 text-xs font-semibold text-muted-foreground pl-5">
                  Số CCCD
                </TableHead>
                <TableHead className="min-w-[220px] py-3 text-xs font-semibold text-muted-foreground">
                  Họ và tên thí sinh
                </TableHead>
                <TableHead className="min-w-[200px] py-3 text-xs font-semibold text-muted-foreground">
                  Ngày sinh
                </TableHead>
                <TableHead className="min-w-[110px] py-3 text-xs font-semibold text-muted-foreground">
                  Số điện thoại
                </TableHead>
                <TableHead className="min-w-[120px] py-3 text-xs font-semibold text-muted-foreground">
                  Cấp độ đăng ký
                </TableHead>
                <TableHead className="min-w-[130px] py-3 text-xs font-semibold text-muted-foreground text-center">
                  Trạng thái giấy tờ
                </TableHead>
                <TableHead className="w-[90px] py-3 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.length > 0 ? (
                candidates.map((c) => {
                  const docStatus = c.latest_document?.verification_status || "pending";
                  const isPassport = c.latest_document?.doc_type === "passport";

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      {/* Cột 1: Số CCCD / Mã */}
                      <TableCell className="pl-5">
                        <div className="flex flex-col gap-0.5">
                          {c.latest_document?.doc_number ? (
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {maskDocumentNumber(c.latest_document.doc_number)}
                            </span>
                          ) : (
                            <EmptyFieldBadge />
                          )}
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            {c.latest_document
                              ? isPassport
                                ? "Hộ chiếu"
                                : "Căn cước"
                              : renderFieldOrBadge(null)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Cột 2: Họ và tên thí sinh */}
                      <TableCell>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground text-xs sm:text-sm">
                            {renderFieldOrBadge(c.full_name)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Cột 3: Ngày sinh */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{formatDateOrBadge(c.dob)}</span>
                        </div>
                      </TableCell>

                      {/* Cột 4: Số điện thoại */}
                      <TableCell>
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-foreground font-medium">
                            {renderFieldOrBadge(maskPhoneNumber(c.phone))}
                          </span>
                        </div>
                      </TableCell>

                      {/* Cột 5: Cấp độ đăng ký */}
                      <TableCell>
                        {c.exam_level || c.target_exam_level ? (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-border/80 bg-background inline-flex items-center gap-1"
                          >
                            <GraduationCapIcon className="size-3 text-primary shrink-0" />
                            <span>{c.exam_level || c.target_exam_level}</span>
                          </Badge>
                        ) : (
                          <EmptyFieldBadge />
                        )}
                      </TableCell>

                      {/* Cột 6: Trạng thái giấy tờ */}
                      <TableCell className="text-center">
                        {docStatus === "verified" ? (
                          <Badge className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Đã duyệt
                          </Badge>
                        ) : docStatus === "rejected" ? (
                          <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit">
                            <span className="size-1.5 rounded-full bg-white dark:bg-foreground" />
                            Từ chối
                          </Badge>
                        ) : (
                          <Badge className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ duyệt
                          </Badge>
                        )}
                      </TableCell>

                      {/* Cột 7: Thao tác */}
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Xem chi tiết hồ sơ"
                            onClick={() => {
                              setSelectedCandidate(c);
                              setIsDetailOpen(true);
                            }}
                          >
                            <EyeIcon className="size-3.5" />
                            <span className="sr-only">Xem chi tiết</span>
                          </Button>

                          {(() => {
                            const actions = getCandidateActions(c);
                            const isPassport = c.latest_document?.doc_type === "passport";
                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                      aria-label={`Thao tác hồ sơ ${c.full_name}`}
                                    />
                                  }
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border">
                                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5 truncate">
                                    Hồ sơ: {c.full_name}
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() => {
                                        setSelectedCandidate(c);
                                        setIsDetailOpen(true);
                                      }}
                                    >
                                      <EyeIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Xem chi tiết hồ sơ
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() => {
                                        setAuditLogCandidate(c);
                                        setIsAuditLogOpen(true);
                                      }}
                                    >
                                      <HistoryIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Lịch sử thao tác
                                    </DropdownMenuItem>
                                    {actions.canCheckDuplicate && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium"
                                        onClick={() => handleScanDuplicates(c.latest_document!.doc_number)}
                                      >
                                        <ScanSearchIcon className="size-3.5 mr-2 text-muted-foreground" />
                                        Kiểm tra trùng giấy tờ
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuGroup>

                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                    Sao chép & Liên hệ
                                  </DropdownMenuLabel>
                                  <DropdownMenuGroup>
                                    {actions.canCopyDocNumber && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium"
                                        onClick={() =>
                                          copyToClipboard(
                                            c.latest_document!.doc_number,
                                            isPassport ? "Đã sao chép số Hộ chiếu" : "Đã sao chép số CCCD"
                                          )
                                        }
                                      >
                                        <CopyIcon className="size-3.5 mr-2 text-muted-foreground" />
                                        {isPassport ? "Sao chép số Hộ chiếu" : "Sao chép số CCCD"}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-lg font-medium"
                                      onClick={() => copyToClipboard(String(c.id), "Đã sao chép mã thí sinh")}
                                    >
                                      <HashIcon className="size-3.5 mr-2 text-muted-foreground" />
                                      Sao chép mã thí sinh (#{c.id})
                                    </DropdownMenuItem>
                                    {actions.canCopyPhone && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium"
                                        onClick={() => copyToClipboard(c.phone!.trim(), "Đã sao chép số điện thoại")}
                                      >
                                        <PhoneIcon className="size-3.5 mr-2 text-muted-foreground" />
                                        Sao chép số điện thoại
                                      </DropdownMenuItem>
                                    )}
                                    {actions.canEmail && (
                                      <DropdownMenuItem
                                        className="cursor-pointer text-xs rounded-lg font-medium"
                                        onClick={() => {
                                          window.location.href = `mailto:${c.email!.trim()}?subject=${encodeURIComponent(
                                            "Thông báo hồ sơ đăng ký thi HSK - Đại học Vinh"
                                          )}`;
                                        }}
                                      >
                                        <MailIcon className="size-3.5 mr-2 text-muted-foreground" />
                                        Gửi email thí sinh
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuGroup>

                                  {(actions.canApprove || actions.canReject || actions.canRevoke || actions.canReapprove) && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1">
                                        Xử lý hồ sơ
                                      </DropdownMenuLabel>
                                      <DropdownMenuGroup>
                                        {actions.canApprove && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                            onClick={() => handleQuickApprove(c)}
                                          >
                                            <CheckCircle2Icon className="size-3.5 mr-2" />
                                            Phê duyệt giấy tờ
                                          </DropdownMenuItem>
                                        )}
                                        {actions.canReject && (
                                          <DropdownMenuItem
                                            variant="destructive"
                                            className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                            onClick={() => handleOpenReject(c, "reject")}
                                          >
                                            <XCircleIcon className="size-3.5 mr-2" />
                                            Từ chối hồ sơ
                                          </DropdownMenuItem>
                                        )}
                                        {actions.canRevoke && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-amber-600 dark:text-amber-400 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/40"
                                            onClick={() => handleOpenReject(c, "revoke")}
                                          >
                                            <Undo2Icon className="size-3.5 mr-2" />
                                            Thu hồi phê duyệt
                                          </DropdownMenuItem>
                                        )}
                                        {actions.canReapprove && (
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-lg font-medium text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/40"
                                            onClick={() => handleOpenReapprove(c)}
                                          >
                                            <CheckCircle2Icon className="size-3.5 mr-2" />
                                            Phê duyệt lại
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuGroup>
                                    </>
                                  )}

                                  {actions.canDisableAccount && (
                                    <>
                                      <DropdownMenuSeparator className="my-1" />
                                      <DropdownMenuLabel className="text-[10px] text-destructive/80 font-bold uppercase tracking-wider px-2 py-1">
                                        Vùng nguy hiểm
                                      </DropdownMenuLabel>
                                      <DropdownMenuGroup>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          className="cursor-pointer text-xs rounded-lg font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                                          onClick={() => handleOpenDisableAccount(c)}
                                        >
                                          <UserXIcon className="size-3.5 mr-2" />
                                          Vô hiệu hóa tài khoản
                                        </DropdownMenuItem>
                                      </DropdownMenuGroup>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                /* Empty state chuẩn temple */
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center gap-2">
                      <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-1">
                        <UsersRoundIcon className="size-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        Không tìm thấy hồ sơ thí sinh phù hợp
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Không có hồ sơ nào khớp với từ khóa tìm kiếm hoặc các tiêu chí bộ lọc đã chọn.
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

        {/* ── 4. Pagination Chuẩn Project Rules (Rule 7) ────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t bg-card/30 p-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {meta.total_items > 0 ? (
              <>
                Hiển thị{" "}
                <span className="font-semibold text-foreground">
                  {(meta.page - 1) * meta.per_page + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(meta.page * meta.per_page, meta.total_items)}
                </span>{" "}
                trên tổng số{" "}
                <span className="font-semibold text-foreground">
                  {meta.total_items}
                </span>{" "}
                hồ sơ
              </>
            ) : (
              "Không có dữ liệu hiển thị"
            )}
          </p>

          {meta.total_pages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={meta.page <= 1}
                    onClick={() => updateParams({ page: String(meta.page - 1) })}
                  />
                </PaginationItem>

                {Array.from({ length: meta.total_pages }, (_, i) => i + 1).map((item) => {
                  const isFirst = item === 1;
                  const isLast = item === meta.total_pages;
                  const isNearCurrent = Math.abs(item - meta.page) <= 1;

                  if (!isFirst && !isLast && !isNearCurrent) {
                    if (item === 2 && meta.page > 3) {
                      return (
                        <PaginationItem key="ellipsis-start">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    if (item === meta.total_pages - 1 && meta.page < meta.total_pages - 2) {
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
                        isActive={item === meta.page}
                        onClick={() => updateParams({ page: String(item) })}
                      >
                        {item}
                      </PaginationButton>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    disabled={meta.page >= meta.total_pages}
                    onClick={() => updateParams({ page: String(meta.page + 1) })}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </Card>

      {/* ── 5. Modal Chi Tiết Thí Sinh & Thẩm Định Giấy Tờ (API §3.10) ────────── */}
      <CandidateDetailDialog
        candidate={selectedCandidate}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onApprove={(c) => handleQuickApprove(c)}
        onReject={(c) => {
          setIsDetailOpen(false);
          handleOpenReject(c, "reject");
        }}
        onReapprove={(c) => {
          setIsDetailOpen(false);
          handleOpenReapprove(c);
        }}
        onRevoke={(c) => {
          setIsDetailOpen(false);
          handleOpenReject(c, "revoke");
        }}
        onPreviewImage={(url) => setPreviewImageUrl(url)}
      />

      {/* ── 5.1. Modal Lịch Sử Thao Tác (Audit Log - API §11.1) ───────────────── */}
      <CandidateAuditLogDialog
        candidate={auditLogCandidate}
        open={isAuditLogOpen}
        onOpenChange={setIsAuditLogOpen}
      />

      {/* ── 6. Dialog Từ Chối / Thu Hồi Kèm Lý Do (RHF + Zod) ──────────────── */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  rejectMode === "revoke"
                    ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/60"
                    : "text-destructive border-destructive/20 bg-destructive/5"
                }`}
              >
                {rejectMode === "revoke" ? "Thu hồi phê duyệt" : "Từ chối hồ sơ"}
              </Badge>
              <span className="text-xs text-muted-foreground">• Thẩm định giấy tờ</span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {rejectMode === "revoke" ? "Thu hồi phê duyệt hồ sơ thí sinh" : "Từ chối hồ sơ thí sinh"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Thí sinh: <span className="font-semibold text-foreground">{candidateToReject?.full_name || <EmptyFieldBadge />}</span>
              {" • CCCD: "}{candidateToReject?.latest_document?.doc_number ? maskDocumentNumber(candidateToReject.latest_document.doc_number) : <EmptyFieldBadge />}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReject(onSubmitReject)}>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Lý do thường gặp (Nhấp để chọn nhanh):
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Ảnh CCCD bị mờ, không đọc được thông tin",
                    "Thông tin họ tên/ngày sinh không khớp với CCCD",
                    "Ảnh chân dung không đúng quy cách 3x4",
                    "Giấy tờ tùy thân đã hết hạn sử dụng",
                    ...(rejectMode === "revoke"
                      ? ["Thu hồi phê duyệt để thí sinh chụp lại ảnh giấy tờ rõ nét hơn"]
                      : []),
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setRejectValue("reason", reason, { shouldValidate: true })}
                      className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason-input" className="text-xs font-semibold text-foreground">
                  Nội dung lý do chi tiết <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason-input"
                  rows={3}
                  {...registerReject("reason")}
                  placeholder="Nhập lý do cụ thể để thí sinh biết cần bổ sung hoặc chụp lại giấy tờ..."
                  className="text-xs rounded-xl"
                />
                {rejectErrors.reason && (
                  <p className="text-[11px] text-destructive font-medium">
                    {rejectErrors.reason.message}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Thông báo này sẽ được gửi trực tiếp đến hộp thư và tài khoản của thí sinh.
                </p>
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRejectDialogOpen(false)}
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={fetcher.state !== "idle"}
                className={`rounded-full cursor-pointer text-xs h-9 w-full sm:w-auto font-medium ${
                  rejectMode === "revoke"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {rejectMode === "revoke" ? (
                  <>
                    <Undo2Icon className="size-3.5 mr-1.5" />
                    Xác nhận thu hồi
                  </>
                ) : (
                  <>
                    <XCircleIcon className="size-3.5 mr-1.5" />
                    Xác nhận từ chối
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 6.1. AlertDialog Xác nhận Phê duyệt lại ────────────────────────── */}
      <AlertDialog open={isReapproveAlertOpen} onOpenChange={setIsReapproveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận phê duyệt lại hồ sơ</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ thí sinh <strong>{candidateToReapprove?.full_name}</strong> (CCCD: {maskDocumentNumber(candidateToReapprove?.latest_document?.doc_number)}) hiện đang ở trạng thái từ chối. Bạn có chắc chắn muốn phê duyệt lại hồ sơ này hợp lệ để thí sinh đủ điều kiện dự thi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleConfirmReapprove}
            >
              Xác nhận phê duyệt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 6.2. AlertDialog Xác nhận Vô hiệu hóa tài khoản thí sinh (§2.13) ── */}
      <AlertDialog open={isDisableAlertOpen} onOpenChange={setIsDisableAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vô hiệu hóa tài khoản thí sinh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn vô hiệu hóa tài khoản của thí sinh <strong>{candidateToDisable?.full_name}</strong> (Mã tài khoản: #{candidateToDisable?.account_id})? Thao tác này sẽ khóa phiên đăng nhập và ngăn thí sinh truy cập hệ thống theo đúng quy chuẩn bảo mật.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted">Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full cursor-pointer"
              onClick={handleConfirmDisableAccount}
            >
              Vô hiệu hóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 7. Dialog Quét Hồ Sơ Trùng Lặp ─────────────────────────────────── */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/60"
              >
                Đối soát trùng lặp
              </Badge>
              <span className="text-xs text-muted-foreground">
                {targetDocNumber ? `• Kiểm tra số: ${targetDocNumber}` : "• Toàn bộ hệ thống"}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {targetDocNumber ? `Đối soát trùng lặp: ${targetDocNumber}` : "Kết quả quét hồ sơ CCCD trùng lặp"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Hệ thống tự động rà soát cơ sở dữ liệu để phát hiện trường hợp 1 giấy tờ đăng ký nhiều tài khoản.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {isScanningDuplicates ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <RefreshCwIcon className="size-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Đang quét toàn bộ danh sách thí sinh...</p>
              </div>
            ) : (() => {
              const matchedTarget = targetDocNumber
                ? duplicateList.find((d) => d.doc_number === targetDocNumber)
                : null;

              if (targetDocNumber && !matchedTarget) {
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                      <CheckCircle2Icon className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Giấy tờ duy nhất & Hợp lệ</p>
                        <p>
                          Số giấy tờ <span className="font-mono font-bold">{maskDocumentNumber(targetDocNumber)}</span> là duy nhất, không trùng lặp với bất kỳ thí sinh nào khác trên hệ thống.
                        </p>
                      </div>
                    </div>
                    {duplicateList.length > 0 && (
                      <div className="pt-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTargetDocNumber(null)}
                          className="rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Xem danh sách các giấy tờ trùng lặp khác ({duplicateList.length})
                        </Button>
                      </div>
                    )}
                  </div>
                );
              }

              if (duplicateList.length > 0) {
                return (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                      <span>
                        {targetDocNumber && matchedTarget ? (
                          <>
                            Cảnh báo: Số giấy tờ <span className="font-mono font-bold">{maskDocumentNumber(targetDocNumber)}</span> đang bị trùng lặp trên <span className="font-bold">{matchedTarget.count}</span> hồ sơ thí sinh!
                          </>
                        ) : (
                          <>
                            Phát hiện <span className="font-bold">{duplicateList.length}</span> số giấy tờ đang được sử dụng lặp lại bởi nhiều thí sinh. Vui lòng kiểm tra kỹ trước khi phê duyệt!
                          </>
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-semibold">Số giấy tờ</TableHead>
                            <TableHead className="text-xs font-semibold">Loại</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Số lượt trùng</TableHead>
                            <TableHead className="text-xs font-semibold">Mã thí sinh liên quan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {duplicateList.map((item, idx) => {
                            const isCurrentTarget = item.doc_number === targetDocNumber;
                            return (
                              <TableRow
                                key={idx}
                                className={isCurrentTarget ? "bg-amber-50/60 dark:bg-amber-950/30" : ""}
                              >
                                <TableCell className="font-mono text-xs font-semibold">
                                  {maskDocumentNumber(item.doc_number)}
                                  {isCurrentTarget && (
                                    <Badge variant="outline" className="ml-2 text-[10px] rounded-full border-amber-500 text-amber-600">
                                      Đang kiểm tra
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs uppercase">
                                  {item.doc_type}
                                </TableCell>
                                <TableCell className="text-xs text-center font-bold text-destructive">
                                  {item.count}
                                </TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  {item.candidate_ids?.length
                                    ? item.candidate_ids.map((id) => `#${id}`).join(", ")
                                    : <EmptyFieldBadge />}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {targetDocNumber && (
                      <div className="text-center pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTargetDocNumber(null)}
                          className="rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Hiển thị toàn bộ ({duplicateList.length} giấy tờ)
                        </Button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2Icon className="size-6" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Không phát hiện hồ sơ trùng lặp
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Tất cả các số Căn cước công dân và Hộ chiếu trên hệ thống đều là duy nhất và hợp lệ.
                  </p>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDuplicateDialogOpen(false)}
              className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
            >
              Đóng cửa sổ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 8. Dialog Xuất Danh Sách PDF ───────────────────────────────────── */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary border-primary/20 bg-primary/5"
              >
                Xuất tệp PDF
              </Badge>
              <span className="text-xs text-muted-foreground">• Thể thức văn bản khảo thí</span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Xuất danh sách thí sinh dự thi
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Tải tệp PDF danh sách thí sinh chuẩn thể thức văn bản hành chính theo quy định của Trường Đại học Vinh.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Lựa chọn đợt thi */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="export-exam-date" className="text-xs font-semibold text-foreground">
                Đợt thi tổ chức (Ngày thi) <span className="text-destructive">*</span>
              </Label>
              {examDates.length > 0 ? (
                <Select
                  value={exportExamDate}
                  onValueChange={(val) => setExportExamDate(val || "")}
                >
                  <SelectTrigger
                    id="export-exam-date"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn ngày thi">
                      {(val) => {
                        const current = val ?? exportExamDate;
                        if (!current) return "Chọn ngày thi";
                        return `Đợt thi ngày: ${formatDateOnly(current)}`;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      {examDates.map((dateStr) => (
                        <SelectItem key={dateStr} value={dateStr} className="cursor-pointer text-xs sm:text-sm">
                          Đợt thi ngày: {formatDateOnly(dateStr)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="export-exam-date"
                  type="date"
                  value={exportExamDate}
                  onChange={(e) => setExportExamDate(e.target.value)}
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                />
              )}
              <p className="text-[11px] text-muted-foreground">
                Danh sách trích xuất sẽ tương ứng với ngày thi đã chọn.
              </p>
            </div>

            {/* Hai bộ lọc bên dưới: responsive grid-cols-1 sm:grid-cols-2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Trạng thái thẩm định */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="export-status" className="text-xs font-semibold text-foreground">
                  Trạng thái thẩm định
                </Label>
                <Select
                  value={exportStatus}
                  onValueChange={(val) => setExportStatus(val || "all")}
                >
                  <SelectTrigger
                    id="export-status"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn trạng thái">
                      {(val) => {
                        const current = val ?? exportStatus;
                        if (current === "verified") return "Đã duyệt hợp lệ";
                        if (current === "pending") return "Chờ phê duyệt";
                        if (current === "rejected") return "Từ chối";
                        if (current === "all") return "Tất cả trạng thái";
                        return "Tất cả trạng thái";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem value="verified" className="cursor-pointer text-xs sm:text-sm">
                        Đã duyệt hợp lệ
                      </SelectItem>
                      <SelectItem value="pending" className="cursor-pointer text-xs sm:text-sm">
                        Chờ phê duyệt
                      </SelectItem>
                      <SelectItem value="rejected" className="cursor-pointer text-xs sm:text-sm">
                        Từ chối
                      </SelectItem>
                      <SelectItem value="all" className="cursor-pointer text-xs sm:text-sm">
                        Tất cả trạng thái
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Cấp độ thi */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="export-level" className="text-xs font-semibold text-foreground">
                  Cấp độ dự thi HSK
                </Label>
                <Select
                  value={exportLevel}
                  onValueChange={(val) => setExportLevel(val || "all")}
                >
                  <SelectTrigger
                    id="export-level"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn cấp độ">
                      {(val) => {
                        const current = val ?? exportLevel;
                        if (!current || current === "all") return "Mọi cấp độ thi";
                        return current;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem value="all" className="cursor-pointer text-xs sm:text-sm">
                        Mọi cấp độ thi
                      </SelectItem>
                      <SelectItem value="HSK 1" className="cursor-pointer text-xs sm:text-sm">
                        HSK 1
                      </SelectItem>
                      <SelectItem value="HSK 2" className="cursor-pointer text-xs sm:text-sm">
                        HSK 2
                      </SelectItem>
                      <SelectItem value="HSK 3" className="cursor-pointer text-xs sm:text-sm">
                        HSK 3 & HSKK Sơ cấp
                      </SelectItem>
                      <SelectItem value="HSK 4" className="cursor-pointer text-xs sm:text-sm">
                        HSK 4 & HSKK Trung cấp
                      </SelectItem>
                      <SelectItem value="HSK 5" className="cursor-pointer text-xs sm:text-sm">
                        HSK 5 & HSKK Cao cấp
                      </SelectItem>
                      <SelectItem value="HSK 6" className="cursor-pointer text-xs sm:text-sm">
                        HSK 6 & HSKK Cao cấp
                      </SelectItem>
                      <SelectItem value="HSKK" className="cursor-pointer text-xs sm:text-sm">
                        HSKK Khẩu ngữ riêng
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ghi chú thể thức văn bản */}
            <div className="rounded-xl border bg-card/60 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileCheckIcon className="size-4 text-primary shrink-0" />
                <span>Quy cách danh sách xuất tệp PDF</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-5.5">
                PDF gồm STT, họ và tên, ngày sinh, số CCCD/hộ chiếu, cấp thi, ngày đăng ký và ghi chú. Với hồ sơ bị từ chối, ghi chú sẽ hiển thị lý do từ chối nếu có.
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsExportDialogOpen(false)}
              className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang xuất dữ liệu PDF...
                </>
              ) : (
                <>
                  <DownloadIcon className="size-3.5 mr-1.5" />
                  Tải xuống tệp PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 9. Modal Phóng To Ảnh Giấy Tờ ──────────────────────────────────── */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent>
          <div className="relative flex items-center justify-center min-h-[300px]">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Ảnh phóng to"
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
