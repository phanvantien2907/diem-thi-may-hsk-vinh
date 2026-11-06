import * as React from "react";
import type {
  ForceLogoutPayload,
  NotificationItem,
  ProfileStatusUpdatedPayload,
} from "~/types/notification";
import { useNotificationToast } from "~/hooks/use-notification-toast";
import { useNotificationWS } from "~/hooks/use-notification-ws";
import { toast } from "~/components/ui/toast";

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  latestProfileStatus: ProfileStatusUpdatedPayload | null;
  markAsRead: (notificationId: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  token?: string | null;
  refreshToken?: string | null;
  apiBaseUrl?: string;
  children: React.ReactNode;
}

function resolveApiBaseUrl(explicitUrl?: string): string {
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, "");
  }
  return "http://localhost:8080";
}

export function NotificationProvider({
  token,
  refreshToken,
  apiBaseUrl,
  children,
}: NotificationProviderProps) {
  const { notify } = useNotificationToast();
  const resolvedApiBase = React.useMemo(() => resolveApiBaseUrl(apiBaseUrl), [apiBaseUrl]);

  const handleForceLogout = React.useCallback((payload: ForceLogoutPayload) => {
    toast.add({
      type: "error",
      title: "Tài khoản của bạn đã bị vô hiệu hóa",
      description:
        payload?.message ||
        "Phiên đăng nhập đã bị thu hồi. Vui lòng liên hệ Quản trị viên để được hỗ trợ.",
      timeout: 7000,
    });
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.replace("/dang-xuat?reason=deactivated");
      }, 600);
    }
  }, []);

  const wsState = useNotificationWS({
    token,
    refreshToken,
    apiBaseUrl: resolvedApiBase,
    onNewNotification: notify,
    onForceLogout: handleForceLogout,
  });

  return (
    <NotificationContext.Provider value={wsState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      isLoading: false,
      latestProfileStatus: null,
      markAsRead: async () => {},
      refreshNotifications: async () => {},
    };
  }
  return ctx;
}
