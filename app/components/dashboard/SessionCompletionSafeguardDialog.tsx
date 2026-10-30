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
import type { ExamSession, ExamType } from "~/types/exam";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  UsersIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { getShiftDetails } from "~/lib/exam-status";

interface SessionCompletionSafeguardDialogProps {
  session: ExamSession | null;
  examType?: ExamType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (session: ExamSession) => void;
  isSubmitting?: boolean;
}

export function SessionCompletionSafeguardDialog({
  session,
  examType,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: SessionCompletionSafeguardDialogProps) {
  if (!session) return null;

  const shiftInfo = getShiftDetails(session.shift);

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return "Chưa xác định";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-rose-200 dark:border-rose-900/60 shadow-xl">
        {/* Header với dải màu cảnh báo cấp độ cao */}
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent p-6 pb-4 border-b border-border/60">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlertIcon className="size-5" />
              </div>
              <div className="space-y-0.5 text-left">
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                >
                  Session Completion Safeguard
                </Badge>
                <AlertDialogTitle className="text-lg font-bold text-foreground">
                  Xác nhận hoàn tất ca thi #{session.id}?
                </AlertDialogTitle>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-muted-foreground pt-0.5 text-left">
              Thao tác chuyển ca thi sang trạng thái Đã hoàn tất là bước chốt sổ cuối cùng của ca thi.
            </AlertDialogDescription>

            {/* Khối Cảnh báo đỏ Bất khả đảo ngược */}
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/80 dark:text-rose-200 flex items-start gap-2.5 text-left">
              <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="space-y-1">
                <p className="font-bold text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Hành động bất khả đảo ngược (Strictly Irreversible)
                </p>
                <p className="text-[11px] leading-relaxed">
                  Khi ca thi được chuyển sang trạng thái <strong>Đã hoàn tất (Completed)</strong>, hệ thống sẽ chốt sổ toàn bộ hồ sơ thí sinh, số ghế thi và khóa vĩnh viễn ca thi này. <strong>Tuyệt đối không thể hoàn tác</strong> hay mở lại ca thi sau khi đã hoàn tất.
                </p>
              </div>
            </div>

            {/* Tóm tắt metadata ca thi */}
            <div className="rounded-xl border bg-card/60 p-3 space-y-2 text-foreground text-left">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Thông tin ca thi sẽ hoàn tất
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {examType?.name ?? `Kỳ thi #${session.exam_type_id}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    Trạng thái: <strong className="ml-1 uppercase">{session.status}</strong>
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDaysIcon className="size-3.5 text-primary" />
                  <span>{formatDateDisplay(session.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                  <ClockIcon className="size-3.5 text-primary" />
                  <span>{shiftInfo.label}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground pt-1 border-t border-border/40">
                  <UsersIcon className="size-3.5 text-primary" />
                  <span>Sức chứa: <strong>{session.capacity ?? 0} thí sinh</strong></span>
                </div>
              </div>
            </div>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="p-4 bg-muted/30 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <AlertDialogCancel
            disabled={isSubmitting}
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
          >
            Hủy bỏ, giữ nguyên trạng thái
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(session);
            }}
            className="rounded-full cursor-pointer bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold h-9 w-full sm:w-auto shadow-sm"
          >
            <CheckCircle2Icon className="size-3.5 mr-1.5 text-emerald-400" />
            {isSubmitting ? "Đang xử lý..." : "Xác nhận hoàn tất ca thi"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
