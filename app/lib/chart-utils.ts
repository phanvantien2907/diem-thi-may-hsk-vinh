/**
 * Chart Utilities — Lightweight, Ultra-fast SVG Chart Math
 * Cung cấp giải thuật làm mượt đường cong Bézier (Cubic Spline) 
 * và format tiền tệ cho biểu đồ thời gian thực.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Tạo đường cong Bézier bậc 3 mượt mà qua các điểm dữ liệu.
 */
export function getBezierControlPoints(p0: Point, p1: Point, p2: Point, p3: Point, tension = 0.25) {
  const d1 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
  const d2 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const d3 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);

  const cp1x = p1.x + (tension * (p2.x - p0.x) * d2) / (d1 + d2 || 1);
  const cp1y = p1.y + (tension * (p2.y - p0.y) * d2) / (d1 + d2 || 1);

  const cp2x = p2.x - (tension * (p3.x - p1.x) * d2) / (d2 + d3 || 1);
  const cp2y = p2.y - (tension * (p3.y - p1.y) * d2) / (d2 + d3 || 1);

  return { cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y } };
}

/**
 * Sinh chuỗi path 'd' cho SVG Line mềm mại.
 */
export function generateSmoothLinePath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const { cp1, cp2 } = getBezierControlPoints(p0, p1, p2, p3);
    d += ` C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)}, ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Sinh chuỗi path 'd' cho SVG Area (khép kín đáy).
 */
export function generateSmoothAreaPath(points: Point[], bottomY: number): string {
  if (points.length === 0) return "";
  const linePath = generateSmoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x.toFixed(1)} ${bottomY.toFixed(1)} L ${first.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;
}

/**
 * Định dạng tiền tệ VNĐ chuẩn.
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Định dạng rút gọn (e.g. 128.5 Tr, 485 Tr).
 */
export function formatCompactVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Tr`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} K`;
  }
  return String(amount);
}

/**
 * Định dạng số nguyên.
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN").format(num);
}

/**
 * Định dạng thời gian chuẩn bắt buộc của dự án theo project-rules:
 * dd/MM/yyyy HH:mm:ss (ví dụ: 03/10/2026 09:02:02)
 */
export function formatStandardDateTime(dateInput: string | Date | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "--/--/---- --:--:--";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "--/--/---- --:--:--";
  }
}

