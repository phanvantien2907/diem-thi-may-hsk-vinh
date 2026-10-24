import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import type { ExamSession, ExamType } from "~/types/exam";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "~/components/ui/toast";
import {
  CalendarDaysIcon,
  RefreshCwIcon,
  SaveIcon,
  AlertTriangleIcon,
  LockIcon,
} from "lucide-react";
import {
  updateExamSessionSchema,
  type UpdateExamSessionInput,
  type UpdateExamSessionFormValues,
} from "~/lib/schemas/admin-exam";

interface EditSessionDialogProps {
  session: ExamSession | null;
  examTypes: ExamType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSessionDialog({
  session,
  examTypes,
  open,
  onOpenChange,
}: EditSessionDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();
  const isPublished = session?.exam_session_publication_status === "published";
  const isCancelled = session?.status === "cancelled";
  const examType = examTypes.find((t) => t.id === session?.exam_type_id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateExamSessionInput, unknown, UpdateExamSessionFormValues>({
    resolver: zodResolver(updateExamSessionSchema),
    defaultValues: {
      date: "",
      shift: "morning",
      capacity: 40,
      fee: 0,
      registration_deadline: "",
      exam_session_check_in_at: "",
    },
  });

  const shiftValue = watch("shift");

  React.useEffect(() => {
    if (open && session) {
      reset({
        date: session.date ? session.date.slice(0, 10) : "",
        shift: session.shift || "morning",
        capacity: session.capacity || 40,
        fee: session.fee || 0,
        registration_deadline: session.registration_deadline
          ? session.registration_deadline.slice(0, 16)
          : "",
        exam_session_check_in_at: session.exam_session_check_in_at
          ? session.exam_session_check_in_at.slice(0, 16)
          : "",
      });
    }
  }, [open, session, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Cập nhật ca thi thành công",
        description: fetcher.data.message || "Đã lưu thay đổi thông tin ca thi.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể cập nhật ca thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!session) return null;

  const onSubmit = (data: UpdateExamSessionFormValues) => {
    fetcher.submit(
      {
        intent: "update-session",
        session_id: String(session.id),
        date: data.date,
        shift: data.shift,
        capacity: String(data.capacity),
        fee: String(data.fee),
        registration_deadline: data.registration_deadline
          ? new Date(data.registration_deadline).toISOString()
          : "",
        exam_session_check_in_at: data.exam_session_check_in_at
          ? new Date(data.exam_session_check_in_at).toISOString()
          : "",
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
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5">
              Ca thi #{session.id}
            </Badge>
            <span className="text-xs text-muted-foreground">• {examType?.name || "HSK"}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Chỉnh sửa thông tin Ca thi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Cập nhật ngày thi, ca thi, sức chứa và lệ phí theo API §4.18.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {isPublished && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] leading-relaxed">
                  Ca thi đã ở trạng thái <strong>Công khai (Published)</strong>. Để bảo vệ quyền lợi thí sinh, hệ thống chặn can thiệp trực tiếp vào ngày thi, sức chứa hoặc lệ phí. Mọi thay đổi ngày thi bắt buộc thông qua quy trình Dời lịch (Reschedule).
                </p>
              </div>
            )}

            {isCancelled && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <LockIcon className="size-4 shrink-0 mt-0.5 text-rose-600" />
                <p className="text-[11px] leading-relaxed">
                  Ca thi này đã bị hủy, không thể chỉnh sửa thêm bất kỳ thông tin nào.
                </p>
              </div>
            )}

            {/* Ngày thi và Ca thi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="session-date" className="text-xs font-semibold text-foreground">
                  Ngày thi (YYYY-MM-DD) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="session-date"
                  type="date"
                  disabled={isPublished || isCancelled}
                  className={`h-9 rounded-xl text-xs ${isPublished || isCancelled ? "bg-muted cursor-not-allowed" : ""}`}
                  {...register("date")}
                />
                {errors.date && <p className="text-[11px] text-destructive font-medium">{errors.date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-shift" className="text-xs font-semibold text-foreground">
                  Buổi thi (Ca thi) <span className="text-destructive">*</span>
                </Label>
                <Select
                  disabled={isPublished || isCancelled}
                  value={shiftValue}
                  onValueChange={(val) => setValue("shift", val as "morning" | "afternoon" | "evening")}
                >
                  <SelectTrigger id="session-shift" className="w-full h-9 rounded-xl px-3 text-xs">
                    <SelectValue placeholder="Chọn ca thi" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem value="morning" className="cursor-pointer text-xs">Ca sáng (08:30 - 11:30)</SelectItem>
                      <SelectItem value="afternoon" className="cursor-pointer text-xs">Ca chiều (13:30 - 16:30)</SelectItem>
                      <SelectItem value="evening" className="cursor-pointer text-xs">Ca tối (18:00 - 20:30)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sức chứa và Lệ phí */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="session-capacity" className="text-xs font-semibold text-foreground">
                  Sức chứa tối đa (Slots) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="session-capacity"
                  type="number"
                  min={1}
                  disabled={isPublished || isCancelled}
                  className={`h-9 rounded-xl text-xs ${isPublished || isCancelled ? "bg-muted cursor-not-allowed" : ""}`}
                  {...register("capacity")}
                />
                {errors.capacity && <p className="text-[11px] text-destructive font-medium">{errors.capacity.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-fee" className="text-xs font-semibold text-foreground">
                  Lệ phí thi (VNĐ) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="session-fee"
                  type="number"
                  min={0}
                  step={10000}
                  disabled={isPublished || isCancelled}
                  className={`h-9 rounded-xl text-xs ${isPublished || isCancelled ? "bg-muted cursor-not-allowed" : ""}`}
                  {...register("fee")}
                />
                {errors.fee && <p className="text-[11px] text-destructive font-medium">{errors.fee.message}</p>}
              </div>
            </div>

            {/* Hạn đăng ký & Giờ tập trung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="session-deadline" className="text-xs font-semibold text-foreground">
                  Hạn chót đăng ký <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="session-deadline"
                  type="datetime-local"
                  disabled={isPublished || isCancelled}
                  className={`h-9 rounded-xl text-xs ${isPublished || isCancelled ? "bg-muted cursor-not-allowed" : ""}`}
                  {...register("registration_deadline")}
                />
                {errors.registration_deadline && (
                  <p className="text-[11px] text-destructive font-medium">{errors.registration_deadline.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-checkin" className="text-xs font-semibold text-foreground">
                  Giờ tập trung làm thủ tục
                </Label>
                <Input
                  id="session-checkin"
                  type="datetime-local"
                  disabled={isCancelled}
                  className="h-9 rounded-xl text-xs"
                  {...register("exam_session_check_in_at")}
                />
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
              disabled={isSubmitting || isCancelled}
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
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
