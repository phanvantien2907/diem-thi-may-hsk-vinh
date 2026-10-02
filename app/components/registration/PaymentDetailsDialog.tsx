import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { PaymentDetailData } from "~/types/exam";
import { formatCurrency, formatDate, shiftLabel } from "./ExamSessionSelector";
import {
  ReceiptTextIcon,
  CreditCardIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  XCircleIcon,
  CopyIcon,
  CheckIcon,
  UserIcon,
  Building2Icon,
  HashIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PaymentDetailData | null;
  isLoading?: boolean;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateStr;
  }
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  data,
  isLoading = false,
}: PaymentDetailsDialogProps) {
  const [copied, setCopied] = React.useState(false);

  // Reset copied state when dialog opens or data changes
  React.useEffect(() => {
    setCopied(false);
  }, [open, data]);

  if (!data && !isLoading) return null;

  const payment = data?.payment;
  const registration = data?.registration;
  const session = data?.session;

  // Xác định trạng thái thanh toán tổng thể
  const isPaid =
    payment?.status === "success" || registration?.status === "confirmed";
  const isPending =
    payment?.status === "pending" || registration?.status === "pending_payment";
  const isFailed =
    payment?.status === "failed" || registration?.status === "cancelled";

  // Số tiền hiển thị: ưu tiên payment.amount, fallback session.fee
  const displayAmount = payment?.amount ?? session?.fee ?? 0;

  // Mã tham chiếu giao dịch
  const transactionRef =
    payment?.transaction_ref ||
    (payment?.id ? `PAY-${payment.id}` : `REG-${registration?.id}`);

  const handleCopyTransactionRef = async () => {
    if (!transactionRef) return;
    try {
      await navigator.clipboard.writeText(transactionRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback nếu clipboard API bị chặn
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ReceiptTextIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Chi tiết giao dịch thanh toán
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                Biên lai xác nhận giao dịch lệ phí thi máy tính HSK
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 py-1 text-sm">
            {/* ── Banner tóm tắt số tiền & trạng thái (Hero Card) ── */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Số tiền thanh toán
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(displayAmount)}
                  </div>
                </div>

                <div className="self-start sm:self-center">
                  {isPaid && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 py-1 px-3 text-xs sm:text-sm font-semibold rounded-full gap-1.5"
                    >
                      <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Thanh toán thành công</span>
                    </Badge>
                  )}
                  {isPending && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 py-1 px-3 text-xs sm:text-sm font-semibold rounded-full gap-1.5"
                    >
                      <ClockIcon className="size-4 text-amber-600 dark:text-amber-400" />
                      <span>Đang chờ thanh toán</span>
                    </Badge>
                  )}
                  {isFailed && (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-destructive py-1 px-3 text-xs sm:text-sm font-semibold rounded-full gap-1.5"
                    >
                      <XCircleIcon className="size-4" />
                      <span>Đã hủy / Thất bại</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Dòng bảo mật / Cổng thanh toán */}
              <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheckIcon className="size-3.5 text-primary" />
                  Gạch nợ tự động qua PayOS (VietQR)
                </span>
                <span className="flex items-center gap-1 font-mono">
                  Mã đơn: #{payment?.id ?? registration?.id}
                </span>
              </div>
            </div>

            {/* ── Khối 1: Thông số giao dịch thanh toán ── */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCardIcon className="size-4 text-primary" />
                <span>Thông số giao dịch</span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
                {/* Mã giao dịch PayOS */}
                <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                  <div className="min-w-0 pr-2">
                    <dt className="text-xs text-muted-foreground">
                      Mã tham chiếu:
                    </dt>
                    <dd className="font-mono font-bold text-foreground truncate select-all">
                      {transactionRef}
                    </dd>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full cursor-pointer h-8 px-2.5 text-xs shrink-0 hover:bg-muted"
                    onClick={handleCopyTransactionRef}
                    title="Sao chép mã tham chiếu"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-3.5 text-emerald-600 mr-1" />
                        <span className="text-emerald-600 font-medium">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3.5 mr-1" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Phương thức thanh toán */}
                <div>
                  <dt className="text-xs text-muted-foreground">Phương thức:</dt>
                  <dd className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                    <CreditCardIcon className="size-3.5 text-primary" />
                    <span>PayOS</span>
                  </dd>
                </div>

                {/* Đơn vị thụ hưởng */}
                <div>
                  <dt className="text-xs text-muted-foreground">Đơn vị thụ hưởng:</dt>
                  <dd className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                    <Building2Icon className="size-3.5 text-muted-foreground" />
                    <span>Trường Đại Học Vinh</span>
                  </dd>
                </div>

                {/* Thời gian tạo giao dịch */}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Thời gian giao dịch:
                  </dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {formatDateTime(payment?.created_at || registration?.registered_at)}
                  </dd>
                </div>

                {/* Thời gian thanh toán thành công */}
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Thời gian thanh toán:
                  </dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {isPaid ? (
                      formatDateTime(payment?.paid_at || payment?.created_at)
                    ) : (
                      <span className="text-muted-foreground italic">Chưa hoàn tất</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ── Khối 2: Thông tin đăng ký & Ca thi ── */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarIcon className="size-4 text-primary" />
                <span>Thông tin ca thi & Thí sinh</span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
                {/* Họ tên thí sinh */}
                <div>
                  <dt className="text-xs text-muted-foreground">Thí sinh:</dt>
                  <dd className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <UserIcon className="size-3.5 text-muted-foreground" />
                    <span>{data?.candidateName || "—"}</span>
                  </dd>
                </div>

                {/* Số CCCD / Hộ chiếu */}
                {data?.idNumber && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Số CCCD / Hộ chiếu:</dt>
                    <dd className="font-medium text-foreground mt-0.5">
                      {data.idNumber}
                    </dd>
                  </div>
                )}

                {/* Loại bài thi / Cấp độ HSK */}
                <div>
                  <dt className="text-xs text-muted-foreground">Cấp độ thi:</dt>
                  <dd className="font-bold text-primary mt-0.5">
                    {data?.examTypeName || session?.exam_type_name || `HSK #${session?.exam_type_id || "—"}`}
                  </dd>
                </div>

                {/* Số báo danh / Số ghế */}
                <div>
                  <dt className="text-xs text-muted-foreground">Số ghế / Số máy:</dt>
                  <dd className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                    <HashIcon className="size-3.5 text-muted-foreground" />
                    <span>Số #{registration?.exam_seat_id ?? "—"}</span>
                  </dd>
                </div>

                {/* Ngày thi */}
                <div>
                  <dt className="text-xs text-muted-foreground">Ngày thi:</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {session?.date ? formatDate(session.date) : "—"}
                  </dd>
                </div>

                {/* Ca thi */}
                <div>
                  <dt className="text-xs text-muted-foreground">Ca thi:</dt>
                  <dd className="font-medium text-foreground mt-0.5">
                    {session?.shift ? shiftLabel(session.shift) : "—"}
                  </dd>
                </div>

                {/* Phòng thi & Địa điểm */}
                {(data?.roomName || session?.exam_room_name) && (
                  <div className="sm:col-span-2 pt-1 border-t border-border/40">
                    <dt className="text-xs text-muted-foreground">Phòng thi & Địa điểm:</dt>
                    <dd className="font-medium text-foreground mt-0.5">
                      {data?.roomName || session?.exam_room_name}
                      {(data?.roomLocation || session?.exam_room_location) && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({data?.roomLocation || session?.exam_room_location})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 sm:justify-end gap-2">
          <Button
            type="button"
            className="rounded-full cursor-pointer w-full sm:w-auto font-medium"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
