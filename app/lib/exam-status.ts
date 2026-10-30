/**
 * Quy tắc nghiệp vụ về trạng thái (State Machine) của Đợt thi và Ca thi.
 *
 * Nguồn tham chiếu: API_DOCUMENTATION.md (v1.2.4)
 * - §4.5 Trạng thái & hành động (State Machine)
 * - §13.4 Luồng trạng thái Đợt thi (Exam Period)
 * - §13.4.1 Luồng trạng thái Ca thi (Exam Session)
 * - §13.4.2 Cascade Đợt → Ca (trong một transaction)
 */

import type {
  ExamPeriod,
  ExamPeriodStatus,
  ExamSession,
  ExamSessionClosedReason,
  ExamSessionStatus,
} from "~/types/exam";

export type SessionActionType =
  | "view"
  | "copy_code"
  | "edit"
  | "edit_notes"
  | "publish"
  | "schedule_publish"
  | "unpublish"
  | "close_registration"
  | "reopen_registration"
  | "increase_capacity"
  | "decrease_capacity"
  | "cancel"
  | "delete";

export type PeriodActionType =
  | "view"
  | "copy_code"
  | "export_candidates"
  | "edit"
  | "edit_description"
  | "publish"
  | "unpublish"
  | "close_registration"
  | "reopen_registration"
  | "reschedule"
  | "complete"
  | "duplicate"
  | "cancel"
  | "delete";

// ─── Kiểm tra quyền thực hiện thao tác trên Ca thi ──────────────────────────────

/**
 * Kiểm tra xem một hành động cụ thể có được phép thực hiện trên Ca thi hay không.
 * Ưu tiên đọc từ `session.available_actions` do Backend v1.2.4 trả về.
 * Nếu không có, tự động áp dụng State Machine fallback.
 */
export function canSession(
  session?: ExamSession | null,
  action?: SessionActionType,
  parentPeriod?: ExamPeriod | null
): boolean {
  if (!session || !action) return false;

  const isParentDraft = parentPeriod?.status === "draft";
  const isPeriodClosed =
    parentPeriod?.status === "registration_closed" ||
    parentPeriod?.status === "cancelled" ||
    parentPeriod?.status === "completed";

  // 1. Nếu backend trả về available_actions, ưu tiên cao nhất
  // Ràng buộc bảo vệ nghiệp vụ nghiêm ngặt:
  if (Array.isArray(session.available_actions)) {
    if ((action === "publish" || action === "schedule_publish") && (isParentDraft || isPeriodClosed)) {
      return false;
    }
    // Nghiêm cấm hoàn tác ca thi 'open' về 'draft'
    if (action === "unpublish" && session.status === "open") {
      return false;
    }
    // Nghiêm cấm hủy ca thi khi ca thi đã đóng đăng ký ('closed')
    if (action === "cancel" && (session.status !== "open" || isPeriodClosed)) {
      return false;
    }
    // Khóa chỉnh sửa khi ca thi đã đóng đăng ký
    if (action === "edit") {
      if (session.status === "closed" || session.status === "completed" || session.status === "cancelled" || isPeriodClosed) {
        return false;
      }
      return (
        session.available_actions.includes("edit") ||
        session.available_actions.includes("edit_notes")
      );
    }
    return session.available_actions.includes(action);
  }

  // 2. Fallback logic theo State Machine v1.2.4
  const status = session.status;

  switch (action) {
    case "view":
    case "copy_code":
      return true;

    case "edit":
      if (status === "closed" || status === "completed" || status === "cancelled") {
        return false;
      }
      if (isPeriodClosed) return false;
      return true;

    case "edit_notes":
      return status === "closed";

    case "publish":
      if (isParentDraft || isPeriodClosed) return false;
      // Chỉ ca thi đang ở trạng thái draft mới được chuyển sang registration open
      return (
        status === "draft" &&
        Boolean(session.date) &&
        (session.capacity ?? 0) > 0 &&
        Boolean(session.registration_deadline)
      );

    case "schedule_publish":
      if (isParentDraft || isPeriodClosed) return false;
      return status === "draft";

    case "unpublish":
      // Quy tắc nghiêm ngặt: Ca thi đang mở đăng ký ('open') TUYỆT ĐỐI KHÔNG được hoàn tác về 'draft'.
      // Chỉ ca thi đang hẹn giờ ('scheduled') mới được phép hủy hẹn về bản nháp.
      return status === "scheduled";

    case "close_registration":
      return status === "open";

    case "reopen_registration":
      return status === "closed" && session.closed_reason !== "period_closed" && !isPeriodClosed;

    case "increase_capacity":
    case "decrease_capacity":
      return status === "open" || status === "closed";

    case "cancel":
      // Quy tắc nghiệp vụ mới: Ca thi (Slot) CHỈ có thể bị hủy nếu trạng thái hiện tại là 'open' (registration open).
      // Khóa triệt để: Tuyệt đối không cho phép hủy khi ca thi đã đóng đăng ký ('closed') hoặc các trạng thái khác.
      return status === "open" && !isPeriodClosed;

    case "delete":
      return status === "draft" || status === "scheduled";

    default:
      return false;
  }
}

