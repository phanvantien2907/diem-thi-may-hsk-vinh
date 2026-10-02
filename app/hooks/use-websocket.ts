import { useEffect, useRef } from 'react';

export interface WSEvent {
  type: 'registration_created' | 'registration_cancelled' | 'payment_confirmed' | 'seats_released' | 'seat_updated';
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
      return;
    }

    let isSubscribed = true;
    
    // Parse the base URL to construct the WS URL
    // e.g. http://localhost:8080 -> ws://localhost:8080/ws
    const wsUrlObj = new URL('/ws', url);
    wsUrlObj.protocol = wsUrlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrlObj.searchParams.set('token', token);
    
    const wsUrlString = wsUrlObj.toString();

    const connect = () => {
      if (!isSubscribed) return;
      
      const ws = new WebSocket(wsUrlString);
      wsRef.current = ws;

      ws.onopen = () => {
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
    };
  }, [enabled, token, url]);

  return {
    ws: wsRef.current,
  };
}
