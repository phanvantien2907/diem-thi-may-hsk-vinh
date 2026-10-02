/**
 * HskLevelDonutChart — Biểu đồ Phân bổ Cấp độ thi HSK Tương tác
 * 
 * - SVG Donut tương tác: HSK 3, 4, 5, 6 và HSKK
 * - Hover / Click từng lát cắt để xem chi tiết số ghế, doanh thu và tỷ lệ lấp đầy
 * - Siêu nhẹ, tải tức thì 0ms, không tốn MB
 */
import * as React from "react";
import { formatVND, formatNumber } from "~/lib/chart-utils";
import { Badge } from "~/components/ui/badge";

export interface LevelItem {
  id: string;
  name: string;
  shortName: string;
  candidates: number;
  revenue: number;
  totalSeats: number;
  color: string;
}

export const HSK_LEVELS_DATA: LevelItem[] = [
  { id: "hsk4", name: "HSK 4 & HSKK Trung cấp", shortName: "HSK 4", candidates: 420, revenue: 357000000, totalSeats: 450, color: "#10b981" },
  { id: "hsk5", name: "HSK 5 & HSKK Cao cấp", shortName: "HSK 5", candidates: 350, revenue: 367500000, totalSeats: 400, color: "#3b82f6" },
  { id: "hsk3", name: "HSK 3 & HSKK Sơ cấp", shortName: "HSK 3", candidates: 280, revenue: 182000000, totalSeats: 300, color: "#f59e0b" },
  { id: "hsk6", name: "HSK 6 & HSKK Cao cấp", shortName: "HSK 6", candidates: 154, revenue: 192500000, totalSeats: 200, color: "#8b5cf6" },
  { id: "hskk", name: "HSKK Khẩu ngữ độc lập", shortName: "HSKK", candidates: 80, revenue: 60000000, totalSeats: 120, color: "#ec4899" },
];

export function HskLevelDonutChart() {
  const [activeId, setActiveId] = React.useState<string>("hsk4");

  const totalCandidates = HSK_LEVELS_DATA.reduce((sum, item) => sum + item.candidates, 0);
  const activeLevel = HSK_LEVELS_DATA.find((item) => item.id === activeId) || HSK_LEVELS_DATA[0];

  // Tính toán chu vi vòng tròn Donut
  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Tính dasharray và offset cho từng lát cắt
  let cumulativePercent = 0;
  const slices = HSK_LEVELS_DATA.map((item) => {
    const percent = item.candidates / totalCandidates;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += percent;

    return {
      item,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col gap-4 w-full h-full justify-between">
      <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-2">
        {/* SVG Donut Circle */}
        <div className="relative size-44 sm:size-48 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/40"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {slices.map(({ item, strokeDasharray, strokeDashoffset }) => {
              const isSelected = item.id === activeId;
              return (
                <circle
                  key={item.id}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setActiveId(item.id)}
                  onClick={() => setActiveId(item.id)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              {activeLevel.shortName}
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-foreground leading-tight">
              {formatNumber(activeLevel.candidates)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round((activeLevel.candidates / totalCandidates) * 100)}% thí sinh
            </span>
          </div>
        </div>

        {/* Level List Selector */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {HSK_LEVELS_DATA.map((item) => {
            const isSelected = item.id === activeId;
            const pct = Math.round((item.candidates / item.totalSeats) * 100);

            return (
              <div
                key={item.id}
                onMouseEnter={() => setActiveId(item.id)}
                onClick={() => setActiveId(item.id)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                  isSelected
                    ? "bg-muted/70 border-foreground/30 shadow-2xs font-medium"
                    : "border-transparent hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={`truncate text-xs ${isSelected ? "text-foreground font-semibold" : ""}`}>
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="font-semibold text-foreground">
                    {item.candidates}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Level Detail Strip */}
      <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Cấp độ: </span>
          <strong className="text-foreground">{activeLevel.name}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Doanh thu tạo ra: </span>
          <strong className="font-mono text-primary font-bold">{formatVND(activeLevel.revenue)}</strong>
        </div>
        <div>
          <span className="text-muted-foreground">Đã lấp đầy: </span>
          <strong className="font-mono text-foreground font-bold">
            {activeLevel.candidates}/{activeLevel.totalSeats} ghế ({Math.round((activeLevel.candidates / activeLevel.totalSeats) * 100)}%)
          </strong>
        </div>
      </div>
    </div>
  );
}
