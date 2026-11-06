import * as React from "react";
import {
  WS_CLOSE_CODE_MAX_CONN_EVICTED,
  WS_CLOSE_CODE_SESSION_TERMINATED,
  WS_CLOSE_CODE_TOKEN_EXPIRED,
  type ForceLogoutPayload,
  type NotificationItem,
  type NotificationReadPayload,
  type ProfileStatusUpdatedPayload,
  type WSNotificationEnvelope,
} from "../types/notification.ts";

export const INITIAL_BACKOFF_MS = 1000;
export const MAX_BACKOFF_MS = 30000;

/**
 * Pure helper: Deduplicates and merges notification lists using a Map<number, NotificationItem>
 * keyed on `notification.id`. Silently drops duplicates and sorts newest-first (descending ID)
 * so out-of-order messages are always placed deterministically.
 */
export function mergeAndDedupeNotifications(
  existing: NotificationItem[],
  incoming: NotificationItem | NotificationItem[]
): { items: NotificationItem[]; addedNew: NotificationItem[] } {
  const map = new Map<number, NotificationItem>();
  for (const item of existing) {
    if (item && typeof item.id === "number" && item.id > 0) {
      map.set(item.id, item);
    }
  }

  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const addedNew: NotificationItem[] = [];

  for (const item of incomingList) {
    if (!item || typeof item.id !== "number" || item.id <= 0) {
      continue;
    }
    const prev = map.get(item.id);
    if (!prev) {
      addedNew.push(item);
      map.set(item.id, item);
    } else {
      // Preserve read state if already marked read locally in another tab
      map.set(item.id, {
        ...prev,
        ...item,
        is_read: Boolean(prev.is_read || item.is_read),
      });
    }
  }

  const items = Array.from(map.values()).sort((a, b) => b.id - a.id);
  return { items, addedNew };
}

/**
 * Pure helper: Marks a notification ID as read locally when a `notification_read`
 * WebSocket event arrives from another open browser tab.
 */
export function applyNotificationReadSync(
  existing: NotificationItem[],
  readId: number
): NotificationItem[] {
  if (!readId || readId <= 0) return existing;
  let mutated = false;
  const next = existing.map((item) => {
    if (item.id === readId && !item.is_read) {
      mutated = true;
      return { ...item, is_read: true, status: "sent" };
    }
    return item;
  });
  return mutated ? next : existing;
}

/**
 * Computes the highest local notification ID (`<max_local_id>`) for `GET /notifications?after_id=`.
 */
export function getMaxNotificationId(items: NotificationItem[]): number {
  let maxId = 0;
  for (const item of items) {
    if (item && typeof item.id === "number" && item.id > maxId) {
      maxId = item.id;
    }
  }
  return maxId;
}

/**
 * Calculates exponential backoff delay in milliseconds: 1s -> 2s -> 4s -> 8s -> max 30s.
 */
export function calculateBackoffDelay(attempt: number): number {
  const safeAttempt = Math.max(0, attempt);
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, safeAttempt), MAX_BACKOFF_MS);
}

/**
 * Builds the WebSocket URL using a one-time ticket (`?ticket=<ticket>`).
 * Never places a raw JWT (`?token=`) in the URL.
 */
export function buildTicketWebSocketUrl(apiBaseUrl: string, ticket: string): string {
  const cleanBase = apiBaseUrl.replace(/\/+$/, "");
  const wsBase = cleanBase.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  return `${wsBase}/ws?ticket=${encodeURIComponent(ticket)}`;
}

/**
 * Requests a short-lived (30s TTL) single-use WebSocket ticket from `POST /api/v1/ws/ticket`.
 * Never fails silently: logs explicit diagnostic details on non-OK HTTP responses (e.g., 404/500) or network errors.
 */
