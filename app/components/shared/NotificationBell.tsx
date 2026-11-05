import * as React from "react";
import { useNavigate } from "react-router";
import {
  BellIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  InfoIcon,
  ExternalLinkIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useNotifications } from "~/components/shared/NotificationProvider";
import type { NotificationItem } from "~/types/notification";

/**
 * Formats an ISO timestamp strictly as `dd/MM/yyyy HH:mm:ss` with zero-padding
 * in accordance with `.agents/rules/project-rules.md` §6.
 */
export function formatNotificationDateTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function getNotificationIcon(type?: string) {
  switch ((type || "").toUpperCase()) {
    case "PROFILE_REJECTED":
    case "EXAM_CANCELLED":
      return <XCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />;
    case "PROFILE_APPROVED":
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_SUCCESS":
      return <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" />;
    case "EXAM_RESCHEDULED":
      return <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />;
    default:
      return <InfoIcon className="size-4 text-primary shrink-0 mt-0.5" />;
  }
}

function resolveNotificationTarget(item: NotificationItem): { path: string; label: string } {
  const isAdmin = (item.role || "").toLowerCase() === "admin";
  switch ((item.type || "").toUpperCase()) {
    case "PROFILE_REJECTED":
    case "PROFILE_APPROVED":
      return isAdmin
        ? { path: "/quan-ly-ho-so-dang-ky", label: "Mở Quản lý hồ sơ" }
        : { path: "/thong-tin-thi-sinh", label: "Xem Hồ sơ thí sinh" };
    case "PAYMENT_SUCCESS":
    case "PAYMENT_CONFIRMED":
      return isAdmin
        ? { path: "/quan-ly-giao-dich-thanh-toan", label: "Mở Giao dịch thanh toán" }
        : { path: "/dang-ky-thi", label: "Xem Đăng ký thi" };
    case "EXAM_CANCELLED":
    case "EXAM_RESCHEDULED":
      return isAdmin
        ? { path: "/quan-ly-ky-thi-ca-thi", label: "Mở Quản lý ca thi" }
        : { path: "/dang-ky-thi", label: "Xem Lịch thi của tôi" };
    default:
      return isAdmin
        ? { path: "/trang-quan-tri", label: "Về Trang quản trị" }
        : { path: "/thong-tin-thi-sinh", label: "Xem Thông tin thí sinh" };
  }
}

export function NotificationBell() {
  const { notifications, unreadCount, isConnected, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedNotification, setSelectedNotification] =
    React.useState<NotificationItem | null>(null);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      void markAsRead(item.id);
    }
    setPopoverOpen(false);
    setSelectedNotification({ ...item, is_read: true });
  };

  const handleNavigateFromModal = () => {
    if (!selectedNotification) return;
    const target = resolveNotificationTarget(selectedNotification);
    setSelectedNotification(null);
    navigate(target.path);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-full cursor-pointer"
              aria-label={
                unreadCount > 0
                  ? `Thông báo (${unreadCount} chưa đọc)`
                  : "Thông báo hệ thống"
              }
            />
          }
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 rounded-2xl overflow-hidden shadow-lg">
          <PopoverHeader className="flex flex-row items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <PopoverTitle className="text-sm font-semibold">Thông báo</PopoverTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {unreadCount} mới
                </Badge>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              title={isConnected ? "Kết nối thời gian thực đang hoạt động" : "Đang kết nối lại..."}
            >
              <span
                className={`size-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {isConnected ? "Trực tuyến" : "Đang đồng bộ"}
            </span>
          </PopoverHeader>

          <Separator />

          <div className="max-h-96 overflow-y-auto p-2 space-y-1.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-muted-foreground">
                <BellIcon className="size-6 opacity-40" />
                <p className="text-xs">Bạn chưa có thông báo nào.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`flex w-full items-start gap-3 p-3 rounded-xl text-left transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border ${
                    !item.is_read
                      ? "bg-muted/40 border-border/60"
                      : "bg-background border-transparent"
                  }`}
                >
                  {getNotificationIcon(item.type)}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-xs leading-snug ${
                          !item.is_read
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {item.title || "Thông báo hệ thống"}
                      </span>
                      {!item.is_read && (
                        <span
                          className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Chưa đọc"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words line-clamp-2">
                      {item.content}
                    </p>
                    <span className="text-[11px] text-muted-foreground/75">
                      {formatNotificationDateTime(item.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) setSelectedNotification(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          {selectedNotification && (
            <>
              <DialogHeader className="p-5 pb-3.5 pr-12 border-b bg-muted/20">
                <div className="flex items-center gap-2 mb-1">
                  {getNotificationIcon(selectedNotification.type)}
                  <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0.5">
                    Đã đọc • {formatNotificationDateTime(selectedNotification.created_at)}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedNotification.title || "Chi tiết thông báo"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Thông báo hệ thống khảo thí HSK — Trường Đại học Vinh
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {selectedNotification.content}
              </div>

              <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-full cursor-pointer text-xs h-9"
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNavigateFromModal}
                  className="rounded-full cursor-pointer text-xs h-9 gap-1.5"
                >
                  <span>{resolveNotificationTarget(selectedNotification).label}</span>
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

