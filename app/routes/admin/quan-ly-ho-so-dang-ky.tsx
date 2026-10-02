import * as React from "react";
import type { Route } from "./+types/quan-ly-ho-so-dang-ky";
import { requireAdminAuth } from "~/lib/auth.server";
import {
  UsersRoundIcon,
  SearchIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  EyeIcon,
  DownloadIcon,
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
  { title: "Quản lý Hồ sơ Đăng ký — Cổng Quản Trị" },
  {
    name: "description",
    content: "Phê duyệt giấy tờ tùy thân, kiểm tra hồ sơ trùng lặp và xác nhận hồ sơ thí sinh dự thi HSK.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  return { user, token };
}

export default function QuanLyHoSoDangKyPage() {
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = React.useState("");

  const sampleCandidates = [
    {
      id: 1,
      cccd: "038099012345",
      name: "Nguyễn Văn An",
      dob: "15/04/2002",
      phone: "0912345678",
      examLevel: "HSK 4 & HSKK Trung cấp",
      docStatus: "pending",
      docStatusText: "Chờ duyệt",
      registeredAt: "02/10/2026 08:15",
    },
    {
      id: 2,
      cccd: "040098005678",
      name: "Trần Thị Mai",
      dob: "20/11/2001",
      phone: "0987654321",
      examLevel: "HSK 5 & HSKK Cao cấp",
      docStatus: "approved",
      docStatusText: "Đã duyệt",
      registeredAt: "01/10/2026 16:40",
    },
    {
      id: 3,
      cccd: "038097009876",
      name: "Lê Hoàng Long",
      dob: "05/09/2000",
      phone: "0934567890",
      examLevel: "HSK 3 & HSKK Sơ cấp",
      docStatus: "pending",
      docStatusText: "Chờ duyệt",
      registeredAt: "02/10/2026 07:30",
    },
    {
      id: 4,
      cccd: "042099003412",
      name: "Phạm Thu Hương",
      dob: "12/08/2003",
      phone: "0971234567",
      examLevel: "HSK 6 & HSKK Cao cấp",
      docStatus: "rejected",
      docStatusText: "Từ chối (Ảnh mờ)",
      registeredAt: "30/09/2026 14:20",
    },
  ];

  const filteredCandidates = sampleCandidates.filter((c) => {
    if (activeTab === "pending" && c.docStatus !== "pending") return false;
    if (activeTab === "approved" && c.docStatus !== "approved") return false;
    if (activeTab === "rejected" && c.docStatus !== "rejected") return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.cccd.includes(q);
    }
    return true;
  });

  const handleApprove = (id: number, name: string) => {
    toast.add({
      type: "success",
      title: "Đã duyệt hồ sơ",
      description: `Hồ sơ thí sinh ${name} đã được phê duyệt thành công.`,
    });
  };

  const handleReject = (id: number, name: string) => {
    toast.add({
      type: "error",
      title: "Từ chối hồ sơ",
      description: `Đã gửi thông báo yêu cầu cập nhật lại giấy tờ tới ${name}.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quản lý Hồ sơ Đăng ký
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xác minh danh tính thí sinh, kiểm tra căn cước công dân và phê duyệt giấy tờ dự thi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm"
            onClick={() => {
              toast.add({
                type: "info",
                title: "Kiểm tra trùng lặp",
                description: "Hệ thống đang quét CCCD trùng lặp trên toàn bộ đợt thi.",
              });
            }}
          >
            <AlertTriangleIcon className="size-4 mr-1.5 text-amber-500" />
            Quét hồ sơ trùng
          </Button>

          <Button
            className="rounded-full cursor-pointer hover:bg-primary/90 font-medium text-xs sm:text-sm"
            onClick={() => {
              toast.add({
                type: "success",
                title: "Xuất dữ liệu",
                description: "Đang tải xuống danh sách thí sinh đã duyệt (Excel)...",
              });
            }}
          >
            <DownloadIcon className="size-4 mr-1.5" />
            Xuất danh sách
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <UsersRoundIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng thí sinh đăng ký</p>
              <p className="text-xl font-bold text-foreground">1.284</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hồ sơ chờ phê duyệt</p>
              <p className="text-xl font-bold text-foreground">38 hồ sơ</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đã duyệt hợp lệ</p>
              <p className="text-xl font-bold text-foreground">1.242</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
              <XCircleIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hồ sơ từ chối / cần sửa</p>
              <p className="text-xl font-bold text-foreground">4 hồ sơ</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table Card ── */}
      <Card className="rounded-2xl border overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-full w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${activeTab === "pending"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Chờ duyệt (38)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("approved")}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${activeTab === "approved"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Đã duyệt (1.242)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rejected")}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${activeTab === "rejected"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Từ chối (4)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium ${activeTab === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Tất cả
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm họ tên hoặc CCCD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-full text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-xs">Số CCCD / Mã</TableHead>
                <TableHead className="font-semibold text-xs">Họ và tên thí sinh</TableHead>
                <TableHead className="font-semibold text-xs">Ngày sinh</TableHead>
                <TableHead className="font-semibold text-xs">Số điện thoại</TableHead>
                <TableHead className="font-semibold text-xs">Cấp độ đăng ký</TableHead>
                <TableHead className="font-semibold text-xs text-center">Trạng thái giấy tờ</TableHead>
                <TableHead className="font-semibold text-xs text-right">Thao tác duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {c.cccd}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.dob}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-medium">
                    {c.examLevel}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        c.docStatus === "approved"
                          ? "default"
                          : c.docStatus === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] rounded-full px-2 py-0.5"
                    >
                      {c.docStatusText}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full cursor-pointer hover:bg-muted text-xs h-7 px-2"
                        onClick={() => {
                          toast.add({
                            type: "info",
                            title: "Xem ảnh giấy tờ",
                            description: `Mở xem ảnh mặt trước/sau CCCD của ${c.name}`,
                          });
                        }}
                      >
                        <EyeIcon className="size-3.5 mr-1" />
                        Xem
                      </Button>

                      {c.docStatus === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-full cursor-pointer hover:bg-emerald-600 bg-emerald-500 text-white text-xs h-7 px-2.5"
                            onClick={() => handleApprove(c.id, c.name)}
                          >
                            <CheckCircle2Icon className="size-3 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full cursor-pointer text-xs h-7 px-2.5"
                            onClick={() => handleReject(c.id, c.name)}
                          >
                            <XCircleIcon className="size-3 mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
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
