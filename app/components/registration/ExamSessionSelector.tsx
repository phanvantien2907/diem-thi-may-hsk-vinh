import * as React from "react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircle2Icon,
} from "lucide-react";
import type { ExamSessionWithSlots } from "~/types/exam";

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Dịch shift → tiếng Việt */
function shiftLabel(shift: string): string {
  switch (shift) {
    case "morning": return "Sáng (09:00 - 11:25)";
    case "afternoon": return "Chiều (13:30 - 16:25)";
    case "evening": return "Tối";
    default: return shift;
  }
}

/** Format ngày thi đẹp (ví dụ: "15/10/2026") */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Format tiền tệ VNĐ */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

/** Format hạn đăng ký */
function formatDeadline(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface ExamSessionSelectorProps {
  sessions: ExamSessionWithSlots[];
  selectedSessionId: number | null;
  onSelect: (session: ExamSessionWithSlots) => void;
  highlightLevel?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export const ExamSessionSelector = React.memo(function ExamSessionSelector({
  sessions,
  selectedSessionId,
  onSelect,
  highlightLevel,
}: ExamSessionSelectorProps) {
  React.useEffect(() => {
    if (highlightLevel && sessions.length > 0) {
      const firstHighlighted = sessions.find((s) => s.exam_type_name?.includes(`Cấp độ ${highlightLevel}`));
      if (firstHighlighted) {
        const timer = setTimeout(() => {
          const el = document.getElementById(`session-card-${firstHighlighted.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightLevel, sessions]);
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDaysIcon className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          Hiện chưa có ca thi nào đang mở đăng ký
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => {
        const isSelected = selectedSessionId === session.id;
        const isFull = session.available_slots <= 0;
        const isDeadlinePassed = new Date(session.registration_deadline) < new Date();
        const isDisabled = isFull || isDeadlinePassed || session.status !== "open";
        const isHighlighted = highlightLevel && session.exam_type_name?.includes(`Cấp độ ${highlightLevel}`);

        return (
          <button
            key={session.id}
            id={`session-card-${session.id}`}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(session)}
            className={cn(
              "group relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left",
              "transition-all duration-500 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Trạng thái bình thường
              !isDisabled && !isSelected && !isHighlighted && [
                "cursor-pointer border-border bg-card hover:border-primary/40 hover:bg-accent/30",
                "hover:shadow-sm",
              ],
              // Trạng thái highlight
              !isDisabled && !isSelected && isHighlighted && [
                "cursor-pointer border-blue-500 bg-card shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/50 scale-[1.01] z-10",
                "hover:border-blue-600 hover:ring-blue-600/50",
              ],
              // Trạng thái được chọn
              isSelected && [
                "cursor-pointer border-primary bg-primary/10 shadow-sm",
                "ring-2 ring-primary",
              ],
              // Trạng thái bị vô hiệu
              isDisabled && "cursor-not-allowed border-border/50 bg-muted/30 opacity-60"
            )}
            aria-pressed={isSelected}
            aria-label={`Ca thi ${session.exam_type_name || ""} ngày ${formatDate(session.date)} — ${shiftLabel(session.shift)}`}
          >
            {/* Dòng 1: Tên loại thi + badge trạng thái & checkmark */}
            <div className="flex items-start justify-between gap-2 w-full">
              <span className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 pr-1">
                {session.exam_type_name || `Loại thi #${session.exam_type_id}`}
              </span>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto pt-0.5">
                {/* Checkmark khi được chọn - nằm bên trái badge để badge luôn ở ngoài cùng bên phải */}
                {isSelected && (
                  <CheckCircle2Icon
                    className="size-4 shrink-0 text-primary drop-shadow-sm"
                    aria-hidden="true"
                  />
                )}

                {isFull ? (
                  <Badge variant="destructive" className="shrink-0">Hết chỗ</Badge>
                ) : session.available_slots < 20 ? (
                  <Badge variant="destructive" className="shrink-0">
                    Còn {session.available_slots} chỗ
                  </Badge>
                ) : session.available_slots < 50 ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 font-semibold shadow-sm shrink-0">
                    Còn {session.available_slots} chỗ
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-400 bg-emerald-50 font-semibold shadow-sm shrink-0">
                    Còn {session.available_slots} chỗ
                  </Badge>
                )}
              </div>
            </div>

            {/* Dòng 2: Địa chỉ phòng thi trên 1 dòng duy nhất */}
            {(session.exam_room_name || session.exam_room_location) && (
              <div
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap overflow-hidden"
                title={[session.exam_room_name, session.exam_room_location].filter(Boolean).join(" - ")}
              >
                <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {session.exam_room_name}
                  {session.exam_room_name && session.exam_room_location ? " - " : ""}
                  {session.exam_room_location}
                </span>
              </div>
            )}

            {/* Dòng 3: Ngày, Ca */}
            <div className="flex w-full items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{formatDate(session.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Ca {shiftLabel(session.shift)}</span>
              </div>
            </div>

            {/* Dòng 4: Lệ phí + Hạn đăng ký */}
            <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs">
              <Badge variant="outline" className="font-semibold text-primary border-primary/30 text-xs shrink-0">
                {formatCurrency(session.fee)}
              </Badge>
              {isDeadlinePassed ? (
                <Badge variant="destructive" className="text-[11px] font-medium shrink-0">
                  Hết hạn: {formatDeadline(session.registration_deadline)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] font-medium shrink-0">
                  Hạn ĐK: {formatDeadline(session.registration_deadline)}
                </Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
});

export { formatCurrency, formatDate, shiftLabel };
