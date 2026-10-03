import { useEffect, useRef, useState } from 'react';

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

interface UseWebSocketOptions {
  url: string;
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

    // Parse the base URL to construct the WS URL
    // e.g. http://localhost:8080 -> ws://localhost:8080/ws
    let wsUrlString = '';
    try {
      const wsUrlObj = new URL('/ws', url);
      wsUrlObj.protocol = wsUrlObj.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrlObj.searchParams.set('token', token);
      wsUrlString = wsUrlObj.toString();
    } catch {
      setStatus('disconnected');
      return;
    }

    const connect = () => {
      if (!isSubscribed) return;
      setStatus('connecting');

      const ws = new WebSocket(wsUrlString);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setStatus('connected');
        console.log("[WS] Connected");
        retryCountRef.current = 0; // Reset retry counter on success
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error("[WS] Error parsing message:", err);
        }
      };

      ws.onclose = () => {
        if (!isSubscribed) return;
        setStatus('disconnected');

        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          console.log(`[WS] Disconnected. Reconnecting in ${delay}ms...`);
          timeoutRef.current = setTimeout(connect, delay);
          retryCountRef.current++;
        } else {
          console.log("[WS] Max retries reached. Will not reconnect.");
        }
      };

      ws.onerror = (err) => {
        console.error("[WS] WebSocket error:", err);
      };
    };

    connect();

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
