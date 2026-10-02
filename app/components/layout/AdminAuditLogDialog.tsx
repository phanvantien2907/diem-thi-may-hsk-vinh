import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/toast";
import {
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  SearchIcon,
  RotateCcwIcon,
  DownloadIcon,
  FilterIcon,
  CreditCardIcon,
  CalendarIcon,
  UsersRoundIcon,
  ShieldCheckIcon,
  ActivityIcon,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  category: "approval" | "transaction" | "exam_session" | "security";
  target: string;
  adminName: string;
  ip: string;
  timestamp: string;
  status: "success" | "warning" | "info";
  detail: string;
}

const INITIAL_LOGS: AuditLogItem[] = [
  {
    id: "LOG-8841",
    action: "Duyệt khẩn cấp Webhook PayOS",
    category: "transaction",
    target: "Giao dịch #TX-90214 (Nguyễn Minh Hằng)",
    adminName: "Quản trị viên",
    ip: "14.241.22.88",
    timestamp: "2 phút trước (10:14)",
    status: "success",
    detail: "Đã kích hoạt khớp ghế khẩn cấp sau độ trễ 45s từ cổng VietQR",
  },
  {
    id: "LOG-8840",
    action: "Khóa chỉnh sửa ca thi",
    category: "exam_session",
    target: "Ca thi HSK 4 - Phòng LAB 02 (Đợt 3)",
    adminName: "Quản trị viên",
    ip: "14.241.22.88",
    timestamp: "18 phút trước (09:58)",
    status: "info",
    detail: "Ca thi đã đủ 40/40 thí sinh đăng ký, chuyển trạng thái tự động khóa",
  },
  {
    id: "LOG-8839",
    action: "Hoàn tiền chênh lệch thí sinh",
    category: "transaction",
    target: "Giao dịch #TX-89102 (Trần Văn Bảo)",
    adminName: "Quản trị viên",
    ip: "14.241.22.88",
    timestamp: "1 giờ trước (09:15)",
    status: "warning",
    detail: "Ghi nhận hoàn 250.000 đ chuyển dư về tài khoản Vietcombank đích",
  },
  {
    id: "LOG-8838",
    action: "Phê duyệt hồ sơ CCCD",
    category: "approval",
    target: "Hồ sơ #HS-44812 (Lê Thị Thu Thảo)",
    adminName: "Quản trị viên",
    ip: "14.241.22.88",
    timestamp: "2 giờ trước (08:30)",
    status: "success",
    detail: "Xác minh ảnh 2 mặt CCCD và ảnh thẻ 3x4 đạt chuẩn ICAO",
  },
  {
    id: "LOG-8837",
    action: "Đăng nhập hệ thống quản trị",
    category: "security",
    target: "Phiên làm việc quản trị viên",
    adminName: "Quản trị viên",
    ip: "14.241.22.88",
    timestamp: "Hôm nay 08:00",
    status: "info",
    detail: "Xác thực 2 yếu tố phiên làm việc IP cơ sở Đại học Vinh thành công",
  },
  {
    id: "LOG-8836",
    action: "Thêm ca thi mới",
    category: "exam_session",
    target: "Đợt thi tháng 11/2026 - HSK 5",
    adminName: "Quản trị viên",
    ip: "113.160.18.42",
    timestamp: "Hôm qua 16:45",
    status: "success",
    detail: "Tạo 3 ca thi với tổng hạn ngạch 120 thí sinh phòng máy LAB",
  },
  {
    id: "LOG-8835",
    action: "Xóa bộ nhớ đệm cache",
    category: "security",
    target: "Bộ đệm máy chủ SSR & Redis Query Cache",
    adminName: "Quản trị viên",
    ip: "113.160.18.42",
    timestamp: "Hôm qua 14:10",
    status: "info",
    detail: "Đã làm sạch 48.2 MB cache dữ liệu ca thi và trạng thái phòng máy",
  },
];

interface AdminAuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminAuditLogDialog({ open, onOpenChange }: AdminAuditLogDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [logs, setLogs] = React.useState<AuditLogItem[]>(INITIAL_LOGS);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesCategory = selectedCategory === "all" || log.category === selectedCategory;
      const matchesSearch =
        searchTerm.trim() === "" ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip.includes(searchTerm);
      return matchesCategory && matchesSearch;
    });
  }, [logs, selectedCategory, searchTerm]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.add({
        type: "success",
        title: "Đã đồng bộ nhật ký thao tác mới nhất",
      });
    }, 450);
  };

  const handleExport = () => {
    toast.add({
      type: "info",
      title: "Đang trích xuất nhật ký thao tác",
      description: "Tệp audit_logs.csv đang được kết xuất và tải xuống...",
    });
  };

  const getCategoryBadge = (category: AuditLogItem["category"]) => {
    switch (category) {
      case "approval":
        return (
          <Badge variant="outline" className="rounded-full text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200">
            <UsersRoundIcon className="size-3 mr-1" />
            Hồ sơ & Duyệt
          </Badge>
        );
      case "transaction":
        return (
          <Badge variant="outline" className="rounded-full text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200">
            <CreditCardIcon className="size-3 mr-1" />
            Giao dịch
          </Badge>
        );
      case "exam_session":
        return (
          <Badge variant="outline" className="rounded-full text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200">
            <CalendarIcon className="size-3 mr-1" />
            Ca thi
          </Badge>
        );
      case "security":
        return (
          <Badge variant="outline" className="rounded-full text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200">
            <ShieldCheckIcon className="size-3 mr-1" />
            Bảo mật
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: AuditLogItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "warning":
        return <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "info":
        return <ActivityIcon className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl overflow-hidden rounded-2xl flex flex-col max-h-[88vh] p-0">
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClockIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Lịch sử thao tác của tôi
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ghi nhận toàn bộ thao tác phê duyệt, xử lý thanh toán và cấu hình ca thi
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 px-2.5 rounded-full cursor-pointer text-xs"
              >
                <RotateCcwIcon className={`size-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-8 px-2.5 rounded-full cursor-pointer text-xs"
              >
                <DownloadIcon className="size-3.5 mr-1" />
                Xuất CSV
              </Button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm theo hành động, mã đối tượng, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs rounded-full bg-background"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { key: "all", label: "Tất cả" },
                { key: "approval", label: "Hồ sơ" },
                { key: "transaction", label: "Giao dịch" },
                { key: "exam_session", label: "Ca thi" },
                { key: "security", label: "Bảo mật" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === tab.key
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <FilterIcon className="size-8 opacity-40" />
              <p className="text-sm font-medium">Không tìm thấy bản ghi thao tác phù hợp</p>
              <p className="text-xs text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition-colors shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-foreground">
                        {log.action}
                      </span>
                      {getCategoryBadge(log.category)}
                    </div>
                    <p className="text-xs text-foreground/80 font-medium truncate">
                      {log.target}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {log.detail}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {log.timestamp}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                      IP: {log.ip}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Hiển thị {filteredLogs.length} thao tác gần nhất</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full cursor-pointer h-7 text-xs px-3"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
