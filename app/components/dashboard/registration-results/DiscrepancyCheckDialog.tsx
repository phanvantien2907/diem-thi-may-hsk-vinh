import * as React from "react";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircle2Icon, RefreshCwIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { SlotDiscrepancyDTO } from "~/types/registration-results";

interface DiscrepancyCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancies: SlotDiscrepancyDTO[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DiscrepancyCheckDialog({
  open,
  onOpenChange,
  discrepancies,
  onRefresh,
  isRefreshing = false,
}: DiscrepancyCheckDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-full ${
                  discrepancies.length > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {discrepancies.length > 0 ? (
                  <AlertTriangleIcon className="size-5" />
                ) : (
                  <CheckCircle2Icon className="size-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  Kiểm tra Sai lệch Dữ liệu Ghế & Đơn đăng ký (Discrepancy Check)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Đối soát nguyên tử giữa bảng ghế phòng thi (<code>exam_seats</code>) và bảng phiếu đăng ký (<code>exam_registrations</code>).
                </DialogDescription>
              </div>
            </div>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-8 gap-1.5"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Quét lại</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {discrepancies.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2Icon className="size-8" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Dữ liệu hoàn toàn đồng bộ</h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Tất cả các ca thi đều khớp hoàn hảo giữa số đơn đã xác nhận với số ghế đã đặt, số đơn chờ thanh toán với số ghế giữ tạm thời và không có đơn đã xác nhận nào bị thiếu thanh toán.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex gap-2 items-start">
                <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Phát hiện {discrepancies.length} ca thi có sai lệch dữ liệu:</strong> Cần rà soát các giao dịch thanh toán hoặc chạy chức năng đồng bộ ghế để tránh tình trạng bán thừa hoặc thiếu ghế.
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="font-semibold">Ca thi / Phòng</TableHead>
                      <TableHead className="text-center font-semibold">Đã xác nhận vs Ghế Booked</TableHead>
                      <TableHead className="text-center font-semibold">Chờ TT vs Ghế Held</TableHead>
                      <TableHead className="text-center font-semibold">Chưa TT mà Confirmed</TableHead>
                      <TableHead className="font-semibold">Chi tiết cảnh báo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discrepancies.map((d) => (
                      <TableRow key={d.session_id} className="text-xs">
                        <TableCell>
                          <div className="font-medium text-foreground">{d.exam_type_name}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {d.exam_date} • {d.shift === "morning" ? "Ca sáng" : d.shift === "afternoon" ? "Ca chiều" : "Ca tối"}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">ID: #{d.session_id}</div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="font-mono font-medium">
                            {d.confirmed_registrations} / {d.booked_seats}
                          </div>
                          {d.confirmed_seat_diff !== 0 && (
                            <Badge variant="destructive" className="text-[10px] h-4 mt-0.5">
                              Lệch {d.confirmed_seat_diff > 0 ? `+${d.confirmed_seat_diff}` : d.confirmed_seat_diff}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="font-mono font-medium">
                            {d.pending_payment_registrations} / {d.held_seats}
                          </div>
                          {d.pending_hold_diff !== 0 && (
                            <Badge variant="destructive" className="text-[10px] h-4 mt-0.5">
                              Lệch {d.pending_hold_diff > 0 ? `+${d.pending_hold_diff}` : d.pending_hold_diff}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {d.unpaid_confirmed_registrations > 0 ? (
                            <Badge variant="destructive" className="text-[11px] font-mono">
                              {d.unpaid_confirmed_registrations} đơn
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-mono">0</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <p className="text-destructive font-medium text-xs">{d.message}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

