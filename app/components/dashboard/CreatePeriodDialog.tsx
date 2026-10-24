import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
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
  CalendarDaysIcon,
  CalendarPlusIcon,
  FileTextIcon,
  RefreshCwIcon,
  InfoIcon,
} from "lucide-react";
import {
  createExamPeriodSchema,
  type CreateExamPeriodInput,
  type CreateExamPeriodFormValues,
} from "~/lib/schemas/admin-exam";

interface CreatePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePeriodDialog({ open, onOpenChange }: CreatePeriodDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateExamPeriodInput, unknown, CreateExamPeriodFormValues>({
    resolver: zodResolver(createExamPeriodSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      instructions: "Thí sinh vui lòng mang theo Căn cước công dân hoặc Hộ chiếu gốc và có mặt trước giờ thi 30 phút.",
      start_date: "",
      end_date: "",
      registration_start: "",
      registration_deadline: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: "",
        code: `HSK-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        description: "",
        instructions: "Thí sinh vui lòng mang theo Căn cước công dân hoặc Hộ chiếu gốc và có mặt trước giờ thi 30 phút.",
        start_date: "",
        end_date: "",
        registration_start: "",
        registration_deadline: "",
      });
    }
  }, [open, reset]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Tạo đợt thi thành công",
        description: fetcher.data.message || "Đợt thi mới đã được tạo ở trạng thái bản nháp (Draft).",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể tạo đợt thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  const onSubmit = (data: CreateExamPeriodFormValues) => {
    fetcher.submit(
      {
        intent: "create-period",
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
              Khởi tạo kỳ thi
            </Badge>
            <span className="text-xs text-muted-foreground">• Cấp độ Đợt thi (Exam Period)</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Tạo mới Đợt thi HSK
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Đợt thi được tạo ở trạng thái Bản nháp (Draft). Bạn có thể thêm các ca thi con sau khi khởi tạo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Tên và Mã đợt thi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-period-name" className="text-xs font-semibold text-foreground">
                  Tên đợt thi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-period-name"
                  placeholder="Ví dụ: Đợt thi HSK Tháng 12/2026"
                  className="h-9 rounded-xl text-xs"
                  {...register("name")}
                />
                {errors.name && <p className="text-[11px] text-destructive font-medium">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-period-code" className="text-xs font-semibold text-foreground">
                  Mã đợt thi (Duy nhất) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-period-code"
                  placeholder="Ví dụ: HSK-2026-12"
                  className="h-9 rounded-xl text-xs font-mono"
                  {...register("code")}
                />
                {errors.code && <p className="text-[11px] text-destructive font-medium">{errors.code.message}</p>}
              </div>
            </div>

            {/* Ngày thi dự kiến */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-period-start-date" className="text-xs font-semibold text-foreground">
                  Ngày bắt đầu thi (YYYY-MM-DD)
                </Label>
                <Input
                  id="create-period-start-date"
                  type="date"
                  className="h-9 rounded-xl text-xs"
                  {...register("start_date")}
                />
                {errors.start_date && <p className="text-[11px] text-destructive font-medium">{errors.start_date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-period-end-date" className="text-xs font-semibold text-foreground">
                  Ngày kết thúc thi (YYYY-MM-DD)
                </Label>
                <Input
                  id="create-period-end-date"
                  type="date"
                  className="h-9 rounded-xl text-xs"
                  {...register("end_date")}
                />
                {errors.end_date && <p className="text-[11px] text-destructive font-medium">{errors.end_date.message}</p>}
              </div>
            </div>

            {/* Thời gian mở và đóng tiếp nhận hồ sơ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-period-reg-start" className="text-xs font-semibold text-foreground">
                  Thời điểm mở đăng ký
                </Label>
                <Input
                  id="create-period-reg-start"
                  type="datetime-local"
                  className="h-9 rounded-xl text-xs"
                  {...register("registration_start")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-period-reg-deadline" className="text-xs font-semibold text-foreground">
                  Hạn chót đăng ký
                </Label>
                <Input
                  id="create-period-reg-deadline"
                  type="datetime-local"
                  className="h-9 rounded-xl text-xs"
                  {...register("registration_deadline")}
                />
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <Label htmlFor="create-period-desc" className="text-xs font-semibold text-foreground">
                Mô tả chi tiết đợt thi
              </Label>
              <Textarea
                id="create-period-desc"
                rows={2}
                placeholder="Mô tả đối tượng dự thi, địa điểm tổ chức hoặc quy chế bổ sung..."
                className="text-xs rounded-xl"
                {...register("description")}
              />
            </div>

            {/* Hướng dẫn thí sinh */}
            <div className="space-y-1.5">
              <Label htmlFor="create-period-instructions" className="text-xs font-semibold text-foreground">
                Hướng dẫn dự thi cho thí sinh
              </Label>
              <Textarea
                id="create-period-instructions"
                rows={2}
                placeholder="Yêu cầu về giấy tờ tùy thân, thời gian có mặt..."
                className="text-xs rounded-xl"
                {...register("instructions")}
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border text-xs text-muted-foreground flex items-start gap-2">
              <InfoIcon className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Sau khi tạo đợt thi thành công, bạn có thể tạo mới các ca thi con hoặc nhân bản từ các đợt thi trước đó để tái sử dụng cấu hình phòng thi và lệ phí.
              </span>
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
                  Đang khởi tạo đợt thi...
                </>
              ) : (
                <>
                  <CalendarPlusIcon className="size-3.5 mr-1.5" />
                  Tạo đợt thi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
