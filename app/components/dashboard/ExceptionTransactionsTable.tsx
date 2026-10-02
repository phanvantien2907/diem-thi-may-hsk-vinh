import * as React from "react";
import { formatVND } from "~/lib/chart-utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  ArrowRightLeftIcon,
  SendIcon,
  RotateCcwIcon,
  FileCodeIcon,
  CheckIcon,
  UserIcon,
  PhoneIcon,
  Building2Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationPrevious,
  PaginationNext,
} from "~/components/ui/pagination";
import { toast } from "~/components/ui/toast";

export type ExceptionType = "underpaid" | "overpaid" | "webhook_timeout" | "resolved";

export interface ExceptionTransaction {
  id: string;
  orderCode: string;
  refCode: string;
  candidateName: string;
  candidatePhone: string;
  candidateCccd: string;
  examLevel: string;
  roomName: string;
  expectedAmount: number;
  actualAmount: number;
  diffAmount: number;
  type: ExceptionType;
  bankName: string;
  timestamp: string;
  rawWebhookPayload: Record<string, unknown>;
  note: string;
}

const INITIAL_EXCEPTIONS: ExceptionTransaction[] = [
  {
    id: "EX-101",
    orderCode: "PAY-100258",
    refCode: "FT26275891024",
    candidateName: "Nguyễn Văn Đạt",
    candidatePhone: "0912 345 678",
    candidateCccd: "038099001234",
    examLevel: "HSK 4 & HSKK Trung cấp",
    roomName: "Lab 401 - Nhà A1",
    expectedAmount: 850000,
    actualAmount: 85000,
    diffAmount: -765000,
    type: "underpaid",
    bankName: "MBBank (VietQR)",
    timestamp: "8 phút trước",
    rawWebhookPayload: {
      orderCode: 100258,
      amount: 85000,
      description: "Thanh toan HSK4 Nguyen Van Dat",
      accountNumber: "987654321",
      bank: "MB",
      status: "amount_mismatch",
      errorCode: -2,
      errorMsg: "Số tiền chuyển (85.000 đ) không khớp với lệ phí ca thi (850.000 đ)",
    },
    note: "Thí sinh nhập nhầm thiếu 1 số 0 khi quét mã QR",
  },
  {
    id: "EX-102",
    orderCode: "PAY-100256",
    refCode: "FT26275891012",
    candidateName: "Trần Thị Cẩm Tú",
    candidatePhone: "0987 654 321",
    candidateCccd: "040098005678",
    examLevel: "HSK 3 & HSKK Sơ cấp",
    roomName: "Lab 402 - Nhà A1",
    expectedAmount: 650000,
    actualAmount: 1300000,
    diffAmount: 650000,
    type: "overpaid",
    bankName: "Vietcombank",
    timestamp: "15 phút trước",
    rawWebhookPayload: {
      orderCode: 100256,
      amount: 1300000,
      description: "Chuyen khoan le phi HSK 3",
      accountNumber: "1012345678",
      bank: "VCB",
      status: "overpaid",
      errorCode: -3,
      errorMsg: "Thí sinh chuyển thừa 650.000 đ (Chuyển trùng 2 lần)",
    },
    note: "Thí sinh bấm chuyển tiền 2 lần trên ứng dụng ngân hàng",
  },
  {
    id: "EX-103",
    orderCode: "PAY-100252",
    refCode: "FT26275890988",
    candidateName: "Lê Hoàng Long",
    candidatePhone: "0934 567 890",
    candidateCccd: "038097009876",
    examLevel: "HSK 5 & HSKK Cao cấp",
    roomName: "Lab 501 - Nhà B2",
    expectedAmount: 1050000,
    actualAmount: 1050000,
    diffAmount: 0,
    type: "webhook_timeout",
    bankName: "VietinBank",
    timestamp: "22 phút trước (Sắp hết 15p giữ slot)",
    rawWebhookPayload: {
      orderCode: 100252,
      amount: 1050000,
      description: "HSK 5 Le Hoang Long",
      accountNumber: "789012345",
      bank: "CTG",
      status: "webhook_dropped",
      errorCode: 504,
      errorMsg: "Gateway timeout. Ngân hàng đã trừ tiền nhưng Webhook IPN bị rớt gói tin",
    },
    note: "Ngân hàng đã trừ 1.050.000 đ, thí sinh đã có biên lai nhưng hệ thống chưa kích hoạt ghế",
  },
  {
    id: "EX-104",
    orderCode: "PAY-100249",
    refCode: "FT26275890940",
    candidateName: "Phùng Thị Ngọc",
    candidatePhone: "0961 234 567",
    candidateCccd: "038099003322",
    examLevel: "HSK 6 & HSKK Cao cấp",
    roomName: "Lab 502 - Nhà B2",
    expectedAmount: 1250000,
    actualAmount: 1200000,
    diffAmount: -50000,
    type: "underpaid",
    bankName: "BIDV",
    timestamp: "32 phút trước",
    rawWebhookPayload: {
      orderCode: 100249,
      amount: 1200000,
      description: "Le phi HSK 6 Phung Thi Ngoc",
      bank: "BIDV",
      errorCode: -2,
      errorMsg: "Thiếu 50.000 đ so với biểu phí chuẩn HSK 6 (1.250.000 đ)",
    },
    note: "Thí sinh nhớ nhầm biểu phí năm ngoái",
  },
  {
    id: "EX-105",
    orderCode: "PAY-100246",
    refCode: "FT26275890915",
    candidateName: "Hoàng Đức Thắng",
    candidatePhone: "0977 889 900",
    candidateCccd: "042098004567",
    examLevel: "HSK 4 & HSKK Trung cấp",
    roomName: "Lab 401 - Nhà A1",
    expectedAmount: 850000,
    actualAmount: 850000,
    diffAmount: 0,
    type: "webhook_timeout",
    bankName: "Techcombank",
    timestamp: "45 phút trước",
    rawWebhookPayload: {
      orderCode: 100246,
      amount: 850000,
      description: "Thanh toan HSK4 Hoang Duc Thang",
      bank: "TCB",
      errorCode: 500,
      errorMsg: "Internal Server Error khi xử lý callback từ ngân hàng",
    },
    note: "Đã trừ tiền ngân hàng Techcombank nhưng Webhook callback bị lỗi 500",
  },
  {
    id: "EX-106",
    orderCode: "PAY-100244",
    refCode: "FT26275890880",
    candidateName: "Đặng Minh Quân",
    candidatePhone: "0915 678 123",
    candidateCccd: "038096007788",
    examLevel: "HSK 3 & HSKK Sơ cấp",
    roomName: "Lab 402 - Nhà A1",
    expectedAmount: 650000,
    actualAmount: 1050000,
    diffAmount: 400000,
    type: "overpaid",
    bankName: "Agribank",
    timestamp: "1 giờ trước",
    rawWebhookPayload: {
      orderCode: 100244,
      amount: 1050000,
      description: "Chuyen le phi thi Dang Minh Quan",
      bank: "VBA",
      errorCode: -3,
      errorMsg: "Chuyển nhầm biểu phí HSK 5 vào hồ sơ HSK 3 (thừa 400.000 đ)",
    },
    note: "Thí sinh nộp nhầm giá của cấp độ HSK 5",
  },
  {
    id: "EX-107",
    orderCode: "PAY-100240",
    refCode: "FT26275890810",
    candidateName: "Vũ Hải Yến",
    candidatePhone: "0982 112 233",
    candidateCccd: "040099002233",
    examLevel: "HSK 4 & HSKK Trung cấp",
    roomName: "Lab 401 - Nhà A1",
    expectedAmount: 850000,
    actualAmount: 850000,
    diffAmount: 0,
    type: "resolved",
    bankName: "MBBank",
    timestamp: "1 giờ 15 phút trước",
    rawWebhookPayload: {
      orderCode: 100240,
      amount: 850000,
      status: "manually_resolved",
    },
    note: "Đã duyệt thủ công bởi Admin (Biên lai ngân hàng hợp lệ)",
  },
];

