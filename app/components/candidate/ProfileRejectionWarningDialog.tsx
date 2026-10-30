import * as React from "react";
import { useNavigate } from "react-router";
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
import {
  AlertTriangleIcon,
  ShieldAlertIcon,
  ArrowRightIcon,
  FileTextIcon,
  LockIcon,
} from "lucide-react";

interface ProfileRejectionWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason?: string | null;
  onFixProfile?: () => void;
}

export function ProfileRejectionWarningDialog({
  open,
  onOpenChange,
  rejectionReason,
  onFixProfile,
}: ProfileRejectionWarningDialogProps) {
  const navigate = useNavigate();

  const handleNavigateToProfile = () => {
    onOpenChange(false);
    if (onFixProfile) {
      onFixProfile();
    } else {
      navigate("/thong-tin-thi-sinh?rejected=true");
    }
  };

  const displayReason =
    rejectionReason && rejectionReason.trim().length > 0
      ? rejectionReason.trim()
      : "Ảnh chân dung hoặc giấy tờ tùy thân chưa đáp ứng yêu cầu của hệ thống (phải có phông nền trắng, không đeo kính, chụp rõ nét và không bị lóa sáng).";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="data-[size=default]:max-w-md data-[size=default]:sm:max-w-lg w-[calc(100vw-2rem)] sm:w-full p-0 overflow-hidden border-rose-200 dark:border-rose-900/60 shadow-2xl">
        {/* Header với dải màu cảnh báo cấp độ cao */}
        <div className="bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent p-5 sm:p-6 pb-4 border-b border-rose-200/50 dark:border-rose-900/40">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlertIcon className="size-6" />
              </div>
              <div className="space-y-0.5 text-left">
                <Badge
                  variant="outline"
                  className="rounded-full px-2.5 py-0 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                >
                  Hồ sơ chưa đạt kiểm duyệt
                </Badge>
                <AlertDialogTitle className="text-lg font-bold text-foreground">
                  Hồ sơ thí sinh bị từ chối
                </AlertDialogTitle>
              </div>
            </div>

            <AlertDialogDescription className="text-xs text-muted-foreground pt-0.5 text-left">
              Hệ thống hoặc Ban kiểm định đã phát hiện thông tin/ảnh giấy tờ tùy thân của bạn chưa đạt chuẩn quy định dự thi HSK.
            </AlertDialogDescription>

            {/* Khối hiển thị lý do từ chối cụ thể */}
            <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-900/80 dark:text-rose-200 space-y-2 text-left">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                <AlertTriangleIcon className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>Lý do từ chối từ Ban kiểm định:</span>
              </div>
              <div className="rounded-lg bg-white/80 dark:bg-black/30 p-3 border border-rose-200/60 dark:border-rose-900/60 text-xs font-medium text-foreground leading-relaxed break-words">
                &ldquo;{displayReason}&rdquo;
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vui lòng chuẩn bị lại ảnh chân dung 3×4 phông nền trắng, không đeo kính hoặc quét lại CCCD/Hộ chiếu rõ nét để cập nhật lại.
              </p>
            </div>

            {/* Cảnh báo khóa luồng đăng ký thi */}
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 text-left">
              <LockIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="leading-snug">
                <strong>Khóa luồng đăng ký:</strong> Trong thời gian hồ sơ bị từ chối, toàn bộ chức năng chọn ca thi và nộp lệ phí sẽ tạm thời bị khóa.
              </span>
            </div>
          </AlertDialogHeader>
        </div>

        {/* Footer với 2 nút theo chuẩn Button project-rules (khử margin âm, responsive mobile-first) */}
        <AlertDialogFooter className="mx-0 mb-0 p-4 sm:p-5 bg-muted/20 border-t border-border/50 gap-2.5 sm:gap-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end">
          <AlertDialogCancel className="w-full sm:w-auto rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm h-10 px-4">
            Tôi đã hiểu, xem lại sau
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleNavigateToProfile}
            className="w-full sm:w-auto rounded-full cursor-pointer hover:bg-primary/90 bg-primary text-primary-foreground font-semibold text-xs sm:text-sm h-10 px-5 gap-2 shadow-sm shrink-0"
          >
            <FileTextIcon className="size-4 shrink-0" />
            <span>Cập nhật hồ sơ ngay</span>
            <ArrowRightIcon className="size-3.5 shrink-0" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

