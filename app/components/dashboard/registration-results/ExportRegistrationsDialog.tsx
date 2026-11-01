import * as React from "react";
import { CheckCircle2Icon, DownloadIcon, FileSpreadsheetIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { cn } from "cn";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "~/components/ui/toast";
import type { PeriodRegistrationSummaryDTO, SlotRegistrationStatsDTO } from "~/types/registration-results";

interface ExportRegistrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period?: PeriodRegistrationSummaryDTO | null;
  session?: SlotRegistrationStatsDTO | null;
}

export function ExportRegistrationsDialog({
  open,
  onOpenChange,
  period,
  session,
}: ExportRegistrationsDialogProps) {
  const [format, setFormat] = React.useState<"excel" | "pdf" | "csv">("excel");
  const [eligibility, setEligibility] = React.useState<string>("all");
  const [regStatus, setRegStatus] = React.useState<string>("all");
  const [slotScope, setSlotScope] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleExport = async () => {
    if (!period?.period_id && !session?.session_id) {
      toast.add({
        type: "error",
        title: "Thiếu thông tin",
        description: "Vui lòng chọn đợt thi hoặc ca thi cần xuất danh sách.",
      });
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (session?.session_id) {
        params.set("session_id", String(session.session_id));
      } else if (period?.period_id) {
        params.set("period_id", String(period.period_id));
      }
      params.set("format", format);
      if (eligibility !== "all") params.set("eligibility", eligibility);
      if (regStatus !== "all") params.set("registration_status", regStatus);
      if (slotScope !== "all") params.set("slot_scope", slotScope);
      if (search.trim()) {
        params.set("search", search.trim());
        params.set("search_query", search.trim());
      }

      const downloadUrl = `/internal/admin/registration-results/export?${params.toString()}`;

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || "Không thể tải tệp xuất dữ liệu.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `danh_sach_dang_ky_${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "csv"}`;
      if (contentDisposition) {
        const utf8Match = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
        const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/);
        if (utf8Match?.[1]) {
          try {
            filename = decodeURIComponent(utf8Match[1]);
          } catch {
            filename = utf8Match[1];
          }
        } else if (standardMatch?.[1]) {
          filename = standardMatch[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.add({
        type: "success",
        title: "Xuất dữ liệu thành công",
        description: `Tệp ${filename} đã được tải về máy của bạn.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xuất danh sách.";
      toast.add({
        type: "error",
        title: "Xuất dữ liệu thất bại",
        description: message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const titleContext = session
    ? `Ca thi ${session.exam_type_name} (${session.room_name} - ${session.exam_date})`
    : period
    ? `Đợt thi: ${period.period_name} (${period.period_code})`
    : "Toàn bộ danh sách";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 sm:max-w-xl gap-0">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0">
              <DownloadIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Xuất báo cáo</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Xuất danh sách thí sinh đã đăng ký cho <strong className="text-foreground">{titleContext}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-5">
          {/* Định dạng file với trạng thái Active/Inactive rõ ràng */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Định dạng tệp xuất
              </Label>
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {format === "excel" ? "Bảng tính Excel (.csv)" : format === "pdf" ? "Văn bản PDF (.pdf)" : "Tệp dữ liệu CSV (.csv)"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer relative",
                  format === "excel"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs font-semibold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <FileSpreadsheetIcon className={cn("size-5 mb-1.5", format === "excel" ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium">Excel (CSV)</span>
                <span className="text-[10px] opacity-75 mt-0.5">UTF-8 có BOM</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer relative",
                  format === "pdf"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs font-semibold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <FileTextIcon className={cn("size-5 mb-1.5", format === "pdf" ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium">PDF Báo cáo</span>
                <span className="text-[10px] opacity-75 mt-0.5">In ấn danh sách</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer relative",
                  format === "csv"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs font-semibold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <DownloadIcon className={cn("size-5 mb-1.5", format === "csv" ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium">CSV thuần</span>
                <span className="text-[10px] opacity-75 mt-0.5">Dữ liệu thô</span>
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2Icon className="size-4 text-primary shrink-0" />
              <span>
                {format === "excel"
                  ? "Bảng mã UTF-8 có BOM, mở trực tiếp bằng Microsoft Excel không bị lỗi phông chữ tiếng Việt hoặc tiếng Trung."
                  : format === "pdf"
                  ? "Tích hợp phông NotoSerifSC hiển thị chữ Hán và tiếng Việt sắc nét, chuẩn khổ A4 sẵn sàng để in ấn."
                  : "Tệp văn bản thuần phân tách bằng dấu phẩy, dung lượng nhẹ, dễ dàng nhập liệu vào hệ thống khác."}
              </span>
            </div>
          </div>

          {/* Form Grid 2 cột cân xứng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="export-eligibility" className="text-xs font-medium">
                Điều kiện dự thi
              </Label>
              <Select value={eligibility} onValueChange={(val) => setEligibility(val ?? "all")}>
                <SelectTrigger id="export-eligibility" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Tất cả điều kiện">
                    {(val) => {
                      const cur = val ?? eligibility;
                      if (!cur || cur === "all") return "Tất cả điều kiện";
                      if (cur === "eligible") return "Đủ điều kiện (Đã duyệt & Đã TT)";
                      if (cur === "pending_review") return "Chờ duyệt hồ sơ / Chờ nộp phí";
                      if (cur === "ineligible") return "Không đủ điều kiện / Từ chối";
                      return "Tất cả điều kiện";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả điều kiện</SelectItem>
                  <SelectItem value="eligible">Đủ điều kiện (Đã duyệt & Đã nộp lệ phí)</SelectItem>
                  <SelectItem value="pending_review">Chờ duyệt hồ sơ / Chờ nộp phí</SelectItem>
                  <SelectItem value="ineligible">Không đủ điều kiện / Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="export-reg-status" className="text-xs font-medium">
                Trạng thái đăng ký
              </Label>
              <Select value={regStatus} onValueChange={(val) => setRegStatus(val ?? "all")}>
                <SelectTrigger id="export-reg-status" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Tất cả trạng thái">
                    {(val) => {
                      const cur = val ?? regStatus;
                      if (!cur || cur === "all") return "Tất cả trạng thái";
                      if (cur === "confirmed") return "Đã thanh toán (confirmed)";
                      if (cur === "pending_payment") return "Chờ thanh toán (pending)";
                      if (cur === "cancelled") return "Đã hủy (cancelled)";
                      return "Tất cả trạng thái";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="confirmed">Đã thanh toán (confirmed)</SelectItem>
                  <SelectItem value="pending_payment">Chờ thanh toán (pending)</SelectItem>
                  <SelectItem value="cancelled">Đã hủy (cancelled)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="export-slot-scope" className="text-xs font-medium">
                Quy mô ca thi
              </Label>
              <Select value={slotScope} onValueChange={(val) => setSlotScope(val ?? "all")}>
                <SelectTrigger id="export-slot-scope" className="w-full h-9 text-xs">
                  <SelectValue placeholder="Tất cả quy mô">
                    {(val) => {
                      const cur = val ?? slotScope;
                      if (!cur || cur === "all") return "Tất cả quy mô";
                      if (cur === "single") return "Chỉ thi 1 ca duy nhất";
                      if (cur === "multiple") return "Thi nhiều ca đồng thời";
                      return "Tất cả quy mô";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả quy mô</SelectItem>
                  <SelectItem value="single">Chỉ thi 1 ca duy nhất</SelectItem>
                  <SelectItem value="multiple">Thi nhiều ca đồng thời</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="export-search" className="text-xs font-medium">
                Tìm kiếm / Lọc bổ sung
              </Label>
              <Input
                id="export-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên, CCCD, SĐT..."
                className="w-full h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 px-4"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Đóng
          </Button>
          <Button
            type="button"
            className="rounded-full cursor-pointer hover:bg-primary/90 text-xs h-9 px-5 gap-1.5"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                <span>Đang xuất tệp...</span>
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                <span>Xuất báo cáo</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
