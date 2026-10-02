/**
 * RoomOccupancyRadar — Giám sát Công suất & Tình trạng Phòng máy tính thời gian thực
 * 
 * - Theo dõi 6 phòng máy Lab thi HSK
 * - Tỷ lệ lấp đầy, số ghế đã đặt, số ghế giữ 15p, số máy hoạt động
 * - Tương thích 100% Mobile đến màn hình lớn 4K
 */
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { DoorOpenIcon, LaptopIcon, UsersIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";

interface RoomData {
  id: string;
  name: string;
  building: string;
  totalPCs: number;
  activePCs: number;
  bookedSeats: number;
  heldSeats: number;
  currentExam: string;
  proctor: string;
  status: "active" | "standby" | "maintenance";
}

const LAB_ROOMS: RoomData[] = [
  { id: "lab401", name: "Phòng Lab 401", building: "Nhà A1 (Tầng 4)", totalPCs: 40, activePCs: 40, bookedSeats: 38, heldSeats: 2, currentExam: "HSK 4 & HSKK Trung cấp", proctor: "ThS. Nguyễn Văn A", status: "active" },
  { id: "lab402", name: "Phòng Lab 402", building: "Nhà A1 (Tầng 4)", totalPCs: 45, activePCs: 45, bookedSeats: 36, heldSeats: 3, currentExam: "HSK 3 & HSKK Sơ cấp", proctor: "ThS. Trần Thị B", status: "active" },
  { id: "lab501", name: "Phòng Lab 501", building: "Nhà B2 (Tầng 5)", totalPCs: 40, activePCs: 40, bookedSeats: 30, heldSeats: 4, currentExam: "HSK 5 & HSKK Cao cấp", proctor: "TS. Lê Hoàng C", status: "active" },
  { id: "lab502", name: "Phòng Lab 502", building: "Nhà B2 (Tầng 5)", totalPCs: 35, activePCs: 35, bookedSeats: 22, heldSeats: 1, currentExam: "HSK 6 & HSKK Cao cấp", proctor: "ThS. Phạm Thu D", status: "active" },
  { id: "lab601", name: "Phòng Lab 601", building: "Nhà C1 (Tầng 6)", totalPCs: 40, activePCs: 40, bookedSeats: 15, heldSeats: 2, currentExam: "Ca thi dự phòng (Sắp mở)", proctor: "Cán bộ trực", status: "standby" },
  { id: "lab602", name: "Phòng Lab 602", building: "Nhà C1 (Tầng 6)", totalPCs: 40, activePCs: 38, bookedSeats: 0, heldSeats: 0, currentExam: "Bảo trì định kỳ máy thi", proctor: "Kỹ thuật viên", status: "maintenance" },
];

export function RoomOccupancyRadar() {
  const [selectedRoom, setSelectedRoom] = React.useState<RoomData>(LAB_ROOMS[0]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LAB_ROOMS.map((room) => {
          const occupancyPct = Math.round(((room.bookedSeats + room.heldSeats) / room.totalPCs) * 100);
          const isSelected = selectedRoom.id === room.id;

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? "bg-card border-foreground/30 shadow-xs ring-1 ring-ring/20"
                  : "bg-muted/20 border-border/70 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <DoorOpenIcon className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground leading-none">
                      {room.name}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">
                      {room.building}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={
                    room.status === "active"
                      ? "default"
                      : room.status === "standby"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] rounded-full px-2 py-0"
                >
                  {room.status === "active" ? "Đang thi" : room.status === "standby" ? "Chờ ca" : "Bảo trì"}
                </Badge>
              </div>

              {/* Progress */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[130px]">
                    {room.currentExam}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {occupancyPct}%
                  </span>
                </div>

                <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden flex">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${Math.round((room.bookedSeats / room.totalPCs) * 100)}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full animate-pulse"
                    style={{ width: `${Math.round((room.heldSeats / room.totalPCs) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                <span>Máy: {room.activePCs}/{room.totalPCs}</span>
                <span>Giám thị: {room.proctor.split(" ").slice(-2).join(" ")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
