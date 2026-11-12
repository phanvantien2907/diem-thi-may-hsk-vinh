import assert from "node:assert/strict";
import test from "node:test";

import {
  OCRScannerStore,
  buildOCRWebSocketUrl,
  normalizeOCRDateToISO,
  processOCRWebSocketFrame,
  requestGuestOrUserWsTicket,
  uploadOCRDocumentFile,
  inferGenderFromOCR,
  matchWardByName,
  type OCRResultData,
} from "../useOCRScanner.ts";
import {
  DEFAULT_VINH_WARDS,
  mergeStandardWardsFallback,
} from "../../lib/constants/locations.ts";

test("buildOCRWebSocketUrl builds ws URL for guest mode without ticket and with ticket", () => {
  assert.equal(
    buildOCRWebSocketUrl("http://localhost:8080", null, "task-123"),
    "ws://localhost:8080/ws?task_id=task-123"
  );

  assert.equal(
    buildOCRWebSocketUrl("https://api.example.com/api/v1", "guest_ticket_123"),
    "wss://api.example.com/api/v1/ws?ticket=guest_ticket_123"
  );
});

test("requestGuestOrUserWsTicket works in guest mode (token = null) without Authorization header", async () => {
  let capturedHeaders: Record<string, string> | undefined;

  const mockFetch: typeof fetch = async (_input, init) => {
    capturedHeaders = (init?.headers as Record<string, string>) ?? {};
    return new Response(
      JSON.stringify({
        success: true,
        data: { ticket: "guest-ws-ticket-abc", expires_in: 30 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const result = await requestGuestOrUserWsTicket(
    "http://localhost:8080",
    null,
    mockFetch
  );

  assert.equal(result.ticket, "guest-ws-ticket-abc");
  assert.equal(result.isGuest, true);
  assert.equal(result.status, 200);
  assert.equal(capturedHeaders?.Authorization, undefined);
});

test("requestGuestOrUserWsTicket gracefully falls back to ticket=null when guest ticket endpoint returns 401", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
    });
  };

  const result = await requestGuestOrUserWsTicket(
    "http://localhost:8080",
    null,
    mockFetch
  );

  assert.equal(result.ticket, null);
  assert.equal(result.isGuest, true);
  assert.equal(result.status, 401);
});

test("uploadOCRDocumentFile uploads CCCD/CMND image in guest mode without JWT token and returns task_id", async () => {
  let capturedAuthHeader: string | undefined;
  let capturedUrl = "";

  const mockFetch: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    const headers = (init?.headers as Record<string, string>) ?? {};
    capturedAuthHeader = headers.Authorization;
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          task_id: "550e8400-e29b-41d4-a716-446655440000",
          status: "QUEUED",
        },
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  };

  const dummyFile = new File(["dummy-image-bytes"], "cmnd_front.jpg", {
    type: "image/jpeg",
  });

  const result = await uploadOCRDocumentFile(
    "http://localhost:8080",
    dummyFile,
    null,
    mockFetch
  );

  assert.equal(capturedUrl, "http://localhost:8080/api/v1/cccd/upload");
  assert.equal(capturedAuthHeader, undefined);
  assert.equal(result.task_id, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(result.status, "QUEUED");
});

test("processOCRWebSocketFrame transitions store through QUEUED -> PROCESSING -> COMPLETED for 9-digit CMND and 12-digit CCCD", () => {
  const store = new OCRScannerStore();
  const completedPayloads: OCRResultData[] = [];

  // 1. Optimistic QUEUED state when guest drops file
  processOCRWebSocketFrame(
    JSON.stringify({
      event: "ocr_progress",
      data: {
        task_id: "task-9-digit",
        status: "QUEUED",
        progress: 15,
      },
    }),
    store,
    "task-9-digit",
    (data) => completedPayloads.push(data)
  );
  assert.equal(store.getSnapshot().status, "QUEUED");
  assert.equal(store.getSnapshot().progress, 15);

  // 2. PROCESSING event
  processOCRWebSocketFrame(
    JSON.stringify({
      event: "ocr_progress",
      data: {
        task_id: "task-9-digit",
        status: "PROCESSING",
        progress: 65,
      },
    }),
    store,
    "task-9-digit",
    (data) => completedPayloads.push(data)
  );
  assert.equal(store.getSnapshot().status, "PROCESSING");
  assert.equal(store.getSnapshot().progress, 65);

  // 3. COMPLETED event with 9-digit CMND
  processOCRWebSocketFrame(
    JSON.stringify({
      event: "ocr_completed",
      data: {
        task_id: "task-9-digit",
        status: "COMPLETED",
        progress: 100,
        data: {
          id_number: "187654321",
          full_name: "PHAN VĂN TIẾN",
          dob: "29/07/2001",
          address: "TP. Vinh, Nghệ An",
        },
      },
    }),
    store,
    "task-9-digit",
    (data) => completedPayloads.push(data)
  );

  assert.equal(store.getSnapshot().status, "COMPLETED");
  assert.equal(store.getSnapshot().progress, 100);
  assert.equal(store.getSnapshot().data?.id_number, "187654321");
  assert.equal(completedPayloads.length, 1);
  assert.equal(completedPayloads[0]?.id_number, "187654321");
  assert.equal(normalizeOCRDateToISO(completedPayloads[0]?.dob ?? ""), "2001-07-29");

  // 4. COMPLETED event with 12-digit CCCD
  processOCRWebSocketFrame(
    JSON.stringify({
      event: "ocr_completed",
      data: {
        task_id: "task-12-digit",
        status: "COMPLETED",
        progress: 100,
        data: {
          id_number: "038099012345",
          full_name: "NGUYỄN VĂN A",
          dob: "15/08/1999",
          address: "Hà Nội",
        },
      },
    }),
    store,
    "task-12-digit",
    (data) => completedPayloads.push(data)
  );

  assert.equal(store.getSnapshot().data?.id_number, "038099012345");
  assert.equal(completedPayloads.length, 2);
});

