import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
} from "~/components/ui/pagination";
import {
  CreditCardIcon,
  ClockIcon,
  CheckCircle2Icon,
  UsersIcon,
  SearchIcon,
  ActivityIcon,
} from "lucide-react";
import type { RecentAdminActivity } from "~/types/admin";

export type ActivityCategory = "all" | "payment" | "seat_release" | "verification" | "system";

export interface ActivityItem extends RecentAdminActivity {
  category: "payment" | "seat_release" | "verification" | "system";
  metaInfo?: string;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: "ACT-01",
    type: "payment",
    category: "payment",
    title: "PayOS khớp lệnh thành công",
    description: "Thí sinh Nguyễn Văn An thanh toán 850.000 ₫ cho ca HSK 4 & HSKK Trung cấp.",
    timestamp: "Vừa xong (09:12)",
    badge_text: "+850.000 ₫",
    status: "success",
    metaInfo: "MBBank • Mã PAY-100258",
  },
  {
    id: "ACT-02",
    type: "seat_release",
    category: "seat_release",
    title: "CronJob 60s quét ghế quá hạn",
    description: "Tự động nhả 2 ghế hết hạn 15 phút tại phòng Lab 401 về trạng thái trống (Available).",
    timestamp: "3 phút trước (09:09)",
    badge_text: "Nhả 2 ghế",
    status: "warning",
    metaInfo: "CronJob tự động giải phóng",
  },
  {
    id: "ACT-03",
    type: "verification",
    category: "verification",
    title: "Phê duyệt giấy tờ CCCD",
    description: "Hồ sơ thí sinh Trần Thị Mai (CCCD 040098005678) đã được xác minh ảnh chụp 2 mặt hợp lệ.",
    timestamp: "8 phút trước (09:04)",
    badge_text: "Hợp lệ",
    status: "info",
    metaInfo: "Admin phê duyệt",
  },
  {
    id: "ACT-04",
    type: "registration",
    category: "system",
    title: "Thí sinh đặt giữ chỗ ca thi",
    description: "Thí sinh Lê Hoàng Long đặt chỗ thành công ca HSK 3 (Thời hạn thanh toán PayOS: 15 phút).",
    timestamp: "14 phút trước (08:58)",
    badge_text: "Giữ 15p",
    status: "info",
    metaInfo: "Lab 402 - Ghế A-12",
  },
  {
    id: "ACT-05",
    type: "payment",
    category: "payment",
    title: "PayOS khớp lệnh thành công",
    description: "Thí sinh Phạm Thu Hương nộp lệ phí 1.250.000 ₫ cho ca thi HSK 6 & HSKK Cao cấp.",
    timestamp: "21 phút trước (08:51)",
    badge_text: "+1.250.000 ₫",
    status: "success",
    metaInfo: "Vietcombank • PAY-100255",
  },
  {
    id: "ACT-06",
    type: "system",
    category: "system",
    title: "Cảnh báo trùng lặp hồ sơ",
    description: "Phát hiện CCCD 038099001234 đăng ký 2 ca thi trùng khung giờ ngày 15/10/2026.",
    timestamp: "28 phút trước (08:44)",
    badge_text: "Cảnh báo trùng",
    status: "danger",
    metaInfo: "Hệ thống kiểm tra tự động",
  },
  {
    id: "ACT-07",
    type: "verification",
    category: "verification",
    title: "Từ chối giấy tờ (Yêu cầu chụp lại)",
    description: "Hồ sơ thí sinh Vũ Minh Tuấn bị từ chối do ảnh thẻ mờ, không rõ số CCCD.",
    timestamp: "35 phút trước (08:37)",
    badge_text: "Yêu cầu chụp lại",
    status: "warning",
    metaInfo: "Đã gửi SMS thông báo",
  },
  {
    id: "ACT-08",
    type: "payment",
    category: "payment",
    title: "Kế toán xử lý hoàn tiền chuyển dư",
    description: "Lập lệnh hoàn 650.000 ₫ cho thí sinh Trần Thị Cẩm Tú do chuyển trùng 2 lần.",
    timestamp: "42 phút trước (08:30)",
    badge_text: "Hoàn 650k",
    status: "info",
    metaInfo: "VCB • Lệnh REF-8910",
  },
  {
    id: "ACT-09",
    type: "seat_release",
    category: "seat_release",
    title: "CronJob quét tự động",
    description: "Quét 18 ghế đang giữ chỗ, xác nhận 16 ghế còn hạn hợp lệ, 1 ghế đã chuyển sang đặt cọc.",
    timestamp: "50 phút trước (08:22)",
    badge_text: "Đồng bộ",
    status: "info",
    metaInfo: "Kiểm tra định kỳ 60s",
  },
  {
    id: "ACT-10",
    type: "system",
    category: "system",
    title: "Admin can thiệp duyệt thủ công",
    description: "Kích hoạt ghế thi cho thí sinh bị rớt gói tin Webhook Gateway Timeout (504).",
    timestamp: "58 phút trước (08:14)",
    badge_text: "Duyệt tay",
    status: "success",
    metaInfo: "Lab 501 • Ghế B-05",
  },
];

