import { useEffect, useRef, useState } from 'react';
import {
  buildTicketWebSocketUrl,
  requestWsTicket,
} from './use-notification-ws';

export interface WSEvent {
  type:
    | 'registration_created'
    | 'registration_cancelled'
    | 'payment_confirmed'
    | 'seats_released'
    | 'seat_updated'
    | 'dashboard_metrics_updated'
    | 'account_updated'
    | string;
  payload: any;
  timestamp: string;
}

/**
 * SECURITY: `token` is the raw JWT used ONLY to request a one-time WS ticket
 * via `POST /api/v1/ws/ticket`. The raw JWT is NEVER placed in the WebSocket URL.
 * The final WS connection uses `?ticket=<short-lived-30s-ticket>` instead.
 */
interface UseWebSocketOptions {
  url: string;
  /** Raw JWT access token — used to fetch a one-time ticket, NOT appended to WS URL. */
  token?: string | null;
  onMessage?: (event: WSEvent) => void;
  enabled?: boolean;
}

export function useWebSocket({ url, token, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 10;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Update the ref when onMessage changes so we don't need to re-connect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
      return;
    }

    let isSubscribed = true;
    setStatus('connecting');

    const connect = async () => {
      if (!isSubscribed) return;
      setStatus('connecting');

      // Step 1: Obtain a one-time 30s ticket from the backend.
      // This avoids leaking the raw JWT in WebSocket upgrade URL logs.
      const ticketRes = await requestWsTicket(url, token);
      if (!isSubscribed) return;

      if (!ticketRes.ticket) {
        // Ticket fetch failed (401, 500, network error) — schedule exponential backoff retry
        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          console.warn(
            `[WS] Không thể lấy vé kết nối (${ticketRes.error ?? 'unknown'}). Thử lại sau ${delay}ms...`
          );
          timeoutRef.current = setTimeout(() => { void connect(); }, delay);
          retryCountRef.current++;
        } else {
          console.error('[WS] Đã vượt quá số lần thử tối đa. Dừng kết nối lại.');
          setStatus('disconnected');
        }
        return;
      }

      // Step 2: Use the short-lived ticket in the WS URL — NEVER the raw JWT.
      const wsUrl = buildTicketWebSocketUrl(url, ticketRes.ticket);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setStatus('connected');
        console.log('[WS] Connected via ticket handshake');
        retryCountRef.current = 0; // Reset retry counter on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        if (!isSubscribed) return;
        setStatus('disconnected');

        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          console.log(`[WS] Disconnected. Reconnecting in ${delay}ms...`);
          timeoutRef.current = setTimeout(() => { void connect(); }, delay);
          retryCountRef.current++;
        } else {
          console.log('[WS] Max retries reached. Will not reconnect.');
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] WebSocket error:', err);
      };
    };

    void connect();

    return () => {
      isSubscribed = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [enabled, token, url]);

  return {
    ws: wsRef.current,
    status,
    isConnected: status === 'connected',
  };
}
