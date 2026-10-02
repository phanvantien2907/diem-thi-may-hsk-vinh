/**
 * PaymentHourlyTrafficChart — Biểu đồ Giờ cao điểm nộp lệ phí & Phễu thanh toán PayOS
 * 
 * - Khảo sát giờ cao điểm thí sinh đăng ký nộp tiền trong ngày
 * - Tỷ lệ chuyển đổi: Thành công (96.8%), Đang giữ chỗ 15p (1.9%), Hết hạn tự động hủy (1.3%)
 * - Tương tác hover xem lưu lượng từng khung giờ
 */
import * as React from "react";
import { formatVND, formatNumber } from "~/lib/chart-utils";
import { Badge } from "~/components/ui/badge";
import { ClockIcon, ShieldCheckIcon, AlertCircleIcon, ZapIcon } from "lucide-react";

interface HourlyPoint {
  hour: string;
  timeSlot: string;
  successful: number;
  expired: number;
  revenue: number;
}

const HOURLY_TRAFFIC: HourlyPoint[] = [
  { hour: "06h", timeSlot: "06:00 - 07:00", successful: 4, expired: 0, revenue: 2600000 },
  { hour: "08h", timeSlot: "08:00 - 09:00", successful: 18, expired: 1, revenue: 14800000 },
  { hour: "10h", timeSlot: "10:00 - 11:00", successful: 38, expired: 2, revenue: 32500000 },
  { hour: "12h", timeSlot: "12:00 - 13:00", successful: 22, expired: 1, revenue: 18700000 },
  { hour: "14h", timeSlot: "14:00 - 15:00", successful: 45, expired: 3, revenue: 39500000 },
  { hour: "16h", timeSlot: "16:00 - 17:00", successful: 40, expired: 2, revenue: 35000000 },
  { hour: "18h", timeSlot: "18:00 - 19:00", successful: 28, expired: 1, revenue: 24500000 },
  { hour: "20h", timeSlot: "20:00 - 21:00", successful: 35, expired: 2, revenue: 30800000 },
];

export function PaymentHourlyTrafficChart() {
  const [activeSlot, setActiveSlot] = React.useState<HourlyPoint>(HOURLY_TRAFFIC[4]); // 14h default

  const maxSuccess = Math.max(...HOURLY_TRAFFIC.map((h) => h.successful));

  return (
    <div className="flex flex-col gap-4 w-full h-full justify-between">
      {/* ── Hourly Traffic Bars ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <ClockIcon className="size-3.5 text-primary" />
            Lưu lượng thanh toán theo khung giờ trong ngày
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            Đỉnh: {HOURLY_TRAFFIC[4].timeSlot}
          </span>
        </div>

        {/* Bars Container */}
        <div className="flex items-end gap-2 h-36 pt-4 pb-1 border-b">
          {HOURLY_TRAFFIC.map((slot) => {
            const heightPercent = Math.round((slot.successful / maxSuccess) * 100);
            const isSelected = activeSlot.hour === slot.hour;

            return (
              <div
                key={slot.hour}
                onMouseEnter={() => setActiveSlot(slot)}
                onClick={() => setActiveSlot(slot)}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
              >
                {/* Bar */}
                <div className="w-full max-w-[28px] bg-muted/60 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      isSelected
                        ? "bg-primary shadow-xs"
                        : "bg-primary/70 group-hover:bg-primary"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Hour Label */}
                <span
                  className={`text-[10px] font-mono transition-colors ${
                    isSelected ? "text-foreground font-bold text-xs" : "text-muted-foreground"
                  }`}
                >
                  {slot.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Hour Callout ── */}
      <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
        <div>
          <span className="text-muted-foreground">Khung giờ: </span>
          <strong className="text-foreground">{activeSlot.timeSlot}</strong>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-muted-foreground">Đã nộp: </span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {activeSlot.successful} đơn
            </strong>
          </div>
          <div>
            <span className="text-muted-foreground">Thu được: </span>
            <strong className="font-mono text-primary font-bold">
              {formatVND(activeSlot.revenue)}
            </strong>
          </div>
        </div>
      </div>

      {/* ── Conversion Funnel Mini Strip ── */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">Thành công</span>
          <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
            96.8%
          </p>
          <span className="text-[10px] text-muted-foreground">1.180 giao dịch</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">Giữ chỗ 15p</span>
          <p className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm mt-0.5">
            1.9%
          </p>
          <span className="text-[10px] text-muted-foreground">24 đơn đang chờ</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <span className="text-[10px] text-muted-foreground font-medium">Hết hạn (Hủy)</span>
          <p className="font-mono font-bold text-foreground text-sm mt-0.5">
            1.3%
          </p>
          <span className="text-[10px] text-muted-foreground">Nhả ghế tự động</span>
        </div>
      </div>
    </div>
  );
}
