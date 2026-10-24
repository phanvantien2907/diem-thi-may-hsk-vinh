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
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { toast } from "~/components/ui/toast";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  EditIcon,
  RefreshCwIcon,
  SaveIcon,
  LockIcon,
} from "lucide-react";
import {
  updateExamPeriodSchema,
  type UpdateExamPeriodInput,
  type UpdateExamPeriodFormValues,
} from "~/lib/schemas/admin-exam";

interface EditPeriodDialogProps {
  period: ExamPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReschedule?: (period: ExamPeriod) => void;
}

export function EditPeriodDialog({
  period,
  open,
  onOpenChange,
  onOpenReschedule,
}: EditPeriodDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();
  const isDraft = period?.status === "draft";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateExamPeriodInput, unknown, UpdateExamPeriodFormValues>({
    resolver: zodResolver(updateExamPeriodSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      start_date: "",
      end_date: "",
      registration_start: "",
      registration_deadline: "",
    },
  });

  React.useEffect(() => {
    if (open && period) {
      reset({
        name: period.name || "",
        description: period.description || "",
        instructions: period.instructions || "",
        start_date: period.start_date || "",
        end_date: period.end_date || "",
        registration_start: period.registration_start
          ? period.registration_start.slice(0, 16)
          : "",
        registration_deadline: period.registration_deadline
          ? period.registration_deadline.slice(0, 16)
          : "",
      });
    }
  }, [open, period, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Cập nhật thành công",
        description: fetcher.data.message || "Đã lưu thay đổi thông tin đợt thi.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể cập nhật đợt thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!period) return null;

  const onSubmit = (data: UpdateExamPeriodFormValues) => {
    fetcher.submit(
      {
        intent: "update-period",
        period_id: String(period.id),
        ...data,
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
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5">
              Đợt #{period.id} • Mã: {period.code}
            </Badge>
            <span className="text-xs text-muted-foreground">
              • Trạng thái: <strong className="uppercase">{period.status}</strong>
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Chỉnh sửa Đợt thi HSK
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Cập nhật thông tin đợt thi theo đúng ràng buộc an toàn của hệ thống.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Cảnh báo an toàn nếu đợt thi không phải draft */}
            {!isDraft && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Chế độ bảo vệ tính toàn vẹn (Safety Invariant)</p>
                  <p className="text-[11px] leading-relaxed">
                    Đợt thi này đã mở hoặc đã công khai ({period.status}). Hệ thống khóa trực tiếp các trường ngày thi và hạn đăng ký để tránh làm gián đoạn thí sinh. Để đổi ngày thi, vui lòng sử dụng chức năng{" "}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenReschedule?.(period);
                      }}
                      className="underline font-bold text-amber-950 dark:text-amber-200 cursor-pointer hover:opacity-80"
                    >
                      Dời lịch thi (Reschedule)
                    </button>.
                  </p>
                </div>
              </div>
            )}

            {/* Tên đợt thi */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-period-name" className="text-xs font-semibold text-foreground">
                Tên đợt thi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-period-name"
                className="h-9 rounded-xl text-xs"
                {...register("name")}
              />
              {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name.message}</p>}
            </div>

            {/* Ngày thi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-period-start-date" className="text-xs font-semibold text-foreground">
                    Ngày bắt đầu thi
                  </Label>
                  {!isDraft && (
                    <span title="Đã khóa">
                      <LockIcon className="size-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <Input
                  id="edit-period-start-date"
                  type="date"
                  disabled={!isDraft}
                  className={`h-9 rounded-xl text-xs ${!isDraft ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}`}
                  {...register("start_date")}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-period-end-date" className="text-xs font-semibold text-foreground">
                    Ngày kết thúc thi
                  </Label>
                  {!isDraft && (
                    <span title="Đã khóa">
                      <LockIcon className="size-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <Input
                  id="edit-period-end-date"
                  type="date"
                  disabled={!isDraft}
                  className={`h-9 rounded-xl text-xs ${!isDraft ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}`}
                  {...register("end_date")}
                />
              </div>
            </div>

            {/* Hạn đăng ký */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-period-reg-start" className="text-xs font-semibold text-foreground">
                    Thời điểm mở đăng ký
                  </Label>
                  {!isDraft && (
                    <span title="Đã khóa">
                      <LockIcon className="size-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <Input
                  id="edit-period-reg-start"
                  type="datetime-local"
                  disabled={!isDraft}
                  className={`h-9 rounded-xl text-xs ${!isDraft ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}`}
                  {...register("registration_start")}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-period-reg-deadline" className="text-xs font-semibold text-foreground">
                    Hạn chót đóng đăng ký
                  </Label>
                  {!isDraft && (
                    <span title="Đã khóa">
                      <LockIcon className="size-3 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <Input
                  id="edit-period-reg-deadline"
                  type="datetime-local"
                  disabled={!isDraft}
                  className={`h-9 rounded-xl text-xs ${!isDraft ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}`}
                  {...register("registration_deadline")}
                />
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-period-desc" className="text-xs font-semibold text-foreground">
                Mô tả chi tiết đợt thi
              </Label>
              <Textarea
                id="edit-period-desc"
                rows={2}
                className="text-xs rounded-xl"
                {...register("description")}
              />
            </div>

            {/* Hướng dẫn thí sinh */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-period-instructions" className="text-xs font-semibold text-foreground">
                Hướng dẫn cho thí sinh
              </Label>
              <Textarea
                id="edit-period-instructions"
                rows={2}
                className="text-xs rounded-xl"
                {...register("instructions")}
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
              disabled={isSubmitting}
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu thay đổi...
                </>
              ) : (
                <>
                  <SaveIcon className="size-3.5 mr-1.5" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