// ─── Kiểm tra quyền thực hiện thao tác trên Đợt thi ──────────────────────────────

/**
 * Kiểm tra xem một hành động cụ thể có được phép thực hiện trên Đợt thi hay không.
 * Ưu tiên đọc từ `period.available_actions` do Backend v1.2.4 trả về.
 * Nếu không có, tự động áp dụng State Machine fallback.
 */
export function canPeriod(
  period?: ExamPeriod | null,
  action?: PeriodActionType
): boolean {
  if (!period || !action) return false;

  // 1. Ưu tiên available_actions từ Backend
  if (Array.isArray(period.available_actions)) {
    if (action === "unpublish" && period.status !== "published") {
      return false;
    }
    if (action === "edit") {
      return (
        period.available_actions.includes("edit") ||
        period.available_actions.includes("edit_description")
      );
    }
    return period.available_actions.includes(action);
  }

  // 2. Fallback logic theo State Machine v1.2.4
  const status = period.status;

  switch (action) {
    case "view":
    case "copy_code":
    case "export_candidates":
      return true;

    case "edit":
      return status === "draft" || status === "published" || status === "registration_open";

    case "edit_description":
      return status === "registration_open";

    case "publish":
      return status === "draft" && (period.session_count ?? 0) > 0;

    case "unpublish":
      // Chỉ cho phép thu hồi công bố khi đợt thi chưa mở đăng ký ('published'). Khi đã mở đăng ký thì không thể hoàn tác về draft.
      return status === "published";

    case "close_registration":
      return status === "published" || status === "registration_open";

    case "reopen_registration":
      return status === "registration_closed";

    case "reschedule":
      return (
        status === "published" ||
        status === "registration_open" ||
        status === "registration_closed" ||
        status === "rescheduled"
      );

    case "complete":
      return status === "registration_open" || status === "registration_closed";

    case "duplicate":
      return status !== "cancelled";

    case "cancel":
      return (
        status === "published" ||
        status === "registration_open" ||
        status === "registration_closed"
      );

    case "delete":
      return status === "draft";

    default:
      return false;
  }
}

// ─── Trình bày Giao diện & Nhãn Trạng thái ────────────────────────────────────

export interface StatusBadgeDetails {
  label: string;
  subLabel?: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  badgeClass: string;
  dotClass: string;
  pulse?: boolean;
}

/**
 * Lấy nhãn và kiểu hiển thị cho Ca thi theo v1.2.4 (kèm phân biệt closed_reason).
 */
