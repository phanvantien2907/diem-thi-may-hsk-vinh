import * as React from "react";
import { useFetcher } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Badge } from "~/components/ui/badge";
import { toast } from "~/components/ui/toast";
import {
  RotateCcwIcon,
  CalendarClockIcon,
  AlertTriangleIcon,
  InfoIcon,
  Loader2Icon,
} from "lucide-react";
import {
  reopenRegistrationSchema,
  type ReopenRegistrationFormValues,
} from "~/lib/schemas/admin-exam";

export interface ReopenRegistrationTarget {
  type: "period" | "session";
  id: number;
  title: string;
  code?: string;
  currentDeadline?: string | null;
  closedReason?: string | null;
  startDate?: string | null;
}

interface ReopenRegistrationDialogProps {
  target: ReopenRegistrationTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReopenRegistrationDialog({
  target,
  open,
  onOpenChange,
}: ReopenRegistrationDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();

  const isPeriod = target?.type === "period";
  const isDeadlineClosed = !isPeriod && target?.closedReason === "deadline";
  const isFullClosed = !isPeriod && target?.closedReason === "full";
  const isPeriodClosed = !isPeriod && target?.closedReason === "period_closed";
  const isManualClosed = !isPeriod && (!target?.closedReason || target?.closedReason === "manual");

  // Hạn đăng ký bắt buộc với đợt thi hoặc ca thi đóng do hết hạn
  const isDeadlineRequired = isPeriod || isDeadlineClosed;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ReopenRegistrationFormValues>({
    resolver: zodResolver(reopenRegistrationSchema),
    defaultValues: {
      registration_deadline: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        registration_deadline: "",
      });
    }
  }, [open, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Đã mở lại cổng đăng ký",
        description: fetcher.data.message || "Cổng tiếp nhận hồ sơ trực tuyến đã được mở lại thành công.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể mở lại đăng ký",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!target) return null;

  const onSubmit = (values: ReopenRegistrationFormValues) => {
    const rawDeadline = values.registration_deadline?.trim() || "";

    if (isDeadlineRequired) {
      if (!rawDeadline) {
        setError("registration_deadline", {
          type: "manual",
          message: "Vui lòng nhập thời hạn kết thúc đăng ký mới",
        });
        return;
      }

      const deadlineTime = new Date(rawDeadline).getTime();
      if (isNaN(deadlineTime) || deadlineTime <= Date.now()) {
        setError("registration_deadline", {
          type: "manual",
          message: "Hạn chót đăng ký mới bắt buộc phải ở tương lai",
        });
        return;
      }

      if (target.startDate) {
        const startDateTime = new Date(target.startDate).getTime();
        if (!isNaN(startDateTime) && deadlineTime >= startDateTime) {
          setError("registration_deadline", {
            type: "manual",
            message: "Hạn đăng ký phải trước ngày tổ chức thi",
          });
          return;
        }
      }
    } else if (rawDeadline) {
      const deadlineTime = new Date(rawDeadline).getTime();
      if (isNaN(deadlineTime) || deadlineTime <= Date.now()) {
        setError("registration_deadline", {
          type: "manual",
          message: "Hạn chót đăng ký mới phải ở tương lai",
        });
        return;
      }
    }

    if (isPeriod) {
      fetcher.submit(
        {
          intent: "reopen-period-registration",
          period_id: String(target.id),
          registration_deadline: rawDeadline,
        },
        { method: "post" }
      );
    } else {
      fetcher.submit(
        {
          intent: "reopen-session-registration",
          session_id: String(target.id),
          registration_deadline: rawDeadline,
        },
        { method: "post" }
      );
    }
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40"
            >
              {isPeriod ? "Đợt thi" : "Ca thi"} #{target.id}
            </Badge>
            {target.code && (
              <span className="text-xs text-muted-foreground font-mono font-medium">
                {target.code}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <RotateCcwIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            Mở lại cổng đăng ký {isPeriod ? "Đợt thi" : "Ca thi"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Khôi phục trạng thái tiếp nhận thí sinh đăng ký dự thi trực tuyến theo API §4.13 và §4.27.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4">
            {/* Cảnh báo đặc thù khi Ca thi đầy chỗ */}
            {isFullClosed && (
              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-900/60 dark:text-orange-300 text-xs flex items-start gap-2.5">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Ca thi đã kín chỗ 100%</p>
                  <p className="text-[11px] leading-relaxed">
                    Theo quy tắc nghiệp vụ §4.14, ca thi đóng vì đầy sĩ số không thể mở lại trực tiếp. Bạn cần thực hiện <strong>Nới sĩ số (tăng số slots)</strong> để hệ thống tự động mở lại cổng đăng ký.
                  </p>
                </div>
              </div>
            )}

            {/* Cảnh báo đặc thù khi Ca thi đóng theo đợt cha */}
            {isPeriodClosed && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Ca thi bị đóng theo Đợt thi cha</p>
                  <p className="text-[11px] leading-relaxed">
                    Ca thi này mang mã đóng <code>period_closed</code>. Bạn cần <strong>Mở lại đăng ký từ Đợt thi cha</strong> để hệ thống tự động kích hoạt lại ca thi này.
                  </p>
                </div>
              </div>
            )}

            {/* Thông tin giải thích cascade đối với Đợt thi */}
            {isPeriod && (
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-900/60 dark:text-sky-300 text-xs flex items-start gap-2.5">
                <InfoIcon className="size-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Cơ chế Cascade tự động</p>
                  <p className="text-[11px] leading-relaxed">
                    Khi mở lại đăng ký đợt thi, chỉ các ca thi con từng bị đóng theo đợt (<code>period_closed</code>) sẽ tự động quay về trạng thái <strong>Mở đăng ký (open)</strong>. Các ca thi đã đầy chỗ hoặc đóng thủ công sẽ được giữ nguyên trạng thái.
                  </p>
                </div>
              </div>
            )}

            {/* Thông tin hạn chót cũ */}
            {target.currentDeadline && (
              <div className="text-xs text-muted-foreground flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                <span className="font-medium">Hạn đăng ký trước khi đóng:</span>
                <span className="font-mono text-foreground font-semibold">
                  {new Date(target.currentDeadline).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {/* Input Hạn chót nộp hồ sơ mới */}
            <div className="space-y-1.5">
              <Label htmlFor="reopen-deadline" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarClockIcon className="size-3.5 text-muted-foreground" />
                Hạn chót đăng ký mới {isDeadlineRequired && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="reopen-deadline"
                type="datetime-local"
                disabled={isFullClosed || isPeriodClosed || isSubmitting}
                className={`h-9 rounded-xl text-xs bg-background ${
                  errors.registration_deadline ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                {...register("registration_deadline")}
              />
              {errors.registration_deadline && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.registration_deadline.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {isPeriod
                  ? "Bắt buộc chọn thời điểm trong tương lai và trước ngày bắt đầu tổ chức thi."
                  : isDeadlineClosed
                  ? "Ca thi đã hết hạn đăng ký trước đó. Bắt buộc nhập thời điểm mới trong tương lai."
                  : isManualClosed
                  ? "Tùy chọn: Nhập hạn đăng ký mới hoặc để trống nếu giữ nguyên thời hạn tiếp nhận."
                  : ""}
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/40 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="rounded-full cursor-pointer hover:bg-muted text-xs h-8"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isFullClosed || isPeriodClosed || isSubmitting}
              className="rounded-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-2xs font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Đang mở lại...
                </>
              ) : (
                <>
                  <RotateCcwIcon className="size-3 mr-1.5" />
                  Xác nhận mở lại
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

