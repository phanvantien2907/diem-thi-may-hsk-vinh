import * as React from "react";
import { AlertTriangleIcon, Loader2Icon, UserXIcon } from "lucide-react";
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
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import type { SlotRegisteredCandidateItemDTO } from "~/types/registration-results";

interface AdminCancelRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateItem: SlotRegisteredCandidateItemDTO | null;
  onConfirm: (payload: { reason: string; evidence_urls: string[] }) => Promise<void>;
  isSubmitting?: boolean;
}

export function AdminCancelRegistrationDialog({
  open,
  onOpenChange,
  candidateItem,
  onConfirm,
  isSubmitting = false,
}: AdminCancelRegistrationDialogProps) {
  const [reason, setReason] = React.useState("");
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setReason("");
      setEvidenceUrl("");
      setError(null);
    }
  }, [open]);

  if (!candidateItem) return null;

  const isPaid =
    candidateItem.payment_status === "success" ||
    candidateItem.registration_status === "confirmed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Lý do hủy bắt buộc và phải có ít nhất 3 ký tự.");
      return;
    }
    setError(null);

    const urls = evidenceUrl.trim() ? [evidenceUrl.trim()] : [];
    await onConfirm({ reason: trimmedReason, evidence_urls: urls });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="data-[size=default]:max-w-md data-[size=default]:sm:max-w-lg w-[calc(100vw-2rem)] sm:w-full">
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="p-2 rounded-full bg-destructive/10">
              <UserXIcon className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base sm:text-lg">
                Xác nhận Hủy Đăng ký Thí sinh
              </AlertDialogTitle>
              <span className="text-xs text-muted-foreground font-normal">
                Thao tác quản trị cấp cao — Bất khả đảo ngược
              </span>
            </div>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm text-foreground/80 pt-2 space-y-2">
            <p>
              Bạn đang chuẩn bị hủy phiếu đăng ký <strong>#{candidateItem.registration_id}</strong> của thí sinh:
            </p>
            <div className="bg-muted/50 border rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Họ và tên:</span>
                <span className="font-semibold text-foreground">
                  {candidateItem.full_name}
                  {candidateItem.full_name_cn ? ` (${candidateItem.full_name_cn})` : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Giấy tờ tùy thân:</span>
                <span className="font-mono">{candidateItem.masked_doc_number || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Số ghế:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  Ghế #{candidateItem.seat_number}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trạng thái thanh toán:</span>
                <Badge
                  variant={isPaid ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isPaid ? "Đã thanh toán" : "Chờ thanh toán"}
                </Badge>
              </div>
            </div>

            {isPaid ? (
              <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex gap-2 items-start">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Cơ chế tự động hoàn tiền:</strong> Đơn này đã xác nhận nộp phí. Khi hủy, hệ thống sẽ tự động giải phóng ghế về trạng thái <code>available</code> và chuyển giao dịch thanh toán sang trạng thái <code>pending_refund</code> để bộ phận kế toán thực hiện hoàn tiền.
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                Ghế giữ tạm thời của thí sinh sẽ được giải phóng ngay lập tức cho các thí sinh khác hoặc danh sách chờ.
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-xs font-medium">
              Lý do hủy đăng ký <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              placeholder="Nhập lý do chi tiết (ví dụ: Thí sinh xin rút hồ sơ do trùng lịch cá nhân, đã xác nhận qua điện thoại)..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              className="text-xs resize-none"
              disabled={isSubmitting}
            />
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-evidence" className="text-xs font-medium">
              Đường dẫn ảnh chứng từ / đơn đề nghị (tùy chọn)
            </Label>
            <Input
              id="cancel-evidence"
              type="url"
              placeholder="https://example.com/don-rut-ho-so.jpg"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="text-xs h-8"
              disabled={isSubmitting}
            />
          </div>

          <AlertDialogFooter className="mx-0 mb-0 pt-2 gap-2 sm:gap-0">
            <AlertDialogCancel
              type="button"
              className="rounded-full cursor-pointer hover:bg-muted"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Giữ lại đơn
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              className="rounded-full cursor-pointer hover:bg-destructive/90 gap-1.5"
              disabled={isSubmitting || reason.trim().length < 3}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Đang hủy...</span>
                </>
              ) : (
                <>
                  <UserXIcon className="size-4" />
                  <span>Xác nhận Hủy Đăng ký</span>
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

