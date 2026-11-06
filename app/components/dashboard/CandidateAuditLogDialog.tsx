import * as React from "react";
import { useFetcher } from "react-router";
import { ArrowRightIcon, HistoryIcon, RefreshCwIcon, UserCogIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import type {
  AdminCandidateResponseDTO,
  ApiEnvelope,
  AuditLogEntryDTO,
  AuditLogEntityTable,
} from "~/types/admin";
import { maskAddress, maskDocumentNumber, maskEmail, maskPhoneNumber } from "~/lib/mask";

const DEFAULT_PAGE_SIZE = 5; // Hỗ trợ phân trang lịch sử thao tác (5 bản ghi / trang)

type AuditScope = Extract<AuditLogEntityTable, "candidates" | "candidate_documents">;

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  SOFT_DELETE: "Vô hiệu hóa",
  DEACTIVATE_ACCOUNT: "Vô hiệu hóa tài khoản",
  REACTIVATE_ACCOUNT: "Khôi phục tài khoản",
  RESTORE: "Khôi phục",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  PASSWORD_CHANGE: "Đổi mật khẩu",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  EXPORT: "Xuất dữ liệu",
  APPROVE: "Phê duyệt",
  REJECT: "Từ chối",
  REVOKE_APPROVAL: "Thu hồi phê duyệt",
  REOPEN_REVIEW: "Mở lại xét duyệt",
  VIEW_PII: "Xem dữ liệu PII",
  MERGE: "Gộp hồ sơ trùng",
  RECHECK: "Phúc khảo",
};

// Ngoại lệ màu có chủ đích: phân loại màu rõ ràng theo nhóm hành động (Green / Amber / Blue / Destructive)
const ACTION_TONE: Record<string, string> = {
  APPROVE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  REACTIVATE_ACCOUNT:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  REOPEN_REVIEW:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  UPDATE:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
  CREATE:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
  VIEW_PII:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  MERGE:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
  REVOKE_APPROVAL: "bg-destructive/10 text-destructive border-destructive/30",
  REJECT: "bg-destructive/10 text-destructive border-destructive/30",
  SOFT_DELETE: "bg-destructive/10 text-destructive border-destructive/30",
  DEACTIVATE_ACCOUNT: "bg-destructive/10 text-destructive border-destructive/30",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
};

const FIELD_LABELS: Record<string, string> = {
  verification_status: "Trạng thái kiểm duyệt",
  reason: "Lý do",
  rejection_reason: "Lý do từ chối",
  status: "Trạng thái",
  full_name: "Họ và tên",
  chinese_name: "Tên tiếng Trung",
  dob: "Ngày sinh",
  gender: "Giới tính",
  phone: "Số điện thoại",
  email: "Email",
  address: "Địa chỉ",
  doc_type: "Loại giấy tờ",
  doc_number: "Số CCCD/Hộ chiếu",
  paid_resolution: "Xử lý đơn đã thanh toán",
};

const VALUE_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  verified: "Đã duyệt",
  rejected: "Từ chối",
  active: "Đang hoạt động",
  disabled: "Đã vô hiệu hóa",
  deactivated: "Đã vô hiệu hóa",
};

