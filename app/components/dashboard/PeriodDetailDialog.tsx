import * as React from "react";
import type { ExamPeriod, ExamSession, ExamType } from "~/types/exam";
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
import {
  CalendarDaysIcon,
  CopyIcon,
  CalendarClockIcon,
  EditIcon,
  RefreshCwIcon,
  LayersIcon,
  ClockIcon,
  UsersIcon,
  LockIcon,
} from "lucide-react";

interface PeriodDetailDialogProps {
  periodId: number | null;
  examTypes: ExamType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditPeriod?: (period: ExamPeriod) => void;
  onDuplicatePeriod?: (period: ExamPeriod) => void;
  onReschedulePeriod?: (period: ExamPeriod) => void;
  onEditSession?: (session: ExamSession) => void;
}

export function PeriodDetailDialog({
  periodId,
  examTypes,
  open,
  onOpenChange,
  onEditPeriod,
  onDuplicatePeriod,
  onReschedulePeriod,
  onEditSession,
}: PeriodDetailDialogProps) {
  const [period, setPeriod] = React.useState<ExamPeriod | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && periodId) {
      setIsLoading(true);
      fetch(`/internal/admin/exam-periods/${periodId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success && json.data) {
            setPeriod(json.data);
          } else {
            setPeriod(null);
          }
        })
        .catch(() => setPeriod(null))
        .finally(() => setIsLoading(false));
    } else {
      setPeriod(null);
    }
  }, [open, periodId]);

  if (!periodId) return null;

  const formatCurrency = (val?: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-semibold">Bản nháp</Badge>;
      case "registration_open":
        return <Badge className="rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300">Đang mở đăng ký</Badge>;
      case "published":
        return <Badge className="rounded-full px-2 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 border-sky-300">Đã công khai</Badge>;
      case "rescheduled":
        return <Badge className="rounded-full px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-300">Đã dời lịch</Badge>;
      case "registration_closed":
        return <Badge className="rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-300">Đã đóng đăng ký</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs font-semibold">Đã hủy</Badge>;
      case "completed":
        return <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs font-semibold">Đã hoàn thành</Badge>;
      default:
        return <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs font-semibold">{status || "—"}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-mono font-bold text-primary border-primary/20 bg-primary/5">
              {period?.code || `ID #${periodId}`}
            </Badge>
            {getStatusBadge(period?.status)}
            <span className="text-xs text-muted-foreground">• Phân cấp 2 tầng (§4.11)</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {period?.name || "Chi tiết Đợt thi"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Xem tổng quan thông tin đợt thi và danh sách các ca thi con thuộc đợt.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <RefreshCwIcon className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Đang tải thông tin chi tiết đợt thi...</p>
            </div>
          ) : !period ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Không thể tải thông tin đợt thi hoặc đợt thi không tồn tại.
            </div>
          ) : (
            <>
              {/* Thẻ tổng quan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Ngày bắt đầu</span>
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <CalendarDaysIcon className="size-3.5 text-primary" />
                    {period.start_date || "Chưa đặt lịch"}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Ngày kết thúc</span>
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <CalendarDaysIcon className="size-3.5 text-primary" />
                    {period.end_date || "Chưa đặt lịch"}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Hạn chót đăng ký</span>
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 text-amber-500" />
                    {period.registration_deadline ? period.registration_deadline.slice(0, 10) : "Chưa đặt"}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Số ca thi con</span>
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <LayersIcon className="size-3.5 text-indigo-500" />
                    {period.sessions?.length ?? period.session_count} ca thi
                  </p>
                </div>
              </div>

              {/* Mô tả & Hướng dẫn */}
              {(period.description || period.instructions) && (
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                  {period.description && (
                    <div>
                      <span className="font-semibold text-foreground">Mô tả: </span>
                      <span className="text-muted-foreground">{period.description}</span>
                    </div>
                  )}
                  {period.instructions && (
                    <div>
                      <span className="font-semibold text-foreground">Hướng dẫn: </span>
                      <span className="text-muted-foreground">{period.instructions}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bảng danh sách Ca thi con */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Danh sách Ca thi con ({period.sessions?.length || 0})
                  </h4>
                </div>

                {period.sessions && period.sessions.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Mã ca</TableHead>
                          <TableHead className="text-xs font-semibold">Cấp thi HSK</TableHead>
                          <TableHead className="text-xs font-semibold">Ngày & Buổi</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Sức chứa</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Lệ phí</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Trạng thái phát hành</TableHead>
                          {onEditSession && (
                            <TableHead className="text-xs font-semibold text-right">Thao tác</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {period.sessions.map((s) => {
                          const type = examTypes.find((t) => t.id === s.exam_type_id);
                          return (
                            <TableRow key={s.id} className="text-xs">
                              <TableCell className="font-mono font-medium">#{s.id}</TableCell>
                              <TableCell className="font-semibold">{type?.name || `Loại #${s.exam_type_id}`}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{s.date ? s.date.slice(0, 10) : "Chưa đặt ngày"}</span>
                                  <span className="text-muted-foreground ml-1">
                                    ({s.shift === "morning" ? "Sáng" : s.shift === "afternoon" ? "Chiều" : "Tối"})
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">{s.capacity} slots</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(s.fee)}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                    s.exam_session_publication_status === "published"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : s.exam_session_publication_status === "scheduled"
                                        ? "bg-sky-50 text-sky-700 border-sky-200"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {s.exam_session_publication_status === "published"
                                    ? "Công khai"
                                    : s.exam_session_publication_status === "scheduled"
                                      ? "Lên lịch"
                                      : "Bản nháp"}
                                </Badge>
                              </TableCell>
                              {onEditSession && (
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 rounded-full cursor-pointer hover:bg-muted"
                                    title="Chỉnh sửa ca thi này"
                                    onClick={() => {
                                      onOpenChange(false);
                                      onEditSession(s);
                                    }}
                                  >
                                    <EditIcon className="size-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground rounded-xl border border-dashed">
                    Đợt thi này chưa có ca thi con nào. Hãy tạo mới hoặc nhân bản từ đợt thi trước.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {period && onEditPeriod && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditPeriod(period);
                }}
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-8"
              >
                <EditIcon className="size-3 mr-1" />
                Chỉnh sửa đợt
              </Button>
            )}
            {period && onDuplicatePeriod && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onDuplicatePeriod(period);
                }}
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-8"
              >
                <CopyIcon className="size-3 mr-1" />
                Nhân bản
              </Button>
            )}
            {period && onReschedulePeriod && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReschedulePeriod(period);
                }}
                className="rounded-full cursor-pointer hover:bg-indigo-50 text-indigo-700 border-indigo-200 dark:border-indigo-800 dark:text-indigo-300 text-xs h-8"
              >
                <CalendarClockIcon className="size-3 mr-1" />
                Dời lịch thi
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-8 ml-auto"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
