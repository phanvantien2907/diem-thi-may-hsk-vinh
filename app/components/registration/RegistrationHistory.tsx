/**
 * RegistrationHistory — Bảng lịch sử đăng ký thi
 *
 * Hiển thị danh sách đăng ký thi của thí sinh dưới dạng Table (shadcn).
 * Tích hợp DropdownMenu hành động thanh toán / xem thẻ dự thi / hủy đơn.
 */
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
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
import { cn } from "~/lib/utils";
import {
  ClipboardListIcon,
  MoreHorizontalIcon,
  CreditCardIcon,
  XCircleIcon,
  FileTextIcon,
  ClockIcon,
  Loader2Icon,
} from "lucide-react";
import type { ExamRegistration } from "~/types/exam";
import { formatCurrency } from "./ExamSessionSelector";


function statusConfig(status: string) {
  switch (status) {
    case "pending_payment":
      return {
        label: "Chờ thanh toán",
        variant: "outline" as const,
        badgeClass:
          "border-amber-400/50 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 font-semibold shadow-xs",
        dotClass: "bg-amber-500 animate-pulse",
      };
    case "confirmed":
      return {
        label: "Đã xác nhận",
        variant: "outline" as const,
        badgeClass:
          "border-emerald-400/50 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold shadow-xs",
        dotClass: "bg-emerald-500",
      };
    case "cancelled":
      return {
        label: "Đã hủy",
        variant: "outline" as const,
        badgeClass:
          "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20 font-semibold shadow-xs",
        dotClass: "bg-destructive/80",
      };
    default:
      return {
        label: status,
        variant: "secondary" as const,
        badgeClass: "font-medium text-foreground",
        dotClass: "bg-muted-foreground",
      };
  }
}

/** Format datetime cho bảng: dd/mm/yyyy hh:mm */
function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface RegistrationHistoryProps {
  registrations: ExamRegistration[];
  /** Map session_id → tên hiển thị cấp độ thi (chỉ tên cấp độ, không kèm ngày) */
  sessionLabels?: Record<number, string>;
  /** Map session_id → lệ phí thi */
  sessionFees?: Record<number, number>;
  /** ID đăng ký đang trong tiến trình tạo link thanh toán */
  payingId?: number | null;
  /** Xử lý thanh toán PayOS */
  onPayment?: (reg: ExamRegistration) => void;
  /** Xử lý hủy phiếu đăng ký */
  onCancel?: (reg: ExamRegistration) => void;
  /** Xem thẻ dự thi */
  onViewAdmissionSlip?: (reg: ExamRegistration) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export const RegistrationHistory = React.memo(function RegistrationHistory({
  registrations,
  sessionLabels,
  sessionFees,
  payingId,
  onPayment,
  onCancel,
  onViewAdmissionSlip,
}: RegistrationHistoryProps) {
  const [cancellingReg, setCancellingReg] = React.useState<ExamRegistration | null>(null);
  const [payingReg, setPayingReg] = React.useState<ExamRegistration | null>(null);

  // Empty State
  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted/60">
          <ClipboardListIcon className="size-6 text-muted-foreground/50" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Chưa có đăng ký nào
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Hãy chọn ca thi phía trên để bắt đầu đăng ký thi HSK.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Cấp độ thi</TableHead>
              <TableHead>Số ghế</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thời gian đăng ký</TableHead>
              <TableHead className="w-24 text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((reg, idx) => {
              const config = statusConfig(reg.status);
              const sessionLabel =
                sessionLabels?.[reg.exam_session_id] || `HSK #${reg.exam_session_id}`;
              const isPayingThis = payingId === reg.id;

              return (
                <TableRow key={reg.id}>
                  <TableCell className="text-center text-muted-foreground font-medium">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {sessionLabel}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    #{reg.exam_seat_id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={config.variant}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-colors",
                        config.badgeClass
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full shrink-0", config.dotClass)}
                        aria-hidden="true"
                      />
                      <span>{config.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateTime(reg.registered_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                          "rounded-full cursor-pointer hover:bg-muted"
                        )}
                        aria-label={`Thao tác đơn đăng ký #${reg.id}`}
                      >
                        {isPayingThis ? (
                          <Loader2Icon className="size-4 animate-spin text-primary" />
                        ) : (
                          <MoreHorizontalIcon className="size-4" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Tùy chọn thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {reg.status === "pending_payment" && (
                            <>
                              <DropdownMenuItem
                                className="cursor-pointer font-medium text-primary focus:text-primary gap-2"
                                disabled={Boolean(payingId)}
                                onClick={() => setPayingReg(reg)}
                              >
                                {isPayingThis ? (
                                  <Loader2Icon className="size-4 animate-spin text-primary" />
                                ) : (
                                  <CreditCardIcon className="size-4 text-primary" />
                                )}
                                <span>
                                  {isPayingThis ? "Đang kết nối..." : "Thanh toán"}
                                </span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer gap-2"
                                onClick={() => setCancellingReg(reg)}
                              >
                                <XCircleIcon className="size-4" />
                                <span>Hủy đăng ký</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {reg.status === "confirmed" && (
                            <DropdownMenuItem
                              className="cursor-pointer gap-2 font-medium"
                              onClick={() => onViewAdmissionSlip?.(reg)}
                            >
                              <FileTextIcon className="size-4 text-primary" />
                              <span>Xem thẻ dự thi</span>
                            </DropdownMenuItem>
                          )}

                          {reg.status === "cancelled" && (
                            <DropdownMenuItem disabled className="text-muted-foreground gap-2">
                              <ClockIcon className="size-4" />
                              <span>Đã hủy phiếu</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog xác nhận hủy đơn đăng ký */}
      <AlertDialog
        open={Boolean(cancellingReg)}
        onOpenChange={(open) => !open && setCancellingReg(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đăng ký ?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy đăng ký thi{" "}
              <strong className="text-foreground">
                {cancellingReg
                  ? sessionLabels?.[cancellingReg.exam_session_id] || `#${cancellingReg.exam_session_id}`
                  : ""} ?
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Nút Hủy */}
            <AlertDialogCancel className="rounded-full cursor-pointer">
              Hủy
            </AlertDialogCancel>

            {/* Nút Xác nhận hủy — variant destructive */}
            <AlertDialogAction
              variant="destructive"
              className="rounded-full cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                if (cancellingReg) {
                  onCancel?.(cancellingReg);
                  setCancellingReg(null);
                }
              }}
            >
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog xác nhận thanh toán */}
      <AlertDialog
        open={Boolean(payingReg)}
        onOpenChange={(open) => !open && setPayingReg(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận thanh toán ?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn tiến hành thanh toán ca thi {" "}
              <strong className="text-foreground">
                {payingReg
                  ? sessionLabels?.[payingReg.exam_session_id] || `#${payingReg.exam_session_id}`
                  : ""} ?
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {payingReg && sessionFees?.[payingReg.exam_session_id] !== undefined && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lệ phí thi</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrency(sessionFees[payingReg.exam_session_id])}
                </span>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {/* Nút Hủy */}
            <AlertDialogCancel className="rounded-full cursor-pointer">
              Hủy
            </AlertDialogCancel>

            {/* Nút Xác nhận thanh toán */}
            <AlertDialogAction
              className="rounded-full cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                if (payingReg) {
                  onPayment?.(payingReg);
                  setPayingReg(null);
                }
              }}
            >
              Xác nhận thanh toán
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
