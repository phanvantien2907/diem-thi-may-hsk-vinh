/**
 * ConfirmRegistrationDialog — Dialog xác nhận đăng ký thi
 *
 * Hiển thị tóm tắt thông tin: ca thi, loại thi, lệ phí, ngày thi
 * trước khi thí sinh xác nhận đăng ký.
 *
 * Pattern: AlertDialog (shadcn) — chặn tương tác nền.
 * Button: rounded-full, cursor-pointer theo project rules.
 */
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
import { Separator } from "~/components/ui/separator";
import type { ExamSessionWithSlots } from "~/types/exam";
import { formatCurrency, formatDate, shiftLabel } from "./ExamSessionSelector";

interface ConfirmRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExamSessionWithSlots | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function ConfirmRegistrationDialog({
  open,
  onOpenChange,
  session,
  isSubmitting,
  onConfirm,
}: ConfirmRegistrationDialogProps) {
  if (!session) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận đăng ký thi ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vui lòng kiểm tra thông tin bên dưới trước khi xác nhận.
            Ghế sẽ được giữ trong 15 phút sau khi đăng ký.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Bảng tóm tắt thông tin */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Loại thi</dt>
            <dd className="font-medium text-foreground">
              {session.exam_type_name || `ID: ${session.exam_type_id}`}
            </dd>

            <dt className="text-muted-foreground">Ngày thi</dt>
            <dd className="font-medium text-foreground">
              {formatDate(session.date)}
            </dd>

            <dt className="text-muted-foreground">Ca thi</dt>
            <dd className="font-medium text-foreground">
              {shiftLabel(session.shift)}
            </dd>

            {session.exam_room_name && (
              <>
                <dt className="text-muted-foreground">Phòng thi</dt>
                <dd className="font-medium text-foreground">
                  {session.exam_room_name}
                  {session.exam_room_location && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({session.exam_room_location})
                    </span>
                  )}
                </dd>
              </>
            )}
          </dl>

          <Separator className="my-2.5" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Lệ phí thi</span>
            <span className="text-base font-bold text-foreground">
              {formatCurrency(session.fee)}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-full cursor-pointer"
            disabled={isSubmitting}
          >
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full cursor-pointer"
            disabled={isSubmitting}
            onClick={(e) => {
              // Ngăn AlertDialog tự đóng — ta tự xử lý sau khi submit xong
              e.preventDefault();
              onConfirm();
            }}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận đăng ký"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