export function ExceptionTransactionsTable() {
  const [exceptions, setExceptions] = React.useState<ExceptionTransaction[]>(INITIAL_EXCEPTIONS);
  const [filterType, setFilterType] = React.useState<"all" | ExceptionType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedTxForLog, setSelectedTxForLog] = React.useState<ExceptionTransaction | null>(null);

  const PAGE_SIZE = 3; // 3 ngoại lệ / trang để hiển thị bảng rõ ràng, không bị dài

  // Reset về trang 1 khi lọc hoặc tìm kiếm
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  // Thao tác duyệt thủ công khẩn cấp
  const handleManualApprove = (tx: ExceptionTransaction) => {
    setExceptions((prev) =>
      prev.map((item) =>
        item.id === tx.id ? { ...item, type: "resolved" as ExceptionType, note: "Đã duyệt thủ công bởi Admin" } : item
      )
    );

    toast.add({
      type: "success",
      title: "Duyệt thủ công thành công!",
      description: `Đã kích hoạt ghế thi cho ${tx.candidateName} (${tx.examLevel}) tại ${tx.roomName}. Tránh bị hủy sau 15p!`,
      timeout: 5000,
    });
  };

  // Thao tác yêu cầu nộp bù
  const handleRequestSupplement = (tx: ExceptionTransaction) => {
    toast.add({
      type: "info",
      title: "Đã gửi thông báo nộp bù!",
      description: `Hệ thống đã gửi SMS & Email tới ${tx.candidatePhone} yêu cầu nộp bù phần thiếu ${formatVND(Math.abs(tx.diffAmount))}.`,
      timeout: 4000,
    });
  };

  // Thao tác tạo lệnh hoàn tiền
  const handleCreateRefund = (tx: ExceptionTransaction) => {
    toast.add({
      type: "success",
      title: "Đã lập phiếu hoàn tiền!",
      description: `Đã ghi nhận hoàn ${formatVND(tx.diffAmount)} cho ${tx.candidateName} về tài khoản ${tx.bankName}.`,
      timeout: 4000,
    });
  };

  // Sao chép JSON payload
  const handleCopyPayload = (payload: Record<string, unknown>) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.add({
        type: "success",
        title: "Đã sao chép JSON!",
        description: "Dữ liệu webhook payload đã được lưu vào clipboard.",
        timeout: 3000,
      });
    } catch {
      toast.add({
        type: "error",
        title: "Không thể sao chép",
        description: "Vui lòng bôi đen và sao chép thủ công.",
        timeout: 3000,
      });
    }
  };

  // Lọc dữ liệu
  const filteredList = exceptions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.candidateName.toLowerCase().includes(q) ||
        tx.orderCode.toLowerCase().includes(q) ||
        tx.candidatePhone.includes(q) ||
        tx.refCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedList = filteredList.slice(startIndex, startIndex + PAGE_SIZE);

  const countUnderpaid = exceptions.filter((e) => e.type === "underpaid").length;
  const countOverpaid = exceptions.filter((e) => e.type === "overpaid").length;
  const countTimeout = exceptions.filter((e) => e.type === "webhook_timeout").length;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── 1. Top Badges & KPI Strip ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Thiếu tiền */}
        <div className="p-3.5 rounded-2xl border border-destructive/30 bg-destructive/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-destructive/10 text-destructive shrink-0">
              <ShieldAlertIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Chuyển thiếu tiền</p>
              <p className="text-[11px] text-muted-foreground">Amount Guard chặn</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-xs rounded-full px-2 py-0.5 font-mono">
            {countUnderpaid} ca
          </Badge>
        </div>

        {/* Chuyển thừa */}
        <div className="p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <RotateCcwIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Chuyển thừa tiền</p>
              <p className="text-[11px] text-muted-foreground">Cần hoàn khoản dư</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs rounded-full px-2 py-0.5 font-mono">
            {countOverpaid} ca
          </Badge>
        </div>

        {/* Webhook Timeout / Mất slot */}
        <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ClockIcon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Webhook Delay (Cần giữ slot)</p>
              <p className="text-[11px] text-muted-foreground">Khẩn cấp duyệt tay</p>
            </div>
          </div>
          <Badge variant="default" className="bg-amber-600 hover:bg-amber-600 text-white text-xs rounded-full px-2 py-0.5 font-mono">
            {countTimeout} ca khẩn
          </Badge>
        </div>
      </div>

      {/* ── 2. Filter Bar & Search ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium ${filterType === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            Tất cả ngoại lệ ({exceptions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("underpaid")}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium ${filterType === "underpaid"
                ? "bg-destructive text-destructive-foreground font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            Thiếu tiền ({countUnderpaid})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("overpaid")}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium ${filterType === "overpaid"
                ? "bg-blue-600 text-white font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            Thừa tiền ({countOverpaid})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("webhook_timeout")}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium ${filterType === "webhook_timeout"
                ? "bg-amber-600 text-white font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            Webhook Delay ({countTimeout})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("resolved")}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all font-medium ${filterType === "resolved"
                ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
          >
            Đã giải quyết
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, mã PAY, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8.5 h-8.5 rounded-full text-xs"
          />
        </div>
      </div>

      {/* ── 3. Exception Data Table ───────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold text-xs py-3">Mã đơn & Thời gian</TableHead>
              <TableHead className="font-semibold text-xs py-3">Thí sinh & Ca thi</TableHead>
              <TableHead className="font-semibold text-xs py-3 text-right">Lệ phí quy định</TableHead>
              <TableHead className="font-semibold text-xs py-3 text-right">Thực nhận (PayOS)</TableHead>
              <TableHead className="font-semibold text-xs py-3 text-center">Chênh lệch</TableHead>
              <TableHead className="font-semibold text-xs py-3 text-center">Chuẩn đoán</TableHead>
              <TableHead className="font-semibold text-xs py-3 text-right">Thao tác xử lý</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  Không tìm thấy giao dịch ngoại lệ nào trong danh mục này.
                </TableCell>
              </TableRow>
            ) : (
              paginatedList.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/40 transition-colors">
                  {/* Mã đơn & Thời gian */}
                  <TableCell className="align-top py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {tx.orderCode}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Ref: {tx.refCode}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ClockIcon className="size-3" />
                        {tx.timestamp}
                      </span>
                    </div>
                  </TableCell>

                  {/* Thí sinh & Ca thi */}
                  <TableCell className="align-top py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs text-foreground">
                        {tx.candidateName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        SĐT: {tx.candidatePhone} • CCCD: {tx.candidateCccd}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-full font-medium">
                          {tx.examLevel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">• {tx.roomName}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Lệ phí quy định */}
                  <TableCell className="align-top py-3 text-right font-mono text-xs font-semibold text-foreground">
                    {formatVND(tx.expectedAmount)}
                  </TableCell>

                  {/* Thực nhận PayOS */}
                  <TableCell className="align-top py-3 text-right font-mono text-xs font-bold">
                    <span
                      className={
                        tx.type === "underpaid"
                          ? "text-destructive"
                          : tx.type === "overpaid"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {formatVND(tx.actualAmount)}
                    </span>
                    <p className="text-[10px] text-muted-foreground font-normal">{tx.bankName}</p>
                  </TableCell>

                  {/* Chênh lệch */}
                  <TableCell className="align-top py-3 text-center">
                    {tx.diffAmount < 0 ? (
                      <span className="font-mono font-bold text-xs text-destructive">
                        {formatVND(tx.diffAmount)}
                      </span>
                    ) : tx.diffAmount > 0 ? (
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        +{formatVND(tx.diffAmount)}
                      </span>
                    ) : (
                      <span className="font-mono font-semibold text-xs text-emerald-600">
                        Khớp số tiền
                      </span>
                    )}
                  </TableCell>

                  {/* Chuẩn đoán */}
                  <TableCell className="align-top py-3 text-center">
                    {tx.type === "underpaid" && (
                      <Badge variant="destructive" className="text-[10px] rounded-full px-2 py-0.5">
                        Thiếu tiền (-2)
                      </Badge>
                    )}
                    {tx.type === "overpaid" && (
                      <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0.5 border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10">
                        Chuyển dư tiền
                      </Badge>
                    )}
                    {tx.type === "webhook_timeout" && (
                      <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse">
                        Webhook Timeout (504)
                      </Badge>
                    )}
                    {tx.type === "resolved" && (
                      <Badge variant="default" className="text-[10px] rounded-full px-2 py-0.5 bg-emerald-600 text-white">
                        <CheckIcon className="size-3 mr-0.5 inline" /> Đã xử lý
                      </Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[130px] truncate" title={tx.note}>
                      {tx.note}
                    </p>
                  </TableCell>

                  {/* Thao tác xử lý */}
                  <TableCell className="align-top py-3 text-right">
                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                      {/* Nút xem log Webhook */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTxForLog(tx)}
                        className="rounded-full cursor-pointer hover:bg-muted text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <FileCodeIcon className="size-3 mr-1" />
                        Log JSON
                      </Button>

                      {/* Xử lý theo từng loại */}
                      {tx.type === "webhook_timeout" && (
                        <Button
                          size="sm"
                          onClick={() => handleManualApprove(tx)}
                          className="rounded-full cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-3 shadow-2xs font-semibold"
                        >
                          <CheckCircle2Icon className="size-3.5 mr-1" />
                          Duyệt thủ công (Giữ slot)
                        </Button>
                      )}

                      {tx.type === "underpaid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRequestSupplement(tx)}
                          className="rounded-full cursor-pointer hover:bg-destructive/10 text-destructive border-destructive/40 text-[11px] h-7 px-2.5"
                        >
                          <SendIcon className="size-3 mr-1" />
                          Báo nộp bù
                        </Button>
                      )}

                      {tx.type === "overpaid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCreateRefund(tx)}
                          className="rounded-full cursor-pointer hover:bg-blue-500/10 text-blue-600 border-blue-500/40 text-[11px] h-7 px-2.5"
                        >
                          <RotateCcwIcon className="size-3 mr-1" />
                          Lệnh hoàn tiền
                        </Button>
                      )}

                      {tx.type === "resolved" && (
                        <span className="text-[11px] text-emerald-600 font-medium px-2">
                          Hoàn tất
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination Bar ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 text-xs">
          <p className="text-muted-foreground text-[11px]">
            Hiển thị <strong className="text-foreground">{startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filteredList.length)}</strong> trên <strong className="text-foreground">{filteredList.length}</strong> ngoại lệ
          </p>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="gap-1.5 flex-nowrap">
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

      {/* ── 4. Dialog xem Webhook JSON chi tiết (Dynamic ngắn / dài) ───────── */}
      {selectedTxForLog && (
        <Dialog open={Boolean(selectedTxForLog)} onOpenChange={() => setSelectedTxForLog(null)}>
          <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden rounded-2xl max-h-[88vh] flex flex-col shadow-2xl border border-border">
            {/* Header */}
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-muted/20 shrink-0">
              <div className="flex items-start justify-between gap-3 pr-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <FileCodeIcon className="size-5 text-primary shrink-0" />
                      <span>Chi tiết Giao dịch Ngoại lệ PayOS</span>
                    </DialogTitle>
                    {selectedTxForLog.type === "underpaid" && (
                      <Badge variant="destructive" className="text-[10px] rounded-full px-2 py-0.5">
                        Thiếu tiền
                      </Badge>
                    )}
                    {selectedTxForLog.type === "overpaid" && (
                      <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0.5 border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10">
                        Chuyển thừa
                      </Badge>
                    )}
                    {selectedTxForLog.type === "webhook_timeout" && (
                      <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 animate-pulse">
                        Webhook Timeout (504)
                      </Badge>
                    )}
                    {selectedTxForLog.type === "resolved" && (
                      <Badge variant="default" className="text-[10px] rounded-full px-2 py-0.5 bg-emerald-600 text-white">
                        <CheckIcon className="size-3 mr-0.5 inline" /> Đã xử lý
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Mã đơn hàng: <strong className="font-mono text-foreground font-semibold">{selectedTxForLog.orderCode}</strong> • Mã đối soát: <strong className="font-mono text-foreground font-semibold">{selectedTxForLog.refCode}</strong>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Body: Co giãn thông minh theo dữ liệu ngắn / dài */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4 text-xs">
              {/* Thông tin Thí sinh & Ca thi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs min-w-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-muted-foreground text-[11px]">Họ và tên thí sinh</span>
                  <strong className="text-foreground text-sm font-semibold truncate">{selectedTxForLog.candidateName}</strong>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    SĐT: {selectedTxForLog.candidatePhone} • CCCD: {selectedTxForLog.candidateCccd}
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-muted-foreground text-[11px]">Ca thi & Phòng máy</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[11px] rounded-full font-medium">
                      {selectedTxForLog.examLevel}
                    </Badge>
                    <span className="text-[11px] text-foreground font-medium">{selectedTxForLog.roomName}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Ngân hàng: <strong className="text-foreground font-medium">{selectedTxForLog.bankName}</strong> • {selectedTxForLog.timestamp}
                  </span>
                </div>
              </div>

              {/* So sánh Lệ phí vs Thực nhận PayOS */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl border bg-card text-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Lệ phí ca thi</span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                    {formatVND(selectedTxForLog.expectedAmount)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 border-x border-border/60">
                  <span className="text-[11px] text-muted-foreground">Thực nhận PayOS</span>
                  <span className={`font-mono font-bold text-xs sm:text-sm ${selectedTxForLog.type === "underpaid"
                      ? "text-destructive"
                      : selectedTxForLog.type === "overpaid"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                    {formatVND(selectedTxForLog.actualAmount)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground">Chênh lệch</span>
                  <span className={`font-mono font-bold text-xs sm:text-sm ${selectedTxForLog.diffAmount < 0
                      ? "text-destructive"
                      : selectedTxForLog.diffAmount > 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-emerald-600"
                    }`}>
                    {selectedTxForLog.diffAmount > 0 ? `+${formatVND(selectedTxForLog.diffAmount)}` : formatVND(selectedTxForLog.diffAmount)}
                  </span>
                </div>
              </div>

              {/* Dữ liệu thô JSON từ Stored Procedure / PayOS Webhook */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Dữ liệu thô Webhook (Payload JSON):</span>
                    <Badge variant="secondary" className="text-[10px] rounded-full px-1.5 py-0 font-mono">
                      {Object.keys(selectedTxForLog.rawWebhookPayload).length} trường
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleCopyPayload(selectedTxForLog.rawWebhookPayload)}
                    className="rounded-full cursor-pointer hover:bg-muted text-xs h-6.5 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <CopyIcon className="size-3" />
                    <span>Sao chép JSON</span>
                  </Button>
                </div>

                <div className="rounded-xl bg-gray-950 border border-gray-800 overflow-hidden min-w-0">
                  <pre className="p-3.5 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-all sm:break-normal select-text">
                    {JSON.stringify(selectedTxForLog.rawWebhookPayload, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Ghi chú nghiệp vụ & Hướng xử lý: Co giãn tự nhiên theo độ dài text */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5 min-w-0">
                <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5 min-w-0 break-words">
                  <span className="font-semibold text-foreground">Ghi chú & Khuyến nghị xử lý:</span>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{selectedTxForLog.note}</p>
                </div>
              </div>
            </div>

            {/* Footer: Cố định bên dưới, responsive */}
            <DialogFooter className="p-3.5 sm:p-4 border-t bg-muted/30 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-full cursor-pointer hover:bg-muted text-xs h-8 px-4"
                onClick={() => setSelectedTxForLog(null)}
              >
                Đóng
              </Button>

              {selectedTxForLog.type === "webhook_timeout" && (
                <Button
                  className="rounded-full cursor-pointer bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-4 font-semibold shadow-xs"
                  onClick={() => {
                    handleManualApprove(selectedTxForLog);
                    setSelectedTxForLog(null);
                  }}
                >
                  <CheckCircle2Icon className="size-3.5 mr-1" />
                  Xác nhận duyệt thủ công (Giữ slot)
                </Button>
              )}

              {selectedTxForLog.type === "underpaid" && (
                <Button
                  variant="default"
                  className="rounded-full cursor-pointer bg-destructive hover:bg-destructive/90 text-white text-xs h-8 px-4 font-semibold"
                  onClick={() => {
                    handleRequestSupplement(selectedTxForLog);
                    setSelectedTxForLog(null);
                  }}
                >
                  <SendIcon className="size-3 mr-1" />
                  Gửi thông báo nộp bù
                </Button>
              )}

              {selectedTxForLog.type === "overpaid" && (
                <Button
                  variant="default"
                  className="rounded-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 font-semibold"
                  onClick={() => {
                    handleCreateRefund(selectedTxForLog);
                    setSelectedTxForLog(null);
                  }}
                >
                  <RotateCcwIcon className="size-3 mr-1" />
                  Tạo lệnh hoàn khoản dư
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