export async function requestWsTicket(
  apiBaseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ status: number; ticket: string | null; error?: string }> {
  const cleanBase = apiBaseUrl.replace(/\/+$/, "");
  const endpoint = `${cleanBase}/api/v1/ws/ticket`;
  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      if (res.status !== 401) {
        console.error(
          `[NotificationWS] Cấp vé kết nối WebSocket thất bại (${res.status} ${res.statusText || ""}) tại ${endpoint}. Sẽ tự động thử lại theo cơ chế Exponential Backoff.`
        );
      }
      return { status: res.status, ticket: null, error: `HTTP_${res.status}` };
    }
    const json = await res.json().catch(() => null);
    const ticket = json?.data?.ticket ?? json?.ticket ?? null;
    if (typeof ticket !== "string" || !ticket) {
      console.error(
        `[NotificationWS] Phản hồi từ ${endpoint} không chứa vé hợp lệ (ticket). Sẽ thử kết nối lại.`
      );
      return { status: res.status, ticket: null, error: "INVALID_TICKET_PAYLOAD" };
    }
    return { status: res.status, ticket };
  } catch (err) {
    console.error(`[NotificationWS] Lỗi mạng khi gọi ${endpoint}:`, err);
    return {
      status: 0,
      ticket: null,
      error: err instanceof Error ? err.message : "NETWORK_ERROR",
    };
  }
}

/**
 * Fetches missed notifications from `GET /api/v1/notifications?after_id=<maxLocalId>`.
 */
export async function fetchMissedNotifications(
  apiBaseUrl: string,
  accessToken: string,
  afterId: number,
  fetchImpl: typeof fetch = fetch
): Promise<NotificationItem[]> {
  const cleanBase = apiBaseUrl.replace(/\/+$/, "");
  const query = afterId > 0 ? `?after_id=${encodeURIComponent(String(afterId))}` : "";
  const res = await fetchImpl(`${cleanBase}/api/v1/notifications${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    return [];
  }
  const json = await res.json().catch(() => null);
  if (json?.success && Array.isArray(json.data)) {
    return json.data as NotificationItem[];
  }
  return [];
}

/**
 * Performs a silent JWT refresh against `POST /api/v1/auth/refresh`.
 */
export async function silentRefreshAccessToken(
  apiBaseUrl: string,
  refreshToken?: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!refreshToken) return null;
  const cleanBase = apiBaseUrl.replace(/\/+$/, "");
  try {
    const res = await fetchImpl(`${cleanBase}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const newToken = json?.data?.access_token ?? null;
    return typeof newToken === "string" && newToken.length > 0 ? newToken : null;
  } catch {
    return null;
  }
}

export interface UseNotificationWSOptions {
  token?: string | null;
  refreshToken?: string | null;
  apiBaseUrl: string;
  onNewNotification?: (item: NotificationItem) => void;
  onProfileStatusUpdated?: (payload: ProfileStatusUpdatedPayload) => void;
  onForceLogout?: (payload: ForceLogoutPayload) => void;
  onTokenRefreshed?: (newAccessToken: string) => void;
  refreshTokenFn?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  WebSocketImpl?: typeof WebSocket;
}

