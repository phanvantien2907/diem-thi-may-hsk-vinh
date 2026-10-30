import * as React from "react";
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
import { Badge } from "~/components/ui/badge";
import type { ExamPeriod } from "~/types/exam";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileTextIcon,
  GlobeIcon,
} from "lucide-react";

export type PeriodConfirmationType = "publish" | "unpublish" | "complete";

interface PeriodActionConfirmationDialogProps {
  period: ExamPeriod | null;
  actionType: PeriodConfirmationType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: ExamPeriod, actionType: PeriodConfirmationType) => void;
  isSubmitting?: boolean;
}

export function PeriodActionConfirmationDialog({
  period,
  actionType,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: PeriodActionConfirmationDialogProps) {
  if (!period || !actionType) return null;

  const config = {
    publish: {
      badge: "Công bố Đợt thi",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300",
      icon: <GlobeIcon className="size-5" />,
      iconBoxClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      title: `Xác nhận công bố đợt thi "${period.name}"?`,
      description:
        "Đợt thi sẽ chuyển sang trạng thái đã công bố (published). Khi đợt thi được công bố thành công, các ca thi con hợp lệ thuộc đợt sẽ đủ điều kiện để hẹn giờ hoặc mở cổng công khai tiếp nhận thí sinh.",
      confirmText: "Xác nhận công bố",
      confirmButtonClass:
        "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    unpublish: {
      badge: "Thu hồi công bố",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
      icon: <FileTextIcon className="size-5" />,
      iconBoxClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      title: `Xác nhận hủy công bố đợt thi "${period.name}"?`,
      description:
        "Đợt thi sẽ quay trở về trạng thái bản nháp (draft). Thí sinh sẽ không còn nhìn thấy thông tin đợt thi này trên trang chủ. Thao tác chỉ cho phép khi đợt thi chưa mở đăng ký.",
      confirmText: "Xác nhận về bản nháp",
      confirmButtonClass:
        "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600",
    },
    complete: {
      badge: "Hoàn tất Đợt thi (Safeguard)",
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
      icon: <CheckCircle2Icon className="size-5" />,
      iconBoxClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
      title: `Xác nhận hoàn tất đợt thi "${period.name}"?`,
      description:
        "CẢNH BÁO: Hành động này là bất khả đảo ngược (IRREVERSIBLE). Đợt thi sau khi đánh dấu 'Hoàn tất' sẽ chốt sổ toàn bộ hồ sơ thi, khóa dữ liệu và tuyệt đối không thể mở lại hay hoàn tác.",
      confirmText: "Xác nhận hoàn tất đợt thi",
      confirmButtonClass:
        "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-semibold",
    },
  }[actionType];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`size-11 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${config.iconBoxClass}`}
            >
              {config.icon}
            </div>
            <div className="space-y-0.5 text-left">
              <Badge variant="outline" className={`rounded-full px-2 py-0 text-[10px] font-bold uppercase tracking-wider ${config.badgeClass}`}>
                {config.badge}
              </Badge>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                {config.title}
              </AlertDialogTitle>
            </div>
          </div>

          <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground pt-1">
            {config.description}
          </AlertDialogDescription>

          {actionType === "complete" && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/80 dark:text-amber-200 flex items-start gap-2 text-xs">
              <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] leading-relaxed">
                Đợt thi #{period.id} ({period.code}) có {period.session_count ?? 0} ca thi con sẽ được chuyển sang trạng thái <strong>Đã hoàn thành</strong>.
              </p>
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <AlertDialogCancel
            disabled={isSubmitting}
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
          >
            Hủy bỏ
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(period, actionType);
            }}
            className={`rounded-full cursor-pointer text-xs h-9 w-full sm:w-auto shadow-sm ${config.confirmButtonClass}`}
          >
            {isSubmitting ? "Đang xử lý..." : config.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