test("inferGenderFromOCR strictly returns undefined for 9-digit CMND and correctly parses 12-digit CCCD gender", () => {
  // 9-digit CMND physically has NO gender on card -> MUST return undefined
  assert.equal(inferGenderFromOCR(undefined, "188020231"), undefined);
  assert.equal(inferGenderFromOCR(null, "187654321"), undefined);
  assert.equal(inferGenderFromOCR("", "187654321"), undefined);
  assert.equal(inferGenderFromOCR("nam", "187654321"), undefined); // 9-digit safeguard: never infer
  assert.equal(inferGenderFromOCR("nu", "187654321"), undefined);

  // 12-digit CCCD with explicit sex text
  assert.equal(inferGenderFromOCR("Nam", "038090012345"), "male");
  assert.equal(inferGenderFromOCR("NỮ", "038195012345"), "female");
  assert.equal(inferGenderFromOCR("male", "038090012345"), "male");
  assert.equal(inferGenderFromOCR("female", "038195012345"), "female");

  // 12-digit CCCD fallback via 4th digit (0/2/4/6/8 = male, 1/3/5/7/9 = female)
  assert.equal(inferGenderFromOCR(undefined, "038090012345"), "male");
  assert.equal(inferGenderFromOCR(undefined, "038290012345"), "male");
  assert.equal(inferGenderFromOCR(undefined, "038195012345"), "female");
  assert.equal(inferGenderFromOCR(undefined, "038395012345"), "female");
});

test("matchWardByName finds all standard Vinh wards including Phường Hà Huy Tập and Phường Hưng Dũng", () => {
  // Test "P. Hà Huy Tập"
  const haHuyTap = matchWardByName(DEFAULT_VINH_WARDS, "P. Hà Huy Tập");
  assert.ok(haHuyTap, "Phường Hà Huy Tập should be found");
  assert.equal(haHuyTap?.name, "Phường Hà Huy Tập");

  // Test "Phường Hưng Dũng"
  const hungDung = matchWardByName(DEFAULT_VINH_WARDS, "Phường Hưng Dũng");
  assert.ok(hungDung, "Phường Hưng Dũng should be found");
  assert.equal(hungDung?.name, "Phường Hưng Dũng");

  // Test "Quán Bàu" (suffix match)
  const quanBau = matchWardByName(DEFAULT_VINH_WARDS, "Quán Bàu");
  assert.ok(quanBau, "Phường Quán Bàu should be found");
  assert.equal(quanBau?.name, "Phường Quán Bàu");

  // Test fullAddress fallback: "Số 12 Lê Lợi, P. Hà Huy Tập, TP. Vinh, Nghệ An"
  const fromFullAddress = matchWardByName(
    DEFAULT_VINH_WARDS,
    undefined,
    "Số 12 Lê Lợi, P. Hà Huy Tập, TP. Vinh, Nghệ An"
  );
  assert.ok(fromFullAddress, "Should match from full address string");
  assert.equal(fromFullAddress?.name, "Phường Hà Huy Tập");

  // Test mergeStandardWardsFallback adds missing wards if API only returned 8 wards
  const initial8Wards = DEFAULT_VINH_WARDS.slice(0, 8);
  const provinces = [{ id: 6, code: "NA", name: "Nghệ An" }];
  const merged = mergeStandardWardsFallback(initial8Wards, "6", provinces);
  assert.equal(merged.length, 25);
  assert.ok(merged.some((w) => w.name === "Phường Hà Huy Tập"));
  assert.ok(merged.some((w) => w.name === "Phường Hưng Dũng"));
});
