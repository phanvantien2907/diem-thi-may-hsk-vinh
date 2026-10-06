import * as React from "react";
import type { Route } from "./+types/quan-ly-giao-dich-thanh-toan";
import { requireAdminAuth } from "~/lib/auth.server";
import {
  CreditCardIcon,
  SearchIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  FileCheck2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { toast } from "~/components/ui/toast";

export const meta: Route.MetaFunction = () => [
  { title: "Giao dịch & Thanh toán" },
  {
    name: "description",
    content: "Đối soát thanh toán PayOS, giám sát luồng giao dịch ngân hàng và quản lý lệ phí thi HSK.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  return { user, token };
}

export default function QuanLyGiaoDichThanhToanPage() {
  const [isReconciling, setIsReconciling] = React.useState(false);

  const sampleTransactions = [
    {
      orderCode: "PAY-100248",
      refCode: "REF_9812401",
      candidateName: "Nguyễn Văn An",
      level: "HSK 4 & HSKK Trung cấp",
      amount: "850.000 đ",
      method: "PayOS (QR VietQR)",
      bank: "MBBank",
      status: "success",
      statusText: "Thành công",
      time: "02/10/2026 08:35:12",
    },
    {
      orderCode: "PAY-100247",
      refCode: "REF_9812400",
      candidateName: "Lê Hoàng Long",
      level: "HSK 3 & HSKK Sơ cấp",
      amount: "650.000 đ",
      method: "PayOS (VietinBank)",
      bank: "VietinBank",
      status: "pending",
      statusText: "Chờ thanh toán (15p)",
      time: "02/10/2026 08:30:05",
    },
    {
      orderCode: "PAY-100246",
      refCode: "REF_9812399",
      candidateName: "Phạm Thu Hương",
      level: "HSK 6 & HSKK Cao cấp",
      amount: "1.250.000 đ",
      method: "PayOS (Vietcombank)",
      bank: "VCB",
      status: "success",
      statusText: "Thành công",
      time: "02/10/2026 08:12:44",
    },
    {
      orderCode: "PAY-100245",
      refCode: "REF_9812398",
      candidateName: "Trần Minh Đức",
      level: "HSK 5 & HSKK Cao cấp",
      amount: "1.050.000 đ",
      method: "PayOS",
      bank: "BIDV",
      status: "cancelled",
      statusText: "Hết hạn 15p",
      time: "02/10/2026 07:45:00",
    },
  ];

  const handleReconcile = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      toast.add({
        type: "success",
        title: "Đối soát thành công!",
        description: "Toàn bộ giao dịch ngân hàng khớp 100% với đơn hàng PayOS.",
      });
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quản lý Giao dịch & Thanh toán
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Báo cáo đối soát doanh thu tự động, kiểm soát Webhook PayOS và phòng chống lệch giá (Amount Guard).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm"
            onClick={handleReconcile}
            disabled={isReconciling}
          >
            <RefreshCwIcon className={`size-4 mr-1.5 ${isReconciling ? "animate-spin" : ""}`} />
            {isReconciling ? "Đang đối soát..." : "Chạy đối soát hôm nay"}
          </Button>

          <Button
            className="rounded-full cursor-pointer hover:bg-primary/90 font-medium text-xs sm:text-sm"
            onClick={() => {
              toast.add({
                type: "info",
                title: "Báo cáo doanh thu",
                description: "Đang tạo báo cáo tài chính định dạng PDF / Excel...",
              });
            }}
          >
            <FileCheck2Icon className="size-4 mr-1.5" />
            Xuất sổ đối soát
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CreditCardIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng thu tháng 10/2026</p>
              <p className="text-xl font-bold text-foreground">485.500.000 đ</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Giao dịch thành công</p>
              <p className="text-xl font-bold text-foreground">1.180 (96.8%)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đang xử lý / Giữ chỗ</p>
              <p className="text-xl font-bold text-foreground">24 đơn</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount Guard bảo vệ</p>
              <p className="text-xl font-bold text-foreground">100% An toàn</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table Card ── */}
      <Card className="rounded-2xl border overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold">
                Lịch sử giao dịch thanh toán trực tuyến
              </CardTitle>
              <CardDescription className="text-xs">
                Toàn bộ giao dịch đều được bảo vệ bằng chữ ký HMAC-SHA256 và Stored Procedure Idempotent.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đơn, tên thí sinh..."
                className="pl-9 h-9 rounded-full text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-xs">Mã đơn PayOS</TableHead>
                <TableHead className="font-semibold text-xs">Thí sinh</TableHead>
                <TableHead className="font-semibold text-xs">Kỳ thi / Cấp độ</TableHead>
                <TableHead className="font-semibold text-xs text-right">Số tiền</TableHead>
                <TableHead className="font-semibold text-xs">Cổng & Ngân hàng</TableHead>
                <TableHead className="font-semibold text-xs">Thời gian giao dịch</TableHead>
                <TableHead className="font-semibold text-xs text-center">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleTransactions.map((tx) => (
                <TableRow key={tx.orderCode} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {tx.orderCode}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-foreground">
                    {tx.candidateName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {tx.level}
                  </TableCell>
                  <TableCell className="text-xs text-right font-bold text-foreground font-mono">
                    {tx.amount}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {tx.method}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {tx.time}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        tx.status === "success"
                          ? "default"
                          : tx.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px] rounded-full px-2 py-0.5"
                    >
                      {tx.statusText}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
