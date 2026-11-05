import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyNotificationReadSync,
  buildTicketWebSocketUrl,
  calculateBackoffDelay,
  fetchMissedNotifications,
  getMaxNotificationId,
  mergeAndDedupeNotifications,
  requestWsTicket,
  silentRefreshAccessToken,
} from "../use-notification-ws.ts";
import type { NotificationItem } from "../../types/notification.ts";

function makeItem(partial: Partial<NotificationItem> & { id: number }): NotificationItem {
  return {
    id: partial.id,
    user_id: partial.user_id ?? 42,
    role: partial.role ?? "candidate",
    type: partial.type ?? "PROFILE_REJECTED",
    title: partial.title ?? "Hồ sơ của bạn đã bị từ chối",
    content: partial.content ?? "Ảnh chân dung không hợp lệ",
    is_read: partial.is_read ?? false,
    created_at: partial.created_at ?? "2026-11-05T09:00:00Z",
  };
}

describe("useNotificationWS resilience helpers", () => {
  it("1. Deduplicates and orders out-of-order notifications using Map<id>", () => {
    const existing: NotificationItem[] = [
      makeItem({ id: 10, title: "Notif 10", is_read: true }),
      makeItem({ id: 5, title: "Notif 5", is_read: false }),
    ];

    const incoming: NotificationItem[] = [
      makeItem({ id: 8, title: "Out of order 8" }),
      makeItem({ id: 10, title: "Duplicate 10 with unread flag", is_read: false }),
      makeItem({ id: 12, title: "Newest 12" }),
    ];

    const { items, addedNew } = mergeAndDedupeNotifications(existing, incoming);

    // Must contain unique IDs sorted descending: [12, 10, 8, 5]
    assert.deepEqual(
      items.map((i) => i.id),
      [12, 10, 8, 5]
    );
    // Only 8 and 12 are genuinely new
    assert.deepEqual(
      addedNew.map((i) => i.id),
      [8, 12]
    );
    // ID 10 was already read in Tab A, so duplicate arrival must not revert is_read to false
    const item10 = items.find((i) => i.id === 10);
    assert.equal(item10?.is_read, true);
  });

  it("2. Multi-Tab Read Sync: marks item as read locally on notification_read event", () => {
    const initial: NotificationItem[] = [
      makeItem({ id: 21, is_read: false }),
      makeItem({ id: 20, is_read: false }),
    ];

    const updated = applyNotificationReadSync(initial, 21);
    assert.equal(updated[0].is_read, true);
    assert.equal(updated[1].is_read, false);

    // Unread count drops from 2 to 1 without refetching
    const unreadCount = updated.filter((n) => !n.is_read).length;
    assert.equal(unreadCount, 1);
  });

  it("3. Missed Message Sync (REST Fallback): dispatches GET /notifications?after_id=<max_local_id>", async () => {
    const localItems: NotificationItem[] = [
      makeItem({ id: 101 }),
      makeItem({ id: 105 }),
      makeItem({ id: 103 }),
    ];
    const maxLocalId = getMaxNotificationId(localItems);
    assert.equal(maxLocalId, 105);

    let requestedUrl = "";
    const mockFetch = (async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return new Response(
        JSON.stringify({
          success: true,
          data: [makeItem({ id: 106, title: "Missed during drop" })],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const missed = await fetchMissedNotifications(
      "http://localhost:8080",
      "jwt-token",
      maxLocalId,
      mockFetch
    );
    assert.equal(requestedUrl, "http://localhost:8080/api/v1/notifications?after_id=105");
    assert.equal(missed.length, 1);
    assert.equal(missed[0].id, 106);
  });

  it("4. Secure Ticket Handshake & Token Refresh on 4001 Close Code", async () => {
    const calls: string[] = [];
    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push(`${init?.method ?? "GET"} ${u}`);
      if (u.endsWith("/api/v1/auth/refresh")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { access_token: "new-fresh-jwt", expires_in: 86400 },
          }),
          { status: 200 }
        );
      }
      if (u.endsWith("/api/v1/ws/ticket")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: { ticket: "one-time-ticket-xyz", expires_in: 30 },
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;

    const refreshedJwt = await silentRefreshAccessToken(
      "http://localhost:8080",
      "refresh-token-123",
      mockFetch
    );
    assert.equal(refreshedJwt, "new-fresh-jwt");

    const ticketResult = await requestWsTicket(
      "http://localhost:8080",
      refreshedJwt!,
      mockFetch
    );
    assert.equal(ticketResult.ticket, "one-time-ticket-xyz");

    const wsUrl = buildTicketWebSocketUrl("http://localhost:8080", ticketResult.ticket!);
    assert.equal(wsUrl, "ws://localhost:8080/ws?ticket=one-time-ticket-xyz");
    assert.equal(wsUrl.includes("token="), false);

    // Verify exponential backoff bounds (1s -> 2s -> 4s -> ... -> max 30s)
    assert.equal(calculateBackoffDelay(0), 1000);
    assert.equal(calculateBackoffDelay(1), 2000);
    assert.equal(calculateBackoffDelay(2), 4000);
    assert.equal(calculateBackoffDelay(10), 30000);
  });

  it("5. Does NOT fail silently on 404 Not Found from POST /api/v1/ws/ticket — logs error and returns diagnostic status", async () => {
    const loggedErrors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      loggedErrors.push(args.map(String).join(" "));
    };

    try {
      const mock404Fetch = (async () =>
        new Response("404 page not found", {
          status: 404,
          statusText: "Not Found",
        })) as typeof fetch;

      const res = await requestWsTicket(
        "http://localhost:8080",
        "valid-jwt-token",
        mock404Fetch
      );
      assert.equal(res.status, 404);
      assert.equal(res.ticket, null);
      assert.equal(res.error, "HTTP_404");
      assert.equal(loggedErrors.length > 0, true);
      assert.equal(loggedErrors[0].includes("404"), true);
    } finally {
      console.error = origError;
    }
  });
});

