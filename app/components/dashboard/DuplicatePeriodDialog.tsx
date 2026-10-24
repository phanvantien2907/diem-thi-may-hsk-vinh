import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import type { ExamPeriod } from "~/types/exam";
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
  CopyIcon,
  RefreshCwIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LayersIcon,
} from "lucide-react";
import {
  duplicateExamPeriodSchema,
  type DuplicateExamPeriodInput,
  type DuplicateExamPeriodFormValues,
} from "~/lib/schemas/admin-exam";

interface DuplicatePeriodDialogProps {
  period: ExamPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatePeriodDialog({
  period,
  open,
  onOpenChange,
}: DuplicatePeriodDialogProps) {
  const fetcher = useFetcher<{
    success?: boolean;
    message?: string;
    error?: string;
    data?: { new_period_id: number; duplicated_sessions: number };
  }>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DuplicateExamPeriodInput, unknown, DuplicateExamPeriodFormValues>({
    resolver: zodResolver(duplicateExamPeriodSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  React.useEffect(() => {
    if (open && period) {
      reset({
        name: `${period.name} (Bản sao)`,
        code: `${period.code}-NEW`,
      });
    }
  }, [open, period, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Nhân bản đợt thi thành công",
        description:
          fetcher.data.message ||
          `Đã tạo đợt thi mới #${fetcher.data.data?.new_period_id} kèm ${fetcher.data.data?.duplicated_sessions || period?.session_count} ca thi con ở trạng thái Bản nháp (Draft).`,
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể nhân bản đợt thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange, period]);

  if (!period) return null;

  const onSubmit = (data: DuplicateExamPeriodFormValues) => {
    fetcher.submit(
      {
        intent: "duplicate-period",
        period_id: String(period.id),
        name: data.name || `${period.name} (Bản sao)`,
        code: data.code || `${period.code}-NEW`,
      },
      { method: "post" }
    );
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-sky-600 border-sky-300 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-800">
              Nhân bản định kỳ (ACID)
            </Badge>
            <span className="text-xs text-muted-foreground">• Đợt nguồn: #{period.id}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Nhân bản cấu hình Đợt thi HSK
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Tái sử dụng toàn bộ cấu hình kỳ thi hàng tháng trong duy nhất một thao tác an toàn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Thẻ tóm tắt đợt thi nguồn */}
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Đợt thi nguồn:</span>
                <span className="font-mono text-muted-foreground font-bold">{period.code}</span>
              </div>
              <p className="text-sm font-bold text-foreground">{period.name}</p>
              <div className="flex items-center gap-2 pt-1 border-t text-[11px] text-muted-foreground">
                <LayersIcon className="size-3.5 text-primary" />
                <span>
                  Sẽ nhân bản toàn bộ <strong>{period.session_count} ca thi con</strong> (phòng thi, sức chứa, ca sáng/chiều, lệ phí).
                </span>
              </div>
            </div>

            {/* Quy tắc an toàn bắt buộc (§4.14) */}
            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-800 text-xs text-sky-950 dark:text-sky-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-sky-800 dark:text-sky-300">
                <ShieldCheckIcon className="size-4 shrink-0" />
                <span>Quy tắc bảo đảm an toàn dữ liệu:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li>
                  Đợt thi mới và toàn bộ ca thi con được khởi tạo ở trạng thái <strong>Bản nháp (Draft)</strong>.
                </li>
                <li>
                  Ngày thi và hạn nộp của các ca con tự động đặt về <strong>trống (NULL)</strong> nhằm buộc quản trị viên nhập ngày thi mới, loại bỏ nguy cơ phát hành nhầm lịch cũ.
                </li>
                <li>
                  <strong>Tuyệt đối không sao chép thí sinh</strong>: Đợt thi mới bắt đầu hoàn toàn sạch sẽ với 0 hồ sơ đăng ký.
                </li>
              </ul>
            </div>

            {/* Form nhập Tên & Mã đợt mới */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="dup-period-name" className="text-xs font-semibold text-foreground">
                  Tên đợt thi mới
                </Label>
                <Input
                  id="dup-period-name"
                  placeholder="Ví dụ: Đợt thi HSK Tháng 01/2027"
                  className="h-9 rounded-xl text-xs"
                  {...register("name")}
                />
                {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dup-period-code" className="text-xs font-semibold text-foreground">
                  Mã đợt thi mới
                </Label>
                <Input
                  id="dup-period-code"
                  placeholder="Ví dụ: HSK-2027-01"
                  className="h-9 rounded-xl text-xs font-mono"
                  {...register("code")}
                />
                {errors.code && <p className="text-[11px] text-destructive font-medium">{errors.code.message}</p>}
              </div>
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
              disabled={isSubmitting}
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang nhân bản đợt thi...
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5 mr-1.5" />
                  Xác nhận nhân bản
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