/** Định dạng chuẩn HH:mm:ss - DD/MM/YYYY */
function formatLogDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(
    d.getDate()
  )}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return VALUE_LABELS[trimmed.toLowerCase()] ?? trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${stringifyValue(v)}`)
      .join("; ");
  }
  return String(value);
}

function maskDiffField(key: string, val: string): string {
  if (val === "—" || !val) return val;
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("phone")) return maskPhoneNumber(val);
  if (lowerKey.includes("doc_number") || lowerKey.includes("cccd")) return maskDocumentNumber(val);
  if (lowerKey.includes("email")) return maskEmail(val);
  if (lowerKey.includes("address")) return maskAddress(val);
  return val;
}

/** Liệt kê các trường thay đổi giữa old_value và new_value */
function diffValues(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): { key: string; from: string; to: string }[] {
  const keys = new Set<string>([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]);
  const rows: { key: string; from: string; to: string }[] = [];
  keys.forEach((key) => {
    const rawFrom = stringifyValue(oldValue?.[key]);
    const rawTo = stringifyValue(newValue?.[key]);
    if (rawFrom !== rawTo) {
      rows.push({
        key,
        from: maskDiffField(key, rawFrom),
        to: maskDiffField(key, rawTo),
      });
    }
  });
  return rows;
}

interface CandidateAuditLogDialogProps {
  candidate: AdminCandidateResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateAuditLogDialog({ candidate, open, onOpenChange }: CandidateAuditLogDialogProps) {
  const fetcher = useFetcher<ApiEnvelope<AuditLogEntryDTO[]>>();
  const [scope, setScope] = React.useState<AuditScope>("candidate_documents");
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(DEFAULT_PAGE_SIZE);

  const candidateId = candidate?.id ?? null;

  // Reset về trang 1 & tab giấy tờ mỗi khi mở cho thí sinh khác (Rule 7)
  React.useEffect(() => {
    if (open) {
      setScope("candidate_documents");
      setPage(1);
    }
  }, [open, candidateId]);

  const { load } = fetcher;
  React.useEffect(() => {
    if (!open || !candidateId) return;
    const params = new URLSearchParams({
      scope,
      page: String(page),
      limit: String(pageSize),
    });
    load(`/internal/admin/candidates/${candidateId}/audit-logs?${params.toString()}`);
  }, [open, scope, candidateId, page, pageSize, load]);

  const isLoading = fetcher.state !== "idle";
  const envelope = fetcher.data;
  const logs: AuditLogEntryDTO[] =
    envelope?.success && Array.isArray(envelope.data) ? envelope.data : [];
  const meta = envelope?.meta ?? null;
  const totalPages = Math.max(1, meta?.total_pages ?? 1);
  const hasError = Boolean(envelope && envelope.success === false);

  const switchScope = (next: AuditScope) => {
    setScope(next);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="min-w-0 p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Lịch sử thao tác
            </Badge>
            <span className="text-xs text-muted-foreground">• Thí sinh #{candidate?.id ?? "—"}</span>
          </div>
          <DialogTitle className="min-w-0 truncate text-xl font-bold text-foreground">
            {candidate?.full_name ?? "Hồ sơ thí sinh"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Nhật ký phê duyệt, từ chối và cập nhật được ghi nhận trên hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Tabs phạm vi nhật ký */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-full w-fit max-w-full overflow-x-auto">
            {(
              [
                { value: "candidate_documents", label: "Giấy tờ tùy thân", disabled: !candidateId },
                { value: "candidates", label: "Thông tin hồ sơ", disabled: !candidateId },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                id={`audit-scope-${item.value}`}
                type="button"
                disabled={item.disabled}
                onClick={() => switchScope(item.value)}
                className={`px-3.5 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${
                  scope === item.value
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-[340px] flex flex-col justify-start">
            {isLoading && logs.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
                ))}
              </div>
            ) : hasError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                Không thể tải lịch sử thao tác. Vui lòng thử lại sau.
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
                <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
                  <HistoryIcon className="size-6" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chưa có lịch sử thao tác nào được ghi nhận.
                </p>
              </div>
            ) : (
              <ol className={`space-y-3 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
                {logs.map((log) => {
                  const changes = diffValues(log.old_value, log.new_value);
                  const reasonText =
                    typeof log.new_value?.reason === "string" && log.new_value.reason.trim()
                      ? log.new_value.reason.trim()
                      : null;

                  return (
                    <li
                      key={log.id}
                      className="min-w-0 rounded-xl border bg-card/60 p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              ACTION_TONE[log.action] ?? "bg-muted/50 text-foreground border-border"
                            }`}
                          >
                            {ACTION_LABELS[log.action] ?? log.action}
                          </Badge>
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <UserCogIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            {log.actor_id
                              ? `Quản trị viên (ID: #${log.actor_id})`
                              : "Hệ thống tự động"}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatLogDateTime(log.created_at)}
                        </span>
                      </div>

                      {reasonText && (
                        <p className="text-sm text-foreground/90 bg-muted/40 rounded-lg px-3 py-1.5 border border-border/50">
                          <span className="font-semibold text-muted-foreground mr-1.5">Lý do:</span>
                          {reasonText}
                        </p>
                      )}

                      {changes.filter((c) => c.key !== "reason").length > 0 && (
                        <ul className="space-y-1 text-sm">
                          {changes
                            .filter((c) => c.key !== "reason")
                            .map((change) => (
                              <li
                                key={change.key}
                                className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs"
                              >
                                <span className="font-semibold text-muted-foreground">
                                  {FIELD_LABELS[change.key] ?? change.key}:
                                </span>
                                {change.from !== "—" && (
                                  <>
                                    <span className="min-w-0 break-all text-muted-foreground line-through">
                                      {change.from}
                                    </span>
                                    <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                                  </>
                                )}
                                <span className="min-w-0 break-all font-medium text-foreground">
                                  {change.to}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            {meta && meta.total_items > 0
              ? `Tổng ${meta.total_items} bản ghi • Trang ${page}/${totalPages}`
              : "Hiển thị 0 bản ghi"}
          </p>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            {(totalPages > 1 || logs.length > 0) && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious disabled={page <= 1 || isLoading} onClick={() => setPage((p) => p - 1)} />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => {
                    const isEdge = item === 1 || item === totalPages;
                    if (!isEdge && Math.abs(item - page) > 1) {
                      if (item === 2 || item === totalPages - 1) {
                        return (
                          <PaginationItem key={`ellipsis-${item}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                    return (
                      <PaginationItem key={item}>
                        <PaginationButton isActive={item === page} onClick={() => setPage(item)}>
                          {item}
                        </PaginationButton>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      disabled={page >= totalPages || isLoading}
                      onClick={() => setPage((p) => p + 1)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
            <Button
              id="audit-log-close"
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full cursor-pointer hover:bg-muted text-xs h-9"
            >
              {isLoading && <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />}
              Đóng cửa sổ
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
