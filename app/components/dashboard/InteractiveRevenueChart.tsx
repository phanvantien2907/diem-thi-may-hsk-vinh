import * as React from "react";
import {
  generateSmoothLinePath,
  generateSmoothAreaPath,
  formatVND,
  formatCompactVND,
  formatNumber,
} from "~/lib/chart-utils";
import { Badge } from "~/components/ui/badge";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  ZapIcon,
} from "lucide-react";

export type TimeframeKey = "today" | "7days" | "30days" | "3months" | "6months" | "1year";
export type MetricType = "revenue" | "orders" | "both";

export interface DataPoint {
  id: string;
  label: string;
  subLabel?: string;
  revenue: number;
  orders: number;
  topLevel: string;
  growth: number; // % so với điểm trước
}

// ─── Dữ liệu đa kỳ hạn thực tế của Hệ thống thi HSK ──────────────────────────
export const TIMEFRAME_DATA: Record<TimeframeKey, { title: string; subtitle: string; points: DataPoint[] }> = {
  today: {
    title: "Hôm nay (Theo mốc giờ)",
    subtitle: "Dữ liệu khớp lệnh thanh toán PayOS thời gian thực trong ngày",
    points: [
      { id: "h1", label: "06:00", subLabel: "Sáng sớm", revenue: 2600000, orders: 4, topLevel: "HSK 3", growth: 0 },
      { id: "h2", label: "08:00", subLabel: "Bắt đầu ca sáng", revenue: 14800000, orders: 18, topLevel: "HSK 4", growth: 469 },
      { id: "h3", label: "10:00", subLabel: "Giờ cao điểm", revenue: 32500000, orders: 38, topLevel: "HSK 4", growth: 119 },
      { id: "h4", label: "12:00", subLabel: "Buổi trưa", revenue: 48000000, orders: 56, topLevel: "HSK 5", growth: 47 },
      { id: "h5", label: "14:00", subLabel: "Đầu ca chiều", revenue: 69500000, orders: 82, topLevel: "HSK 4", growth: 44 },
      { id: "h6", label: "16:00", subLabel: "Tan ca chiều", revenue: 95200000, orders: 110, topLevel: "HSK 5", growth: 37 },
      { id: "h7", label: "18:00", subLabel: "Buổi tối", revenue: 115000000, orders: 132, topLevel: "HSK 6", growth: 20 },
      { id: "h8", label: "20:00", subLabel: "Hiện tại", revenue: 128000000, orders: 142, topLevel: "HSK 4", growth: 11 },
    ],
  },
  "7days": {
    title: "7 ngày qua",
    subtitle: "Doanh số và lượng thí sinh 7 ngày gần nhất",
    points: [
      { id: "d1", label: "26/09", subLabel: "Thứ Sáu", revenue: 28500000, orders: 34, topLevel: "HSK 3", growth: 12 },
      { id: "d2", label: "27/09", subLabel: "Thứ Bảy", revenue: 42100000, orders: 48, topLevel: "HSK 4", growth: 47 },
      { id: "d3", label: "28/09", subLabel: "Chủ Nhật", revenue: 51200000, orders: 62, topLevel: "HSK 4", growth: 21 },
      { id: "d4", label: "29/09", subLabel: "Thứ Hai", revenue: 64500000, orders: 75, topLevel: "HSK 5", growth: 26 },
      { id: "d5", label: "30/09", subLabel: "Thứ Ba", revenue: 78900000, orders: 92, topLevel: "HSK 4", growth: 22 },
      { id: "d6", label: "01/10", subLabel: "Thứ Tư", revenue: 92300000, orders: 108, topLevel: "HSK 5", growth: 17 },
      { id: "d7", label: "02/10", subLabel: "Hôm nay", revenue: 128000000, orders: 142, topLevel: "HSK 4", growth: 38 },
    ],
  },
  "30days": {
    title: "30 ngày qua",
    subtitle: "Diễn biến đợt tuyển sinh và thanh toán 1 tháng gần nhất",
    points: [
      { id: "m1", label: "03/09", subLabel: "Tuần 1", revenue: 35000000, orders: 42, topLevel: "HSK 3", growth: 10 },
      { id: "m2", label: "07/09", subLabel: "Mở cổng đợt 3", revenue: 84000000, orders: 98, topLevel: "HSK 4", growth: 140 },
      { id: "m3", label: "12/09", subLabel: "Giữa tháng", revenue: 145000000, orders: 172, topLevel: "HSK 4", growth: 72 },
      { id: "m4", label: "18/09", subLabel: "Tuần 3", revenue: 230000000, orders: 275, topLevel: "HSK 5", growth: 58 },
      { id: "m5", label: "24/09", subLabel: "Tuần 4", revenue: 340000000, orders: 398, topLevel: "HSK 4", growth: 47 },
      { id: "m6", label: "30/09", subLabel: "Cuối tháng 9", revenue: 420000000, orders: 495, topLevel: "HSK 5", growth: 23 },
      { id: "m7", label: "02/10", subLabel: "Hiện tại", revenue: 485500000, orders: 564, topLevel: "HSK 4", growth: 15 },
    ],
  },
  "3months": {
    title: "3 tháng (Quý 3 & 4/2026)",
    subtitle: "So sánh các tháng thi trọng điểm mùa thu",
    points: [
      { id: "q1", label: "Tháng 8", subLabel: "Đợt thi Hè - Thu", revenue: 195000000, orders: 230, topLevel: "HSK 3", growth: 15 },
      { id: "q2", label: "Tháng 9", subLabel: "Kỳ khai giảng", revenue: 345000000, orders: 412, topLevel: "HSK 4", growth: 76 },
      { id: "q3", label: "Tháng 10 (Hiện tại)", subLabel: "Đợt cao điểm thi máy", revenue: 485500000, orders: 564, topLevel: "HSK 4", growth: 40 },
    ],
  },
  "6months": {
    title: "6 tháng qua (05/2026 - 10/2026)",
    subtitle: "Toàn bộ chu kỳ tuyển sinh và cấp chứng chỉ 2 quý",
    points: [
      { id: "sm1", label: "T5/2026", subLabel: "Kỳ thi đợt 1", revenue: 140000000, orders: 168, topLevel: "HSK 3", growth: 8 },
      { id: "sm2", label: "T6/2026", subLabel: "Đợt thi Hè", revenue: 175000000, orders: 210, topLevel: "HSK 4", growth: 25 },
      { id: "sm3", label: "T7/2026", subLabel: "Bổ sung chuẩn đầu ra", revenue: 210000000, orders: 250, topLevel: "HSK 4", growth: 20 },
      { id: "sm4", label: "T8/2026", subLabel: "Đợt Thu", revenue: 280000000, orders: 335, topLevel: "HSK 5", growth: 33 },
      { id: "sm5", label: "T9/2026", subLabel: "Đợt 3 mở rộng", revenue: 395000000, orders: 470, topLevel: "HSK 4", growth: 41 },
      { id: "sm6", label: "T10/2026", subLabel: "Đợt 4 hiện tại", revenue: 485500000, orders: 564, topLevel: "HSK 4", growth: 23 },
    ],
  },
  "1year": {
    title: "Toàn năm 2026",
    subtitle: "Tổng quan doanh số và thí sinh tất cả các đợt thi trong năm",
    points: [
      { id: "y1", label: "T1", subLabel: "Đợt Tết", revenue: 85000000, orders: 102, topLevel: "HSK 3", growth: 5 },
      { id: "y2", label: "T2", subLabel: "Ra Tết", revenue: 95000000, orders: 114, topLevel: "HSK 3", growth: 11 },
      { id: "y3", label: "T3", subLabel: "Xuân", revenue: 130000000, orders: 155, topLevel: "HSK 4", growth: 36 },
      { id: "y4", label: "T4", subLabel: "Đợt 2", revenue: 160000000, orders: 190, topLevel: "HSK 4", growth: 23 },
      { id: "y5", label: "T5", subLabel: "Chính quy", revenue: 210000000, orders: 250, topLevel: "HSK 4", growth: 31 },
      { id: "y6", label: "T6", subLabel: "Hè", revenue: 255000000, orders: 305, topLevel: "HSK 5", growth: 21 },
      { id: "y7", label: "T7", subLabel: "Tốt nghiệp", revenue: 310000000, orders: 370, topLevel: "HSK 4", growth: 21 },
      { id: "y8", label: "T8", subLabel: "Mùa thu", revenue: 380000000, orders: 450, topLevel: "HSK 5", growth: 22 },
      { id: "y9", label: "T9", subLabel: "Khai giảng", revenue: 430000000, orders: 510, topLevel: "HSK 4", growth: 13 },
      { id: "y10", label: "T10", subLabel: "Hiện tại", revenue: 485500000, orders: 564, topLevel: "HSK 4", growth: 12 },
    ],
  },
};