export function getSessionStatusDetails(
  status?: ExamSessionStatus | string | null,
  closedReason?: ExamSessionClosedReason | string | null
): StatusBadgeDetails {
  switch (status) {
    case "draft":
      return {
        label: "Bản nháp",
        variant: "secondary",
        badgeClass: "bg-muted text-muted-foreground border-border dark:bg-muted/60",
        dotClass: "bg-muted-foreground",
        pulse: false,
      };

    case "scheduled":
      return {
        label: "Đã lên lịch",
        variant: "outline",
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
        dotClass: "bg-sky-500",
        pulse: false,
      };

    case "open":
      return {
        label: "Đang mở",
        variant: "default",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        dotClass: "bg-emerald-500",
        pulse: true,
      };

    case "closed": {
      if (closedReason === "deadline") {
        return {
          label: "Đã hết hạn",
          subLabel: "Quá hạn đăng ký",
          variant: "secondary",
          badgeClass:
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
          dotClass: "bg-rose-500",
          pulse: false,
        };
      }
      if (closedReason === "full") {
        return {
          label: "Hết chỗ",
          subLabel: "Đầy 100% sĩ số",
          variant: "secondary",
          badgeClass:
            "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60",
          dotClass: "bg-orange-500",
          pulse: false,
        };
      }
      if (closedReason === "period_closed") {
        return {
          label: "Đợt thi đóng",
          subLabel: "Theo đợt thi cha",
          variant: "secondary",
          badgeClass:
            "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
          dotClass: "bg-slate-500",
          pulse: false,
        };
      }
      return {
        label: "Đã đóng",
        subLabel: "Đóng thủ công",
        variant: "secondary",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
        dotClass: "bg-amber-500",
        pulse: false,
      };
    }

    case "completed":
      return {
        label: "Đã hoàn tất",
        variant: "secondary",
        badgeClass:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
        dotClass: "bg-slate-500",
        pulse: false,
      };

    case "cancelled":
      return {
        label: "Đã hủy",
        variant: "destructive",
        badgeClass:
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        dotClass: "bg-destructive",
        pulse: false,
      };

    default:
      return {
        label: String(status || "Không xác định"),
        variant: "outline",
        badgeClass: "bg-muted text-muted-foreground border-border",
        dotClass: "bg-muted-foreground",
        pulse: false,
      };
  }
}

/**
 * Lấy nhãn và kiểu hiển thị cho Đợt thi theo v1.2.4.
 */
export function getPeriodStatusDetails(
  status?: ExamPeriodStatus | string | null
): StatusBadgeDetails {
  switch (status) {
    case "draft":
      return {
        label: "Bản nháp",
        variant: "secondary",
        badgeClass: "bg-muted text-muted-foreground border-border dark:bg-muted/60",
        dotClass: "bg-muted-foreground",
        pulse: false,
      };

    case "published":
      return {
        label: "Đã công bố",
        variant: "outline",
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
        dotClass: "bg-sky-500",
        pulse: false,
      };

    case "registration_open":
      return {
        label: "Đang mở ĐK",
        variant: "default",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        dotClass: "bg-emerald-500",
        pulse: true,
      };

    case "registration_closed":
      return {
        label: "Đã đóng ĐK",
        variant: "secondary",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
        dotClass: "bg-amber-500",
        pulse: false,
      };

    case "rescheduled":
      return {
        label: "Đã dời lịch",
        variant: "outline",
        badgeClass:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60",
        dotClass: "bg-purple-500",
        pulse: false,
      };

    case "completed":
      return {
        label: "Đã hoàn thành",
        variant: "secondary",
        badgeClass:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
        dotClass: "bg-slate-500",
        pulse: false,
      };

    case "cancelled":
      return {
        label: "Đã hủy",
        variant: "destructive",
        badgeClass:
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        dotClass: "bg-destructive",
        pulse: false,
      };

    default:
      return {
        label: String(status || "Không xác định"),
        variant: "outline",
        badgeClass: "bg-muted text-muted-foreground border-border",
        dotClass: "bg-muted-foreground",
        pulse: false,
      };
  }
}

// ─── Các hàm bổ trợ kiểm tra điều kiện & lý do khóa (Compatibility & Helper API) ─

/**
 * Kiểm tra xem ca thi đã hết hạn đăng ký hay chưa (dựa theo closed_reason hoặc hạn nộp).
 */
export function isSessionExpired(session?: ExamSession | null): boolean {
  if (!session) return false;
  if (session.status === "closed" && session.closed_reason === "deadline") {
    return true;
  }
  if (session.registration_deadline) {
    const deadlineTime = new Date(session.registration_deadline).getTime();
    if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
      return true;
    }
  }
  return false;
}

/**
 * Trả về lý do khóa chỉnh sửa ca thi (nếu bị khóa), hoặc null nếu được phép chỉnh sửa.
 */
