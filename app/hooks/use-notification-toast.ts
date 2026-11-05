import * as React from "react";
import { toast } from "~/components/ui/toast";
import type { NotificationItem } from "~/types/notification";

export function mapNotificationToastType(
  notifType?: string
): "error" | "success" | "warning" | "info" {
  switch ((notifType || "").toUpperCase()) {
    case "PROFILE_REJECTED":
      return "error";
    case "PROFILE_APPROVED":
    case "PAYMENT_CONFIRMED":
      return "success";
    case "EXAM_RESCHEDULED":
      return "warning";
    default:
      return "info";
  }
}

export function triggerNotificationToast(notification: NotificationItem) {
  const toastType = mapNotificationToastType(notification.type);
  toast.add({
    title: notification.title || "Thông báo mới",
    description: notification.content,
    type: toastType,
  });
}

export function useNotificationToast() {
  const notify = React.useCallback((notification: NotificationItem) => {
    triggerNotificationToast(notification);
  }, []);

  return { notify };
}