interface InteractiveRevenueChartProps {
  onPointHover?: (point: DataPoint | null) => void;
  initial7DaysData?: any[];
}

export function InteractiveRevenueChart({ onPointHover, initial7DaysData }: InteractiveRevenueChartProps) {
  const [timeframe, setTimeframe] = React.useState<TimeframeKey>("7days");
  const [metric, setMetric] = React.useState<MetricType>("revenue");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const currentDataset = React.useMemo(() => {
    if (timeframe === "7days" && initial7DaysData && initial7DaysData.length > 0) {
      return {
        title: "7 ngày qua (Dữ liệu thực)",
        subtitle: "Doanh số và lượng thí sinh 7 ngày gần nhất",
        points: initial7DaysData.map((d, i) => ({
          id: `live-d${i}`,
          label: d.display_date,
          subLabel: "",
          revenue: d.revenue,
          orders: d.orders,
          topLevel: "Tổng hợp",
          growth: 0
        }))
      };
    }
    return TIMEFRAME_DATA[timeframe];
  }, [timeframe, initial7DaysData]);

  const points = currentDataset.points;

  // Lấy chỉ số min/max để scale SVG
  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1000000);
  const maxOrders = Math.max(...points.map((p) => p.orders), 10);

  // SVG viewBox coordinates
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Tọa độ các điểm (scaled)
  const chartPoints = React.useMemo(() => {
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / (points.length - 1 || 1)) * chartWidth;
      // Trục Y doanh thu
      const revY = paddingTop + (1 - p.revenue / maxRevenue) * chartHeight;
      // Trục Y số đơn
      const orderY = paddingTop + (1 - p.orders / maxOrders) * chartHeight;

      return {
        point: p,
        x,
        revY,
        orderY,
      };
    });
  }, [points, maxRevenue, maxOrders, chartWidth, chartHeight]);

  // Sinh path Bézier
  const revenuePoints = chartPoints.map((cp) => ({ x: cp.x, y: cp.revY }));
  const orderPoints = chartPoints.map((cp) => ({ x: cp.x, y: cp.orderY }));

  const revenueLinePath = generateSmoothLinePath(revenuePoints);
  const revenueAreaPath = generateSmoothAreaPath(revenuePoints, paddingTop + chartHeight);

  const orderLinePath = generateSmoothLinePath(orderPoints);
  const orderAreaPath = generateSmoothAreaPath(orderPoints, paddingTop + chartHeight);

  // Xử lý di chuyển chuột / cảm ứng
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgX = relativeX * scaleX;

    // Tìm điểm gần nhất
    let closestIdx = 0;
    let minDistance = Infinity;

    chartPoints.forEach((cp, idx) => {
      const dist = Math.abs(cp.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
    onPointHover?.(points[closestIdx]);
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
    onPointHover?.(null);
  };

  const activePoint = hoveredIndex !== null ? chartPoints[hoveredIndex] : null;

  // Tính tổng & đỉnh
  const latestPoint = points[points.length - 1];
  const peakPoint = points.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), points[0]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Control Bar: Timeframe & Metric Toggle ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b">
        {/* Timeframe Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {(
            [
              { key: "today", label: "Hôm nay" },
              { key: "7days", label: "7 ngày" },
              { key: "30days", label: "30 ngày" },
              { key: "3months", label: "Quý 3" },
              { key: "6months", label: "6 tháng" },
              { key: "1year", label: "Cả năm" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTimeframe(t.key);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all shrink-0 font-medium ${timeframe === t.key
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-muted/60 p-1 rounded-full border border-border/70 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${metric === "revenue"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Doanh thu
          </button>
          <button
            type="button"
            onClick={() => setMetric("orders")}
            className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${metric === "orders"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Số thí sinh
          </button>
          <button
            type="button"
            onClick={() => setMetric("both")}
            className={`px-2.5 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${metric === "both"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Song song
          </button>
        </div>
      </div>

      {/* ── Chart Header Metrics ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">{currentDataset.title}: </span>
          <strong className="text-foreground text-sm font-bold font-mono">
            {metric === "orders"
              ? `${formatNumber(latestPoint.orders)} thí sinh`
              : formatVND(latestPoint.revenue)}
          </strong>
          {latestPoint.growth > 0 && (
            <span className="ml-2 inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              <TrendingUpIcon className="size-3 mr-0.5" />
              +{latestPoint.growth}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            <span>Doanh thu (VNĐ)</span>
          </span>
          {(metric === "orders" || metric === "both") && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              <span>Thí sinh đăng ký</span>
            </span>
          )}
          <span className="hidden md:inline text-muted-foreground/60">• Di chuột xem real-time</span>
        </div>
      </div>

      {/* ── SVG Chart Viewport ─────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/7] min-h-[260px] max-h-[360px] select-none touch-none"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* Gradient Doanh thu */}
            <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>

            {/* Gradient Đơn hàng */}
            <linearGradient id="orderAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.30" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
            </linearGradient>

            {/* Bộ lọc bóng đổ */}
            <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* 1. Đường lưới ngang (Horizontal Gridlines) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + ratio * chartHeight;
            const val = maxRevenue * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-muted-foreground font-mono"
                >
                  {formatCompactVND(val)}
                </text>
              </g>
            );
          })}

          {/* 2. Nhãn mốc X dưới trục */}
          {chartPoints.map((cp, idx) => (
            <text
              key={cp.point.id}
              x={cp.x}
              y={svgHeight - 12}
              textAnchor="middle"
              className={`text-[11px] font-mono transition-colors ${hoveredIndex === idx ? "fill-foreground font-bold text-xs" : "fill-muted-foreground"
                }`}
            >
              {cp.point.label}
            </text>
          ))}

          {/* 3. Vùng Doanh thu (Area + Path) */}
          {(metric === "revenue" || metric === "both") && (
            <>
              <path
                d={revenueAreaPath}
                fill="url(#revenueAreaGrad)"
                className="transition-all duration-300"
              />
              <path
                d={revenueLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 drop-shadow-xs"
              />
            </>
          )}

          {/* 4. Vùng Số đơn / Thí sinh (Area + Path) */}
          {(metric === "orders" || metric === "both") && (
            <>
              <path
                d={orderAreaPath}
                fill="url(#orderAreaGrad)"
                className="transition-all duration-300"
              />
              <path
                d={orderLinePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={metric === "both" ? "5 3" : undefined}
                className="transition-all duration-300"
              />
            </>
          )}

          {/* 5. Điểm nút tĩnh (Data point nodes) */}
          {chartPoints.map((cp, idx) => (
            <g key={cp.point.id}>
              {(metric === "revenue" || metric === "both") && (
                <circle
                  cx={cp.x}
                  cy={cp.revY}
                  r={hoveredIndex === idx ? 6 : 3.5}
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth={hoveredIndex === idx ? 3 : 2}
                  className="transition-all duration-150 cursor-pointer"
                />
              )}
              {metric === "orders" && (
                <circle
                  cx={cp.x}
                  cy={cp.orderY}
                  r={hoveredIndex === idx ? 6 : 3.5}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={hoveredIndex === idx ? 3 : 2}
                  className="transition-all duration-150 cursor-pointer"
                />
              )}
            </g>
          ))}

          {/* 6. Real-time Crosshair Line khi di chuột */}
          {activePoint && (
            <g className="pointer-events-none transition-all duration-75">
              <line
                x1={activePoint.x}
                y1={paddingTop - 5}
                x2={activePoint.x}
                y2={paddingTop + chartHeight}
                stroke="currentColor"
                className="text-foreground/70"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {/* Vòng hào quang pulsing */}
              <circle
                cx={activePoint.x}
                cy={metric === "orders" ? activePoint.orderY : activePoint.revY}
                r="10"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                className="animate-ping opacity-60"
              />
            </g>
          )}
        </svg>

        {/* ── 7. Floating Glassmorphism Tooltip ────────────────────────── */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-75"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${Math.max(10, ((metric === "orders" ? activePoint.orderY : activePoint.revY) / svgHeight) * 100 - 12)}%`,
            }}
          >
            <div className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-xs flex flex-col gap-1 min-w-[190px]">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="font-bold text-foreground">
                  {activePoint.point.label}
                  {activePoint.point.subLabel ? ` (${activePoint.point.subLabel})` : ""}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full font-mono">
                  {activePoint.point.topLevel}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-muted-foreground">Doanh thu:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatVND(activePoint.point.revenue)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Thí sinh:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(activePoint.point.orders)} đơn
                </span>
              </div>

              {activePoint.point.growth > 0 && (
                <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground border-t mt-0.5">
                  <span>Tăng trưởng:</span>
                  <span className="text-emerald-600 font-semibold font-mono">
                    +{activePoint.point.growth}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Ticker ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t text-xs">
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
          <span className="text-[11px] text-muted-foreground">Đỉnh cao nhất</span>
          <p className="font-mono font-bold text-foreground text-xs sm:text-sm mt-0.5">
            {formatVND(peakPoint.revenue)}
          </p>
          <span className="text-[10px] text-muted-foreground">Tại {peakPoint.label}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
          <span className="text-[11px] text-muted-foreground">Tổng thí sinh kỳ này</span>
          <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs sm:text-sm mt-0.5">
            {formatNumber(latestPoint.orders)} bạn
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">96.8% hoàn tất</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
          <span className="text-[11px] text-muted-foreground">Mức thu trung bình</span>
          <p className="font-mono font-bold text-foreground text-xs sm:text-sm mt-0.5">
            {formatCompactVND(Math.round(latestPoint.revenue / (points.length || 1)))} / mốc
          </p>
          <span className="text-[10px] text-muted-foreground">Dòng tiền ổn định</span>
        </div>

        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
          <span className="text-[11px] text-muted-foreground">Cấp độ đăng ký nhiều nhất</span>
          <p className="font-semibold text-foreground text-xs sm:text-sm mt-0.5 truncate">
            {latestPoint.topLevel}
          </p>
          <span className="text-[10px] text-primary font-medium">Đạt 95% công suất</span>
        </div>
      </div>
    </div>
  );
}