export function getSessionLockReason(
  session?: ExamSession | null,
  parentPeriod?: ExamPeriod | null
): string | null {
  if (!session) return "Không tìm thấy dữ liệu ca thi.";

  if (parentPeriod?.status === "draft") {
    return "Đợt thi cha đang ở trạng thái Bản nháp; phải công bố đợt thi trước khi công khai ca thi.";
  }
  if (parentPeriod?.status === "cancelled") {
    return "Đợt thi cha đã bị hủy.";
  }
  if (parentPeriod?.status === "completed") {
    return "Đợt thi cha đã hoàn thành.";
  }
  if (parentPeriod?.status === "registration_closed") {
    return "Đợt thi cha đã đóng đăng ký.";
  }

  if (session.status === "closed") {
    if (session.closed_reason === "deadline" || isSessionExpired(session)) {
      return "Ca thi đã hết hạn đăng ký; lịch thi và slot thi là bất biến (immutable), bị khóa hoàn toàn.";
    }
    if (session.closed_reason === "full") {
      return "Ca thi đã đầy sĩ số (100%); lịch thi và slot thi là bất biến (immutable), bị khóa hoàn toàn.";
    }
    if (session.closed_reason === "period_closed") {
      return "Ca thi bị khóa do đợt thi đã đóng; lịch thi và slot thi là bất biến (immutable), bị khóa hoàn toàn.";
    }
    return "Ca thi đã đóng đăng ký; lịch thi và slot thi là bất biến (immutable), bị khóa hoàn toàn.";
  }

  if (session.status === "completed") {
    return "Ca thi đã hoàn tất, không thể chỉnh sửa.";
  }

  if (session.status === "cancelled") {
    return "Ca thi đã bị hủy, không thể chỉnh sửa.";
  }

  if (!canSession(session, "edit", parentPeriod)) {
    return "Ca thi không cho phép chỉnh sửa ở trạng thái hiện tại.";
  }

  return null;
}

/**
 * Trả về lý do khóa chỉnh sửa đợt thi (nếu bị khóa), hoặc null nếu được phép chỉnh sửa.
 */
export function getPeriodLockReason(period?: ExamPeriod | null): string | null {
  if (!period) return "Không tìm thấy dữ liệu đợt thi.";

  if (period.status === "cancelled") {
    return "Đợt thi đã bị hủy.";
  }
  if (period.status === "completed") {
    return "Đợt thi đã hoàn thành.";
  }
  if (period.status === "registration_closed") {
    return "Đợt thi đã đóng đăng ký; lịch thi và cấu hình là bất biến (immutable), không thể chỉnh sửa.";
  }

  if (!canPeriod(period, "edit")) {
    return "Đợt thi không cho phép chỉnh sửa ở trạng thái hiện tại.";
  }

  return null;
}

/**
 * Kiểm tra xem có thể đóng đăng ký ca thi thủ công hay không.
 */
export function canCloseSessionRegistration(
  session?: ExamSession | null,
  parentPeriod?: ExamPeriod | null
): boolean {
  return canSession(session, "close_registration", parentPeriod);
}

/**
 * Kiểm tra xem có thể đóng đăng ký đợt thi thủ công hay không.
 */
export function canClosePeriodRegistration(period?: ExamPeriod | null): boolean {
  return canPeriod(period, "close_registration");
}


/**
 * Trả về lý do chặn nhân bản đợt thi, hoặc null nếu được phép.
 */
export function getPeriodDuplicateBlockReason(period?: ExamPeriod | null): string | null {
  if (!period) return "Không tìm thấy dữ liệu đợt thi.";

  if (period.status === "cancelled") {
    return "Không thể nhân bản đợt thi đã bị hủy.";
  }

  if (!canPeriod(period, "duplicate")) {
    return "Không thể nhân bản đợt thi ở trạng thái hiện tại.";
  }

  return null;
}

/**
 * Trả về lý do chặn dời lịch đợt thi, hoặc null nếu được phép dời lịch.
 */
export function getPeriodRescheduleBlockReason(period?: ExamPeriod | null): string | null {
  if (!period) return "Không tìm thấy dữ liệu đợt thi.";

  if (period.status === "draft") {
    return "Chỉ có thể dời lịch cho đợt thi đã công bố hoặc đang mở đăng ký.";
  }
  if (period.status === "completed") {
    return "Đợt thi đã hoàn tất, không thể dời lịch.";
  }
  if (period.status === "cancelled") {
    return "Đợt thi đã bị hủy, không thể dời lịch.";
  }

  if (!canPeriod(period, "reschedule")) {
    return "Đợt thi không cho phép dời lịch ở trạng thái hiện tại.";
  }

  return null;
}