export function RecentActivityFeed() {
  const [activities] = React.useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [selectedCategory, setSelectedCategory] = React.useState<ActivityCategory>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const PAGE_SIZE = 4; // 4 hoạt động / trang

  // Lọc hoạt động
  const filteredActivities = activities.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.metaInfo && item.metaInfo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Reset về trang 1 khi lọc
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredActivities.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filteredActivities.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* ── Category Filter & Search Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "payment", label: "PayOS" },
              { key: "seat_release", label: "Nhả ghế" },
              { key: "verification", label: "Duyệt CCCD" },
              { key: "system", label: "Hệ thống" },
            ] as const
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCategory(c.key)}
              className={`px-2.5 py-1 text-[11px] rounded-full cursor-pointer transition-all shrink-0 font-medium ${selectedCategory === c.key
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Small Search */}
        <div className="relative w-full sm:w-48 shrink-0">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            placeholder="Lọc hoạt động..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7.5 rounded-full text-xs"
          />
        </div>
      </div>

      {/* ── Activity Item List ───────────────────────────────────────────── */}
      <div className="flex flex-col divide-y divide-border/60 min-h-[280px]">
        {currentItems.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
            Không có hoạt động nào trong danh mục đã chọn.
          </div>
        ) : (
          currentItems.map((act) => (
            <div
              key={act.id}
              className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 hover:bg-muted/30 p-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 p-2 rounded-xl shrink-0 ${act.type === "payment"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : act.type === "seat_release"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : act.status === "danger"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                >
                  {act.type === "payment" && <CreditCardIcon className="size-4" />}
                  {act.type === "seat_release" && <ClockIcon className="size-4" />}
                  {act.type === "verification" && <CheckCircle2Icon className="size-4" />}
                  {act.type === "registration" && <UsersIcon className="size-4" />}
                  {act.type === "system" && <ActivityIcon className="size-4" />}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {act.title}
                    </span>
                    {act.metaInfo && (
                      <span className="text-[10px] text-muted-foreground/80 hidden sm:inline font-mono">
                        • {act.metaInfo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {act.description}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                    <ClockIcon className="size-3 text-muted-foreground/70" />
                    {act.timestamp}
                  </span>
                </div>
              </div>

              {act.badge_text && (
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 rounded-full px-2 py-0 font-mono ${act.status === "success"
                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-semibold"
                    : act.status === "warning"
                      ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-semibold"
                      : act.status === "danger"
                        ? "border-destructive/30 text-destructive bg-destructive/5 font-semibold"
                        : ""
                    }`}
                >
                  {act.badge_text}
                </Badge>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Pagination Bar ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t text-xs">
          <p className="text-muted-foreground text-[11px]">
            Hiển thị <strong className="text-foreground">{startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filteredActivities.length)}</strong> trên <strong className="text-foreground">{filteredActivities.length}</strong> hoạt động
          </p>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationButton
                    isActive={currentPage === pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className="size-8 text-xs rounded-full cursor-pointer"
                  >
                    {pageNum}
                  </PaginationButton>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
