import * as React from "react";
import { useFetcher } from "react-router";
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
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import { LockIcon, AlertOctagonIcon } from "lucide-react";

export interface CloseRegistrationTarget {
  type: "period" | "session";
  id: number;
  title: string;
}

interface CloseRegistrationAlertDialogProps {
  target: CloseRegistrationTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseRegistrationAlertDialog({
  target,
  open,
  onOpenChange,
}: CloseRegistrationAlertDialogProps) {
  const fetcher = useFetcher<{ success?: boolean; message?: string; error?: string }>();
  const [reason, setReason] = React.useState("Tất cả các ca thi đã kín chỗ trước thời hạn");

  React.useEffect(() => {
    if (open) {
      setReason("Tất cả các ca thi đã kín chỗ trước thời hạn");
    }
  }, [open]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Đã đóng cổng đăng ký",
        description: fetcher.data.message || "Cổng tiếp nhận đăng ký trực tuyến đã được khóa thành công.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể đóng đăng ký",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!target) return null;

  const handleConfirm = () => {
    if (target.type === "period") {
      fetcher.submit(
        {
          intent: "close-period-registration",
          period_id: String(target.id),
          reason: reason.trim(),
        },
        { method: "post" }
      );
    } else {
      fetcher.submit(
        {
          intent: "close-session-registration",
          session_id: String(target.id),
          reason: reason.trim(),
        },
        { method: "post" }
      );
    }
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="size-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
            <LockIcon className="size-5" />
          </div>
          <AlertDialogTitle className="text-lg font-bold text-foreground">
            Đóng đăng ký sớm {target.type === "period" ? "Đợt thi" : "Ca thi"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Bạn có chắc chắn muốn đóng đăng ký sớm cho{" "}
              <strong className="text-foreground">{target.title}</strong>?
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
              Hành động này sẽ khóa ngay lập tức cổng tiếp nhận hồ sơ trên giao diện thí sinh và cập nhật hạn chót về thời điểm hiện tại.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 space-y-1.5">
          <Label htmlFor="close-reg-reason" className="text-xs font-semibold text-foreground">
            Lý do đóng sớm (Ghi nhận hệ thống):
          </Label>
          <Textarea
            id="close-reg-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs rounded-xl"
            placeholder="Nhập lý do đóng đăng ký sớm..."
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isSubmitting}
            className="rounded-full cursor-pointer hover:bg-muted text-xs"
          >
            Hủy bỏ
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="rounded-full cursor-pointer bg-amber-600 text-white hover:bg-amber-700 text-xs font-medium"
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận đóng đăng ký"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
