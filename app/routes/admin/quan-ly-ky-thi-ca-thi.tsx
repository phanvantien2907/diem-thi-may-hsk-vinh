/**
 * Quản lý Kỳ thi & Ca thi — Cổng Quản Trị HSK Đại học Vinh
 * 
 * APIs liên quan từ API_DOCUMENTATION.md:
 * - GET /api/v1/exam-sessions (Danh sách ca thi)
 * - POST /api/v1/admin/exam-sessions/batch-create (Tạo ca thi hàng loạt)
 * - POST /api/v1/admin/exam-sessions/:id/seats/generate (Sinh ghế cho ca thi)
 * - POST /api/v1/admin/exam-sessions/:id/cancel (Hủy ca thi)
 */
import * as React from "react";
import type { Route } from "./+types/quan-ly-ky-thi-ca-thi";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import {
  CalendarDaysIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  LayersIcon,
  DoorOpenIcon,
  UsersIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
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
  { title: "Quản lý Kỳ thi & Ca thi — Cổng Quản Trị" },
  {
    name: "description",
    content: "Quản lý các đợt thi, lịch thi và ca thi máy HSK tại Trường Đại học Vinh.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);

  // Thử fetch danh sách ca thi từ API backend
  let sessions = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/exam-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      sessions = data.data || [];
    }
  } catch (error) {
    console.error("[AdminExam] Error fetching sessions:", error);
  }

  // Dữ liệu mẫu ban đầu nếu backend chưa có ca thi
  if (!sessions || sessions.length === 0) {
    sessions = [
      {
        id: 101,
        level: "HSK 3 & HSKK Sơ cấp",
        room: "Lab 401 - Nhà A1",
        date: "2026-10-15",
        shift: "Sáng (08:30 - 10:30)",
        capacity: 40,
        booked: 38,
        held: 2,
        fee: 650000,
        status: "full",
      },
      {
        id: 102,
        level: "HSK 4 & HSKK Trung cấp",
        room: "Lab 402 - Nhà A1",
        date: "2026-10-15",
        shift: "Chiều (14:00 - 16:30)",
        capacity: 45,
        booked: 32,
        held: 4,
        fee: 850000,
        status: "open",
      },
      {
        id: 103,
        level: "HSK 5 & HSKK Cao cấp",
        room: "Lab 501 - Nhà B2",
        date: "2026-10-16",
        shift: "Sáng (08:30 - 11:15)",
        capacity: 40,
        booked: 24,
        held: 3,
        fee: 1050000,
        status: "open",
      },
      {
        id: 104,
        level: "HSK 6 & HSKK Cao cấp",
        room: "Lab 502 - Nhà B2",
        date: "2026-10-16",
        shift: "Chiều (14:00 - 17:00)",
        capacity: 35,
        booked: 15,
        held: 1,
        fee: 1250000,
        status: "open",
      },
    ];
  }

  return { user, sessions };
}

export default function QuanLyKyThiCaThiPage() {
  const [searchTerm, setSearchTerm] = React.useState("");

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quản lý Kỳ thi & Ca thi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thiết lập đợt thi máy HSK, tạo ca thi hàng loạt và quản lý sơ đồ phân bổ ghế phòng máy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm"
            onClick={() => {
              toast.add({
                type: "info",
                title: "Sinh ghế thi",
                description: "Tính năng sinh ghế tự động theo phòng máy đang được mở.",
              });
            }}
          >
            <LayersIcon className="size-4 mr-1.5" />
            Sinh ghế tự động
          </Button>

          <Button
            className="rounded-full cursor-pointer hover:bg-primary/90 font-medium text-xs sm:text-sm"
            onClick={() => {
              toast.add({
                type: "info",
                title: "Tạo ca thi mới",
                description: "Chức năng tạo ca thi hàng loạt đang được chuẩn bị.",
              });
            }}
          >
            <PlusIcon className="size-4 mr-1.5" />
            Tạo ca thi mới
          </Button>
        </div>
      </div>

      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarDaysIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng số ca thi mở</p>
              <p className="text-xl font-bold text-foreground">12 ca</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ghế đã xác nhận</p>
              <p className="text-xl font-bold text-foreground">382 / 450</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đang giữ chỗ (15p)</p>
              <p className="text-xl font-bold text-foreground">18 ghế</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DoorOpenIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phòng máy hoạt động</p>
              <p className="text-xl font-bold text-foreground">6 phòng Lab</p>
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
                Danh sách ca thi đợt hiện tại
              </CardTitle>
              <CardDescription className="text-xs">
                Theo dõi tình trạng lấp đầy, số ghế giữ và tỷ lệ tham gia.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo cấp độ, phòng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-full text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-xs">Mã ca</TableHead>
                <TableHead className="font-semibold text-xs">Cấp độ thi</TableHead>
                <TableHead className="font-semibold text-xs">Phòng máy</TableHead>
                <TableHead className="font-semibold text-xs">Thời gian & Ca</TableHead>
                <TableHead className="font-semibold text-xs text-center">Đã đặt / Tổng</TableHead>
                <TableHead className="font-semibold text-xs text-right">Lệ phí</TableHead>
                <TableHead className="font-semibold text-xs text-center">Trạng thái</TableHead>
                <TableHead className="font-semibold text-xs text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                {
                  id: "CS-101",
                  level: "HSK 3 & HSKK Sơ cấp",
                  room: "Lab 401 (Nhà A1)",
                  time: "15/10/2026 • 08:30",
                  booked: 38,
                  capacity: 40,
                  fee: "650.000 đ",
                  status: "full",
                  statusText: "Đã đầy",
                },
                {
                  id: "CS-102",
                  level: "HSK 4 & HSKK Trung cấp",
                  room: "Lab 402 (Nhà A1)",
                  time: "15/10/2026 • 14:00",
                  booked: 32,
                  capacity: 45,
                  fee: "850.000 đ",
                  status: "open",
                  statusText: "Đang mở",
                },
                {
                  id: "CS-103",
                  level: "HSK 5 & HSKK Cao cấp",
                  room: "Lab 501 (Nhà B2)",
                  time: "16/10/2026 • 08:30",
                  booked: 24,
                  capacity: 40,
                  fee: "1.050.000 đ",
                  status: "open",
                  statusText: "Đang mở",
                },
                {
                  id: "CS-104",
                  level: "HSK 6 & HSKK Cao cấp",
                  room: "Lab 502 (Nhà B2)",
                  time: "16/10/2026 • 14:00",
                  booked: 15,
                  capacity: 35,
                  fee: "1.250.000 đ",
                  status: "open",
                  statusText: "Đang mở",
                },
              ].map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {row.id}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-foreground">
                    {row.level}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.room}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {row.time}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-semibold text-foreground">
                      {row.booked} / {row.capacity}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({Math.round((row.booked / row.capacity) * 100)}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold text-foreground font-mono">
                    {row.fee}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={row.status === "full" ? "secondary" : "default"}
                      className="text-[10px] rounded-full px-2 py-0.5"
                    >
                      {row.statusText}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full cursor-pointer hover:bg-muted text-xs h-7 px-2.5"
                      onClick={() => {
                        toast.add({
                          type: "info",
                          title: "Chi tiết ca thi",
                          description: `Xem chi tiết và sơ đồ ca thi ${row.id}`,
                        });
                      }}
                    >
                      Chi tiết
                    </Button>
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
