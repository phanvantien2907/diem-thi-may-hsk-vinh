import * as React from "react";
import {
  BellIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  InfoIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
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
      return <XCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />;
    case "PROFILE_APPROVED":
    case "PAYMENT_CONFIRMED":
      return <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" />;
    case "EXAM_RESCHEDULED":
      return <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />;
    default:
      return <InfoIcon className="size-4 text-primary shrink-0 mt-0.5" />;
  }
}

export function NotificationBell() {
  const { notifications, unreadCount, isConnected, markAsRead } = useNotifications();

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) {
      void markAsRead(item.id);
    }
  };

  return (
    <Popover>
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

      <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0">
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

        <div className="max-h-96 overflow-y-auto divide-y divide-border">
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
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 cursor-pointer ${
                  !item.is_read ? "bg-muted/30" : "bg-background"
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
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
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
  );
}

