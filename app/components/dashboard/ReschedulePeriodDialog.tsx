import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import type { ExamPeriod } from "~/types/exam";
import { getPeriodRescheduleBlockReason } from "~/lib/exam-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { toast } from "~/components/ui/toast";
import {
  CalendarClockIcon,
  RefreshCwIcon,
  BellRingIcon,
  ShieldAlertIcon,
  SendIcon,
} from "lucide-react";
import {
  rescheduleExamPeriodSchema,
  type RescheduleExamPeriodInput,
  type RescheduleExamPeriodFormValues,
} from "~/lib/schemas/admin-exam";

interface ReschedulePeriodDialogProps {
  period: ExamPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReschedulePeriodDialog({
  period,
  open,
  onOpenChange,
}: ReschedulePeriodDialogProps) {
  const fetcher = useFetcher<{
    success?: boolean;
    message?: string;
    error?: string;
    data?: {
      period_id: number;
      updated_sessions: number;
      candidates_alerted: number;
      reason: string;
    };
  }>();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RescheduleExamPeriodInput, unknown, RescheduleExamPeriodFormValues>({
    resolver: zodResolver(rescheduleExamPeriodSchema),
    defaultValues: {
      new_start_date: "",
      new_end_date: "",
      new_registration_deadline: "",
      reason: "",
      send_notification: true,
    },
  });

  const sendNotification = watch("send_notification");

  React.useEffect(() => {
    if (open && period) {
      reset({
        new_start_date: "",
        new_end_date: "",
        new_registration_deadline: "",
        reason: "",
        send_notification: true,
      });
    }
  }, [open, period, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Dời lịch thi thành công",
        description:
          fetcher.data.message ||
          `Đã dời lịch đợt thi #${period?.id}, đồng bộ ${fetcher.data.data?.updated_sessions || period?.session_count} ca con và phát thông báo tới ${fetcher.data.data?.candidates_alerted || 0} thí sinh.`,
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể dời lịch thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange, period]);

  if (!period) return null;

  const rescheduleBlockReason = getPeriodRescheduleBlockReason(period);
  const isBlocked = rescheduleBlockReason !== null;

  const onSubmit = (data: RescheduleExamPeriodFormValues) => {
    if (isBlocked) {
      toast.add({
        type: "error",
        title: "Không thể dời lịch thi",
        description: rescheduleBlockReason ?? "Đợt thi đang ở trạng thái không cho phép dời lịch.",
      });
      return;
    }
    fetcher.submit(
      {
        intent: "reschedule-period",
        period_id: String(period.id),
        new_start_date: data.new_start_date,
        new_end_date: data.new_end_date || data.new_start_date,
        new_registration_deadline: data.new_registration_deadline
          ? new Date(data.new_registration_deadline).toISOString()
          : "",
        reason: data.reason.trim(),
        send_notification: String(data.send_notification),
      },
      { method: "post" }
    );
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
              Quy trình Bất khả kháng (§4.15)
            </Badge>
            <span className="text-xs text-muted-foreground">• Đợt thi #{period.id}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Dời lịch thi Đợt thi (Reschedule)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Áp dụng khi gặp sự cố bất khả kháng (thiên tai, dịch bệnh, sửa chữa hội trường).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {isBlocked && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs">
                <p className="font-semibold text-xs">Không thể dời lịch thi</p>
                <p className="text-[11px] leading-relaxed mt-1">{rescheduleBlockReason}</p>
              </div>
            )}

            {/* Thông báo nghiệp vụ bắt buộc */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-800 dark:text-indigo-300">
                <ShieldAlertIcon className="size-4 shrink-0" />
                <span>Cơ chế bảo vệ thí sinh & Đồng bộ hệ thống:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li>
                  Tự động cập nhật ngày thi mới cho <strong>toàn bộ {period.session_count} ca thi con</strong> thuộc đợt.
                </li>
                <li>
                  <strong>Bảo toàn nguyên vẹn 100% hồ sơ thí sinh</strong>: Giữ nguyên mã ghế và trạng thái đăng ký của các thí sinh đã nộp lệ phí.
                </li>
                <li>
                  Bắt buộc ghi nhận lý do vào <strong>Nhật ký kiểm toán (Audit Log)</strong> phục vụ thanh tra.
                </li>
              </ul>
            </div>

            {/* Thông tin đợt hiện tại */}
            <div className="p-3 rounded-xl border bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Đợt thi: </span>
                <strong className="text-foreground">{period.name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Lịch hiện tại: </span>
                <strong className="text-foreground">
                  {period.start_date || "Chưa đặt"} {period.end_date && period.end_date !== period.start_date ? `đến ${period.end_date}` : ""}
                </strong>
              </div>
            </div>

            {/* Ngày thi mới */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reschedule-start-date" className="text-xs font-semibold text-foreground">
                  Ngày bắt đầu thi mới (YYYY-MM-DD) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reschedule-start-date"
                  type="date"
                  className="h-9 rounded-xl text-xs"
                  {...register("new_start_date")}
                />
                {errors.new_start_date && (
                  <p className="text-[11px] text-destructive font-medium">{errors.new_start_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reschedule-end-date" className="text-xs font-semibold text-foreground">
                  Ngày kết thúc thi mới (YYYY-MM-DD)
                </Label>
                <Input
                  id="reschedule-end-date"
                  type="date"
                  className="h-9 rounded-xl text-xs"
                  {...register("new_end_date")}
                />
                {errors.new_end_date && (
                  <p className="text-[11px] text-destructive font-medium">{errors.new_end_date.message}</p>
                )}
              </div>
            </div>

            {/* Hạn đăng ký mới (tùy chọn) */}
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-deadline" className="text-xs font-semibold text-foreground">
                Hạn chót đăng ký mới (Tùy chọn gia hạn cho thí sinh)
              </Label>
              <Input
                id="reschedule-deadline"
                type="datetime-local"
                className="h-9 rounded-xl text-xs"
                {...register("new_registration_deadline")}
              />
            </div>

            {/* Lý do dời lịch thi */}
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-reason" className="text-xs font-semibold text-foreground">
                Lý do dời lịch thi <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reschedule-reason"
                rows={3}
                placeholder="Nhập lý do chi tiết (ví dụ: Do ảnh hưởng bão số 6 gây ngập lụt, hội đồng dời lịch sang ngày mới để bảo đảm an toàn)..."
                className="text-xs rounded-xl"
                {...register("reason")}
              />
              {errors.reason && (
                <p className="text-[11px] text-destructive font-medium">{errors.reason.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Lý do này sẽ được gửi tới toàn bộ thí sinh và lưu cố định vào Audit Log của hệ thống.
              </p>
            </div>

            {/* Tùy chọn gửi thông báo */}
            <div className="p-3 rounded-xl border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRingIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Phát thông báo tự động (Bulk Notification)</p>
                  <p className="text-[11px] text-muted-foreground">Gửi thông báo diện rộng kèm lý do tới tất cả thí sinh đã nộp hồ sơ.</p>
                </div>
              </div>
              <input
                type="checkbox"
                id="reschedule-notify"
                checked={sendNotification}
                onChange={(e) => setValue("send_notification", e.target.checked)}
                className="size-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isBlocked}
              className="rounded-full cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang dời lịch và phát thông báo...
                </>
              ) : (
                <>
                  <CalendarClockIcon className="size-3.5 mr-1.5" />
                  Xác nhận Dời lịch thi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
