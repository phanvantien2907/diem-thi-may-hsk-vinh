import * as React from "react";
import type { NotificationItem } from "~/types/notification";
import { useNotificationToast } from "~/hooks/use-notification-toast";
import { useNotificationWS } from "~/hooks/use-notification-ws";

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
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

  const wsState = useNotificationWS({
    token,
    refreshToken,
    apiBaseUrl: resolvedApiBase,
    onNewNotification: notify,
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
      markAsRead: async () => {},
      refreshNotifications: async () => {},
    };
  }
  return ctx;
}