export function useNotificationWS({
  token,
  refreshToken,
  apiBaseUrl,
  onNewNotification,
  onProfileStatusUpdated,
  onForceLogout,
  onTokenRefreshed,
  refreshTokenFn,
  fetchImpl = typeof fetch !== "undefined" ? fetch : undefined,
  WebSocketImpl = typeof WebSocket !== "undefined" ? WebSocket : undefined,
}: UseNotificationWSOptions) {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeToken, setActiveToken] = React.useState<string | null>(token ?? null);
  const [latestProfileStatus, setLatestProfileStatus] =
    React.useState<ProfileStatusUpdatedPayload | null>(null);

  React.useEffect(() => {
    setActiveToken(token ?? null);
  }, [token]);

  const notificationsRef = React.useRef<NotificationItem[]>([]);
  React.useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const seenIdsRef = React.useRef<Set<number>>(new Set());
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffAttemptRef = React.useRef(0);
  const unmountedRef = React.useRef(false);

  const unreadCount = React.useMemo(
    () => notifications.reduce((acc, item) => (item.is_read ? acc : acc + 1), 0),
    [notifications]
  );

  const syncMissedMessages = React.useCallback(
    async (authToken: string) => {
      if (!authToken || !fetchImpl) return;
      const maxLocalId = getMaxNotificationId(notificationsRef.current);
      setIsLoading(true);
      try {
        const missed = await fetchMissedNotifications(
          apiBaseUrl,
          authToken,
          maxLocalId,
          fetchImpl
        );
        if (missed.length > 0) {
          setNotifications((prev) => {
            const { items } = mergeAndDedupeNotifications(prev, missed);
            for (const m of items) {
              seenIdsRef.current.add(m.id);
            }
            return items;
          });
        }
      } catch {
        // Ignore transient network errors during REST catch-up
      } finally {
        setIsLoading(false);
      }
    },
    [apiBaseUrl, fetchImpl]
  );

  const refreshNotifications = React.useCallback(async () => {
    if (!activeToken || !fetchImpl) return;
    setIsLoading(true);
    try {
      const list = await fetchMissedNotifications(apiBaseUrl, activeToken, 0, fetchImpl);
      setNotifications((prev) => {
        const { items } = mergeAndDedupeNotifications(prev, list);
        for (const m of items) {
          seenIdsRef.current.add(m.id);
        }
        return items;
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeToken, apiBaseUrl, fetchImpl]);

  const performSilentTokenRefresh = React.useCallback(async (): Promise<string | null> => {
    if (refreshTokenFn) {
      const customToken = await refreshTokenFn();
      if (customToken) {
        setActiveToken(customToken);
        onTokenRefreshed?.(customToken);
        return customToken;
      }
    }
    if (refreshToken && fetchImpl) {
      const refreshed = await silentRefreshAccessToken(apiBaseUrl, refreshToken, fetchImpl);
      if (refreshed) {
        setActiveToken(refreshed);
        onTokenRefreshed?.(refreshed);
        return refreshed;
      }
    }
    return null;
  }, [apiBaseUrl, fetchImpl, onTokenRefreshed, refreshToken, refreshTokenFn]);

  React.useEffect(() => {
    unmountedRef.current = false;

    if (!activeToken || !fetchImpl || !WebSocketImpl) {
      setIsConnected(false);
      return;
    }

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = (overrideToken?: string) => {
      if (unmountedRef.current) return;
      clearReconnectTimer();
      const attempt = backoffAttemptRef.current;
      const delay = calculateBackoffDelay(attempt);
      backoffAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(() => {
        void connect(overrideToken ?? activeToken);
      }, delay);
    };

    const connect = async (tokenToUse: string | null) => {
      if (unmountedRef.current || !tokenToUse) return;
      clearReconnectTimer();

      try {
        const ticketRes = await requestWsTicket(apiBaseUrl, tokenToUse, fetchImpl);
        if (unmountedRef.current) return;

        if (ticketRes.status === 401) {
          // Access token expired before ticket creation -> silent refresh then retry
          const refreshed = await performSilentTokenRefresh();
          if (refreshed) {
            scheduleReconnect(refreshed);
          }
          return;
        }

        if (!ticketRes.ticket) {
          const retryDelayMs = calculateBackoffDelay(backoffAttemptRef.current);
          console.error(
            `[NotificationWS] Không thể khởi tạo kết nối WebSocket (status=${ticketRes.status}, reason=${ticketRes.error ?? "unknown"}). Hẹn thử lại sau ${retryDelayMs}ms (lần thử #${backoffAttemptRef.current + 1}).`
          );
          scheduleReconnect(tokenToUse);
          return;
        }

        const wsUrl = buildTicketWebSocketUrl(apiBaseUrl, ticketRes.ticket);
        const socket = new WebSocketImpl(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (unmountedRef.current) return;
          backoffAttemptRef.current = 0;
          setIsConnected(true);
          // Phase 2.1: Immediately sync missed messages since <max_local_id>
          void syncMissedMessages(tokenToUse);
        };

        socket.onmessage = (msgEvent: MessageEvent) => {
          if (unmountedRef.current) return;
          try {
            const parsed = JSON.parse(String(msgEvent.data)) as WSNotificationEnvelope;
            const eventKind = parsed?.event || parsed?.type;
            const rawPayload = parsed?.data ?? parsed?.payload;

            if (eventKind === "FORCE_LOGOUT") {
              const forcePayload = (rawPayload ?? {}) as ForceLogoutPayload;
              unmountedRef.current = true;
              clearReconnectTimer();
              try {
                if (typeof window !== "undefined") {
                  window.localStorage?.clear();
                  window.sessionStorage?.clear();
                }
              } catch {
                // Ignore storage errors in restricted contexts
              }
              socket.close();
              onForceLogout?.(forcePayload);
              return;
            }

            if (eventKind === "PROFILE_STATUS_UPDATED" && rawPayload) {
              const statusPayload = rawPayload as ProfileStatusUpdatedPayload;
              if (statusPayload && typeof statusPayload.status === "string") {
                setLatestProfileStatus(statusPayload);
                onProfileStatusUpdated?.(statusPayload);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("hsk:profile-status-updated", { detail: statusPayload })
                  );
                }
              }
              return;
            }

            if (eventKind === "SHIFT_CHANGED" && rawPayload) {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("hsk:shift-changed", { detail: rawPayload })
                );
              }
              return;
            }

            if (eventKind === "NOTIFICATION_PAYLOAD" && rawPayload) {
              const incoming = rawPayload as NotificationItem;
              if (!incoming || typeof incoming.id !== "number") return;

              const isDuplicate = seenIdsRef.current.has(incoming.id);
              seenIdsRef.current.add(incoming.id);

              setNotifications((prev) => {
                const { items } = mergeAndDedupeNotifications(prev, incoming);
                return items;
              });

              if (!isDuplicate) {
                onNewNotification?.(incoming);
              }

              // Derive profile status update if notification is a profile review event
              if (
                incoming.type === "PROFILE_APPROVED" ||
                incoming.type === "PROFILE_REJECTED" ||
                incoming.type === "PROFILE_REOPENED"
              ) {
                const derivedStatus: ProfileStatusUpdatedPayload = {
                  status:
                    incoming.type === "PROFILE_APPROVED"
                      ? "verified"
                      : incoming.type === "PROFILE_REJECTED"
                        ? "rejected"
                        : "pending",
                  eligible: incoming.type === "PROFILE_APPROVED",
                  reason: incoming.content,
                };
                setLatestProfileStatus(derivedStatus);
                onProfileStatusUpdated?.(derivedStatus);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("hsk:profile-status-updated", { detail: derivedStatus })
                  );
                }
              }
            } else if (eventKind === "notification_read" && rawPayload) {
              // Phase 2.3: Multi-Tab Read Sync without refetching
              const readEvt = rawPayload as NotificationReadPayload;
              if (readEvt && typeof readEvt.id === "number") {
                setNotifications((prev) => applyNotificationReadSync(prev, readEvt.id));
              }
            }
          } catch {
            // Ignore malformed WS frames
          }
        };

        socket.onerror = () => {
          socket.close();
        };

        socket.onclose = async (closeEvent: CloseEvent) => {
          if (unmountedRef.current) return;
          setIsConnected(false);

          // Do not reconnect if session was terminated (4003) or evicted due to >5 tabs (4002)
          if (
            closeEvent?.code === WS_CLOSE_CODE_SESSION_TERMINATED ||
            closeEvent?.code === WS_CLOSE_CODE_MAX_CONN_EVICTED
          ) {
            return;
          }

          // Phase 2.4: Intercept 4001 (JWT Expired) -> silent refresh -> new ticket -> reconnect
          if (closeEvent?.code === WS_CLOSE_CODE_TOKEN_EXPIRED) {
            const refreshed = await performSilentTokenRefresh();
            if (refreshed) {
              scheduleReconnect(refreshed);
              return;
            }
          }

          scheduleReconnect(tokenToUse);
        };
      } catch (err) {
        console.error("[NotificationWS] Lỗi ngoại lệ trong chu trình kết nối WebSocket:", err);
        scheduleReconnect(tokenToUse);
      }
    };

    void connect(activeToken);

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [
    activeToken,
    apiBaseUrl,
    fetchImpl,
    WebSocketImpl,
    onNewNotification,
    onProfileStatusUpdated,
    onForceLogout,
    performSilentTokenRefresh,
    syncMissedMessages,
  ]);

  const markAsRead = React.useCallback(
    async (notificationId: number) => {
      let wasUnread = false;
      setNotifications((prev) =>
        prev.map((item) => {
          if (item.id === notificationId) {
            if (!item.is_read) {
              wasUnread = true;
            }
            return { ...item, is_read: true, status: "sent" };
          }
          return item;
        })
      );

      if (!activeToken || !wasUnread || !fetchImpl) {
        return;
      }

      try {
        const cleanBase = apiBaseUrl.replace(/\/+$/, "");
        const res = await fetchImpl(
          `${cleanBase}/api/v1/notifications/${notificationId}/read`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              Accept: "application/json",
            },
          }
        );
        if (!res.ok) {
          throw new Error("PATCH read failed");
        }
      } catch {
        // Rollback optimistic update if request failed
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, is_read: false } : item
          )
        );
      }
    },
    [activeToken, apiBaseUrl, fetchImpl]
  );

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    latestProfileStatus,
    markAsRead,
    refreshNotifications,
  };
}
