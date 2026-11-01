import * as React from "react";
import { ArrowRightLeftIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import type {
  SlotRegisteredCandidateItemDTO,
  SlotRegistrationStatsDTO,
} from "~/types/registration-results";

interface AdminTransferRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateItem: SlotRegisteredCandidateItemDTO | null;
  currentSession: SlotRegistrationStatsDTO | null;
  availableSessions: SlotRegistrationStatsDTO[];
  onConfirm: (payload: { new_exam_session_id: number; reason: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function AdminTransferRegistrationDialog({
  open,
  onOpenChange,
  candidateItem,
  currentSession,
  availableSessions,
  onConfirm,
  isSubmitting = false,
}: AdminTransferRegistrationDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedSessionId("");
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!candidateItem) return null;

  // Filter out the current session and sessions with no available seats
  const targetSessions = availableSessions.filter(
    (s) => s.session_id !== candidateItem.session_id && s.available_seats > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSessionId = Number(selectedSessionId);
    if (!Number.isInteger(newSessionId) || newSessionId <= 0) {
      setError("Vui lòng chọn ca thi đích hợp lệ.");
      return;
    }
    setError(null);

    await onConfirm({
      new_exam_session_id: newSessionId,
      reason: reason.trim(),
    });
  };

  const selectedSession = targetSessions.find(
    (s) => String(s.session_id) === selectedSessionId
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="data-[size=default]:max-w-md data-[size=default]:sm:max-w-lg w-[calc(100vw-2rem)] sm:w-full">
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 rounded-full bg-primary/10">
              <ArrowRightLeftIcon className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base sm:text-lg">
                Chuyển Ca Thi cho Thí sinh
              </AlertDialogTitle>
              <span className="text-xs text-muted-foreground font-normal">
                Bảo toàn trạng thái thanh toán & tự động hoán đổi ghế
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-xs sm:text-sm text-foreground/80 pt-2 space-y-2">
            <div className="bg-muted/50 border rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Thí sinh:</span>
                <span className="font-semibold text-foreground">
                  {candidateItem.full_name}
                  {candidateItem.full_name_cn ? ` (${candidateItem.full_name_cn})` : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ca thi hiện tại:</span>
                <span className="font-medium text-foreground">
                  {currentSession?.exam_type_name ?? "—"} ({currentSession?.room_name ?? "Phòng thi"})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ghế hiện tại:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  Ghế #{candidateItem.seat_number}
                </Badge>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="target-session-select" className="text-xs font-medium">
              Chọn ca thi đích <span className="text-destructive">*</span>
            </Label>
            {targetSessions.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
                Không tìm thấy ca thi nào khác còn ghế trống trong đợt này.
              </p>
            ) : (
              <Select
                value={selectedSessionId}
                onValueChange={(val) => {
                  setSelectedSessionId(val ?? "");
                  if (error) setError(null);
                }}
              >
                <SelectTrigger id="target-session-select" className="h-9 text-xs">
                  <SelectValue placeholder="Chọn ca thi đích còn ghế..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {targetSessions.map((s) => (
                    <SelectItem key={s.session_id} value={String(s.session_id)} className="text-xs">
                      {s.exam_type_name} — {s.room_name} ({s.exam_date} {s.shift === "morning" ? "Sáng" : s.shift === "afternoon" ? "Chiều" : "Tối"}) — Còn {s.available_seats} ghế
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>

          {selectedSession && (
            <div className="p-2.5 rounded bg-primary/5 border border-primary/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-primary">
                <CheckCircle2Icon className="size-3.5" />
                <span>Ca thi đích hợp lệ:</span>
              </div>
              <p className="text-muted-foreground">
                Sau khi xác nhận, hàm cơ sở dữ liệu <code>fn_transfer_registration</code> sẽ tự động giải phóng ghế #{candidateItem.seat_number} tại ca cũ và cấp ghế trống đầu tiên tại ca <strong>{selectedSession.exam_type_name}</strong>.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="transfer-reason" className="text-xs font-medium">
              Lý do chuyển ca thi (ghi nhận vào nhật ký kiểm toán)
            </Label>
            <Textarea
              id="transfer-reason"
              rows={2}
              placeholder="Nhập lý do (ví dụ: Thí sinh đề nghị đổi ca từ Sáng sang Chiều cùng ngày do bận thi môn khác)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs resize-none"
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
              Hủy bỏ
            </AlertDialogCancel>
            <Button
              type="submit"
              className="rounded-full cursor-pointer hover:bg-primary/90 gap-1.5"
              disabled={isSubmitting || !selectedSessionId}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Đang chuyển ca...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeftIcon className="size-4" />
                  <span>Xác nhận Chuyển ca</span>
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
