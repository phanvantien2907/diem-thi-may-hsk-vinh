import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { buildTicketWebSocketUrl } from "./use-notification-ws.ts";

export type OCRStatus = "IDLE" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

/**
 * Purely textual OCR result payload (Zero Biometrics / No Face Matching).
 * Supports both legacy 9-digit CMND and modern 12-digit CCCD.
 */
export interface OCRResultData {
  side?: "front" | "back";
  id_number: string;
  full_name: string;
  dob: string;
  gender?: string | null;
  sex?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  nationality?: string | null;
  address?: string;
  address_province?: string;
  address_district?: string;
  address_ward?: string;
  address_detail?: string;
  home_town?: string;
  issue_date?: string;
  place_of_issue?: string;
  expiry_date?: string;
}

/**
 * Normalizes and matches an extracted `ethnicity` string against canonical Vietnamese
 * ethnic group options (`ETHNICITIES`), stripping accidental prefixes such as `"Dân tộc: "`.
 */
export function sanitizeOCREthnicity(
  raw?: string | null,
  options: ReadonlyArray<{ value: string; label: string }> = []
): string {
  if (!raw) return "";
  const stripped = raw
    .replace(/^(dân\s*tộc|dan\s*toc|ethnicity)\s*[:.\-]?\s*/i, "")
    .trim();
  if (!stripped) return "";

  const fold = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/['’\-_\s]+/g, " ")
      .trim();

  const targetFolded = fold(stripped);
  if (
    !targetFolded ||
    targetFolded === "null" ||
    targetFolded === "n/a" ||
    targetFolded === "na"
  ) {
    return "";
  }

  for (const opt of options) {
    if (fold(opt.value) === targetFolded || fold(opt.label) === targetFolded) {
      return opt.value;
    }
  }

  return stripped
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes an extracted `religion` string, stripping prefixes such as `"Tôn giáo: "`
 * and canonicalizing `"Không"` / `"Phật giáo"` / `"Công giáo"`.
 */
export function sanitizeOCRReligion(raw?: string | null): string {
  if (!raw) return "";
  const stripped = raw
    .replace(/^(tôn\s*giáo|ton\s*giao|religion)\s*[:.\-]?\s*/i, "")
    .trim();
  if (!stripped) return "";

  const folded = stripped
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

  if (!folded || folded === "null" || folded === "n/a" || folded === "na") {
    return "";
  }
  if (folded === "khong" || folded === "none" || folded === "khong co") {
    return "Không";
  }
  if (folded === "phat giao" || folded === "phat") return "Phật giáo";
  if (folded === "cong giao" || folded === "thien chua giao") return "Công giáo";
  if (folded === "tin lanh") return "Tin Lành";
  if (folded === "cao dai") return "Cao Đài";
  if (folded === "hoa hao") return "Hòa Hảo";

  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Sanitizes and normalizes an incoming `OCRResultData` payload before hydrating forms.
 */
export function sanitizeOCRPayload(
  raw: Partial<OCRResultData> | null | undefined,
  defaultSide: "front" | "back" = "front"
): OCRResultData | null {
  if (!raw) return null;
  const cleanId = (raw.id_number ?? "")
    .replace(/^(số|so|id|no)\s*[:.\-]?\s*/i, "")
    .trim();
  const cleanName = (raw.full_name ?? "")
    .replace(/^(họ\s*và\s*tên|họ\s*tên|full\s*name)\s*[:.\-]?\s*/i, "")
    .trim();
  const cleanGenderRaw = (raw.gender ?? raw.sex ?? "")
    .replace(/^(giới\s*tính|gioi\s*tinh|sex|gender)\s*[:.\-]?\s*/i, "")
    .trim();

  return {
    ...raw,
    side: raw.side ?? defaultSide,
    id_number: cleanId,
    full_name: cleanName,
    dob: (raw.dob ?? "").trim(),
    gender: cleanGenderRaw || null,
    sex: cleanGenderRaw || null,
    ethnicity: sanitizeOCREthnicity(raw.ethnicity),
    religion: sanitizeOCRReligion(raw.religion),
    nationality: (raw.nationality ?? "")
      .replace(/^(quốc\s*tịch|quoc\s*tich|nationality)\s*[:.\-]?\s*/i, "")
      .trim(),
    address: (raw.address ?? "").trim(),
    address_province: (raw.address_province ?? "").trim(),
    address_district: (raw.address_district ?? "").trim(),
    address_ward: (raw.address_ward ?? "").trim(),
    address_detail: (raw.address_detail ?? "").trim(),
    home_town: (raw.home_town ?? "").trim(),
    issue_date: (raw.issue_date ?? "").trim(),
    place_of_issue: (raw.place_of_issue ?? "").trim(),
    expiry_date: (raw.expiry_date ?? "").trim(),
  };
}

/**
 * Strips Vietnamese diacritics, administrative prefixes ("Tỉnh", "Thành phố", "TP.",
 * "Phường", "P.", "Xã", "X.", "Thị trấn", "TT.", "Quận", "Huyện"), and punctuation
 * for robust fuzzy matching against location dropdown options.
 */
export function normalizeAdminUnitName(
  raw?: string | null,
  unitType: "province" | "ward" | "district" = "ward"
): string {
  if (!raw) return "";
  let s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[.,\-_/()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (unitType === "province") {
    s = s.replace(/^(tinh|thanh pho|tp|t)\s+/i, "").trim();
  } else if (unitType === "ward") {
    s = s.replace(/^(phuong|xa|thi tran|p|x|tt)\s+/i, "").trim();
  } else if (unitType === "district") {
    s = s
      .replace(/^(quan|huyen|thi xa|thanh pho|tp|tx|q|h)\s+/i, "")
      .trim();
  }

  // Normalize leading zeros in numbered wards (e.g. "01" -> "1")
  s = s.replace(/\b0+(\d+)\b/g, "$1");
  return s;
}

export function splitVietnameseAddressClientFallback(fullAddress?: string | null): {
  province: string;
  district: string;
  ward: string;
  detail: string;
} {
  if (!fullAddress) {
    return { province: "", district: "", ward: "", detail: "" };
  }
  const parts = fullAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const n = parts.length;
  if (n === 0) return { province: "", district: "", ward: "", detail: "" };
  if (n === 1) return { province: parts[0], district: "", ward: "", detail: "" };
  if (n === 2) {
    return { province: parts[1], district: "", ward: parts[0], detail: "" };
  }
  if (n === 3) {
    return {
      province: parts[2],
      district: parts[1],
      ward: parts[0],
      detail: "",
    };
  }
  return {
    province: parts[n - 1],
    district: parts[n - 2],
    ward: parts[n - 3],
    detail: parts.slice(0, n - 3).join(", "),
  };
}

/**
 * Matches an extracted `address_province` (or full address tail) against the list of Provinces.
 */
export function matchProvinceByName<T extends { id: number; name: string }>(
  provinces: T[],
  rawProvince?: string | null,
  fullAddress?: string | null
): T | undefined {
  if (!provinces || provinces.length === 0) return undefined;
  const fallback = splitVietnameseAddressClientFallback(fullAddress);
  const candidateRaw = (rawProvince || fallback.province || "").trim();
  const targetNorm = normalizeAdminUnitName(candidateRaw, "province");
  if (!targetNorm) return undefined;

  // 1. Exact normalized match
  const exact = provinces.find(
    (p) => normalizeAdminUnitName(p.name, "province") === targetNorm
  );
  if (exact) return exact;

  // 2. Substring / suffix match
  return provinces.find((p) => {
    const pNorm = normalizeAdminUnitName(p.name, "province");
    return (
      pNorm.length > 0 &&
      (pNorm.includes(targetNorm) || targetNorm.includes(pNorm))
    );
  });
}

/**
 * Matches an extracted `address_ward` (or comma-separated segments of `fullAddress`)
 * against the loaded list of Wards for the selected Province.
 */
export function matchWardByName<T extends { id: number; name: string }>(
  wards: T[],
  rawWard?: string | null,
  fullAddress?: string | null
): T | undefined {
  if (!wards || wards.length === 0) return undefined;
  const fallback = splitVietnameseAddressClientFallback(fullAddress);
  const candidates: string[] = [];
  if (rawWard && rawWard.trim()) {
    candidates.push(rawWard.trim());
  }
  if (fallback.ward && !candidates.includes(fallback.ward)) {
    candidates.push(fallback.ward);
  }
  if (fullAddress) {
    const segments = fullAddress
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const seg of segments) {
      if (!candidates.includes(seg)) {
        candidates.push(seg);
      }
    }
  }

  const normalizedCandidates = candidates
    .map((c) => normalizeAdminUnitName(c, "ward"))
    .filter(Boolean);

  if (normalizedCandidates.length === 0) return undefined;

  // 1. Exact normalized match on any candidate (in priority order)
  for (const candNorm of normalizedCandidates) {
    const exact = wards.find(
      (w) => normalizeAdminUnitName(w.name, "ward") === candNorm
    );
    if (exact) return exact;
  }

  // 2. Word-boundary / substring match on primary ward candidate
  const primaryNorm = normalizedCandidates[0];
  return wards.find((w) => {
    const wNorm = normalizeAdminUnitName(w.name, "ward");
    return (
      wNorm.length > 1 &&
      (wNorm === primaryNorm ||
        wNorm.endsWith(` ${primaryNorm}`) ||
        primaryNorm.endsWith(` ${wNorm}`))
    );
  });
}

/**
 * Infers candidate gender ("male" | "female") from OCR `sex` ("Nam" / "Nữ")
 * or falls back to the 4th digit of a 12-digit Vietnamese CCCD number
 * (even digit = male, odd digit = female).
 *
 * CRITICAL LOGIC FIX:
 * Legacy 9-digit CMNDs physically DO NOT have a gender field printed on them.
 * Under no circumstances may gender be inferred or hallucinated for a 9-digit ID.
 */
export function inferGenderFromOCR(
  rawSex?: string | null,
  idNumber?: string | null
): "male" | "female" | undefined {
  const cleanId = (idNumber ?? "").trim();
  // 9-digit CMND physically has NO gender on card. Never infer or hallucinate.
  if (/^\d{9}$/.test(cleanId)) {
    return undefined;
  }

  if (rawSex) {
    const normalized = rawSex
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
    if (normalized === "nam" || normalized === "male" || normalized === "m") {
      return "male";
    }
    if (normalized === "nu" || normalized === "female" || normalized === "f") {
      return "female";
    }
  }

  // Older 12-digit barcode CCCDs (2014) or chip cards: derive from 4th digit if rawSex was omitted
  if (/^\d{12}$/.test(cleanId)) {
    const genderDigit = Number(cleanId[3]);
    if (!Number.isNaN(genderDigit)) {
      return genderDigit % 2 === 0 ? "male" : "female";
    }
  }
  return undefined;
}

const OCR_CLIENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const ocrTaskResultCache = new Map<
  string,
  { data: OCRResultData; timestamp: number }
>();
const ocrFileFingerprintToTask = new Map<
  string,
  { task_id: string; timestamp: number }
>();
const ocrInflightFileUploads = new Map<
  string,
  Promise<{ task_id: string; status: OCRStatus }>
>();

export function getOCRFileFingerprint(
  file: File | Blob,
  side: "front" | "back" = "front"
): string {
  if (typeof File !== "undefined" && file instanceof File) {
    return `${side}:${file.name}:${file.size}:${file.lastModified}:${file.type}`;
  }
  return `${side}:blob:${file.size}:${file.type}`;
}

export function getCachedOCRResultByTaskId(taskId: string): OCRResultData | null {
  const entry = ocrTaskResultCache.get(taskId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > OCR_CLIENT_CACHE_TTL_MS) {
    ocrTaskResultCache.delete(taskId);
    return null;
  }
  return entry.data;
}

export interface OCRScannerSnapshot {
  task_id: string | null;
  status: OCRStatus;
  progress: number;
  data: OCRResultData | null;
  error: string | null;
  is_connected: boolean;
}

export interface UseOCRScannerOptions {
  /** Base HTTP API URL, e.g. "http://localhost:8080" */
  apiBaseUrl: string;
  /** Optional JWT Access Token. Null/undefined operates in Guest-First Mode. */
  token?: string | null;
  /** Fired immediately when `ocr_completed` arrives for the active `task_id` */
  onCompleted?: (data: OCRResultData, taskId: string) => void;
  /** Fired immediately when `ocr_failed` arrives for the active `task_id` */
  onFailed?: (errorMessage: string, taskId: string) => void;
  /** Custom fetch implementation for unit testing */
  fetchImpl?: typeof fetch;
  /** Custom WebSocket constructor for unit testing */
  WebSocketImpl?: typeof WebSocket;
}

/**
 * External store isolating high-frequency WebSocket progress updates from React's
 * parent component tree so form pages never suffer full-page re-renders.
 */
export class OCRScannerStore {
  private state: OCRScannerSnapshot = {
    task_id: null,
    status: "IDLE",
    progress: 0,
    data: null,
    error: null,
    is_connected: false,
  };

  private listeners = new Set<() => void>();

  getSnapshot = (): OCRScannerSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setState(partial: Partial<OCRScannerSnapshot>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * Normalizes DD/MM/YYYY or DD-MM-YYYY strings from OCR into YYYY-MM-DD for `<input type="date">`.
 */
export function normalizeOCRDateToISO(rawDate?: string | null): string {
  if (!rawDate) return "";
  const trimmed = rawDate.trim();
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (!match) {
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
  }
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

/**
 * Requests a one-time WebSocket ticket supporting BOTH Authenticated Mode (with JWT)
 * and Guest-First Mode (unauthenticated registration flow).
 */
export async function requestGuestOrUserWsTicket(
  apiBaseUrl: string,
  accessToken?: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<{ status: number; ticket: string | null; isGuest: boolean; error?: string }> {
  const cleanBase = apiBaseUrl.replace(/\/+$/, "");
  const endpoint = cleanBase.endsWith("/api/v1")
    ? `${cleanBase}/ws/ticket`
    : `${cleanBase}/api/v1/ws/ticket`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const isGuest = !accessToken;
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(isGuest ? { guest: true } : {}),
    });

    if (!res.ok) {
      return {
        status: res.status,
        ticket: null,
        isGuest,
        error: `HTTP_${res.status}`,
      };
    }

    const json = await res.json().catch(() => null);
    const ticket = json?.data?.ticket ?? json?.ticket ?? null;
    if (typeof ticket !== "string" || !ticket) {
      return {
        status: res.status,
        ticket: null,
        isGuest,
        error: "INVALID_TICKET_PAYLOAD",
      };
    }

    return { status: res.status, ticket, isGuest };
  } catch (err) {
    return {
      status: 0,
      ticket: null,
      isGuest,
      error: err instanceof Error ? err.message : "NETWORK_ERROR",
    };
  }
}

/**
 * Builds the WebSocket URL for either a one-time ticket (`?ticket=...`) or
 * a guest-mode task subscription (`?task_id=...`).
 */
export function buildOCRWebSocketUrl(
  apiBaseUrl: string,
  ticket?: string | null,
  taskId?: string | null
): string {
  if (ticket) {
    return buildTicketWebSocketUrl(apiBaseUrl, ticket);
  }
  const cleanBase = apiBaseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  const wsBase = cleanBase.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : "";
  return `${wsBase}/ws${query}`;
}

/**
 * Uploads an ID card image (`multipart/form-data`) to `POST /api/v1/cccd/upload`
 * in either Guest Mode (`token = null`) or Authenticated Mode.
 */
export async function uploadOCRDocumentFile(
  apiBaseUrl: string,
  file: File | Blob,
  token?: string | null,
  fetchImpl: typeof fetch = fetch,
  side: "front" | "back" = "front"
): Promise<{ task_id: string; status: OCRStatus }> {
  const isDefaultFetch = fetchImpl === fetch;
  const fingerprint = getOCRFileFingerprint(file, side);

  if (isDefaultFetch) {
    // 1. Check if identical file already has a completed OCR result cached in memory (saves Gemini API tokens)
    const cachedTask = ocrFileFingerprintToTask.get(fingerprint);
    if (
      cachedTask &&
      Date.now() - cachedTask.timestamp <= OCR_CLIENT_CACHE_TTL_MS &&
      getCachedOCRResultByTaskId(cachedTask.task_id)
    ) {
      return {
        task_id: cachedTask.task_id,
        status: "COMPLETED",
      };
    }

    // 2. Deduplicate concurrent in-flight uploads of the exact same file
    const inflight = ocrInflightFileUploads.get(fingerprint);
    if (inflight) {
      return inflight;
    }
  }

  const doUpload = async (): Promise<{ task_id: string; status: OCRStatus }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("side", side);

    const cleanBase = apiBaseUrl.replace(/\/+$/, "");
    const endpoint = cleanBase.endsWith("/api/v1")
      ? `${cleanBase}/cccd/upload`
      : `${cleanBase}/api/v1/cccd/upload`;

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: formData,
      });
    } catch {
      throw new Error(
        "Mất kết nối mạng khi tải ảnh CMND/CCCD. Vui lòng kiểm tra kết nối Internet và thử lại."
      );
    }

    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !body?.data?.task_id) {
      throw new Error(
        body?.error ||
          body?.msg ||
          body?.message ||
          "Tải ảnh CMND/CCCD lên thất bại."
      );
    }

    const taskId = String(body.data.task_id);
    if (isDefaultFetch) {
      ocrFileFingerprintToTask.set(fingerprint, {
        task_id: taskId,
        timestamp: Date.now(),
      });
    }

    return {
      task_id: taskId,
      status: (body.data.status as OCRStatus) ?? "QUEUED",
    };
  };

  if (!isDefaultFetch) {
    return doUpload();
  }

  const uploadPromise = doUpload().finally(() => {
    ocrInflightFileUploads.delete(fingerprint);
  });
  ocrInflightFileUploads.set(fingerprint, uploadPromise);
  return uploadPromise;
}

/**
 * Pure frame parser that processes a raw WebSocket JSON message and updates the store
 * if the message matches the active `task_id`.
 */
export function processOCRWebSocketFrame(
  rawMessage: string,
  store: OCRScannerStore,
  activeTaskId: string | null,
  onCompleted?: (data: OCRResultData, taskId: string) => void,
  onFailed?: (errorMessage: string, taskId: string) => void
): boolean {
  try {
    const raw = JSON.parse(rawMessage);
    const eventType: string | undefined = raw?.event || raw?.type;
    if (
      eventType !== "ocr_progress" &&
      eventType !== "ocr_completed" &&
      eventType !== "ocr_back_completed" &&
      eventType !== "ocr_failed"
    ) {
      return false;
    }

    const inner = raw?.data ?? raw?.payload ?? raw;
    const incomingTaskId: string | undefined = inner?.task_id ?? raw?.task_id;

    if (activeTaskId && incomingTaskId && incomingTaskId !== activeTaskId) {
      return false;
    }

    const resolvedTaskId = incomingTaskId ?? activeTaskId ?? "";

    if (eventType === "ocr_progress") {
      store.setState({
        task_id: resolvedTaskId || null,
        status: (inner?.status as OCRStatus) ?? "PROCESSING",
        progress: typeof inner?.progress === "number" ? inner.progress : 50,
        error: null,
      });
      return true;
    }

    if (eventType === "ocr_completed" || eventType === "ocr_back_completed") {
      const rawExtracted: OCRResultData | null = inner?.data ?? null;
      console.log("OCR_PAYLOAD_RECEIVED", rawExtracted);
      const extracted = sanitizeOCRPayload(
        rawExtracted,
        eventType === "ocr_back_completed" ? "back" : "front"
      );
      if (extracted && resolvedTaskId) {
        ocrTaskResultCache.set(resolvedTaskId, {
          data: extracted,
          timestamp: Date.now(),
        });
      }
      store.setState({
        task_id: resolvedTaskId || null,
        status: "COMPLETED",
        progress: 100,
        data: extracted,
        error: null,
      });

      if (extracted && onCompleted) {
        onCompleted(extracted, resolvedTaskId);
      }
      return true;
    }

    if (eventType === "ocr_failed") {
      const errMsg: string =
        inner?.error ??
        raw?.error ??
        "Không thể trích xuất văn bản từ ảnh CMND/CCCD.";
      store.setState({
        task_id: resolvedTaskId || null,
        status: "FAILED",
        progress: 0,
        error: errMsg,
      });

      if (onFailed) {
        onFailed(errMsg, resolvedTaskId);
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function useOCRScanner({
  apiBaseUrl,
  token,
  onCompleted,
  onFailed,
  fetchImpl = typeof fetch !== "undefined" ? fetch : undefined,
  WebSocketImpl = typeof WebSocket !== "undefined" ? WebSocket : undefined,
}: UseOCRScannerOptions) {
  const storeRef = useRef<OCRScannerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new OCRScannerStore();
  }
  const store = storeRef.current;

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTaskIdRef = useRef<string | null>(null);
  const completedTaskIdsRef = useRef<Set<string>>(new Set());
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  }, [onCompleted, onFailed]);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  const handleTaskCompletedOnce = useCallback(
    (data: OCRResultData, taskId: string) => {
      stopPolling();
      if (taskId && completedTaskIdsRef.current.has(taskId)) {
        return;
      }
      if (taskId) {
        completedTaskIdsRef.current.add(taskId);
      }
      onCompletedRef.current?.(data, taskId);
    },
    [stopPolling]
  );

  const handleTaskFailedOnce = useCallback(
    (errMsg: string, taskId: string) => {
      stopPolling();
      if (taskId && completedTaskIdsRef.current.has(taskId)) {
        return;
      }
      if (taskId) {
        completedTaskIdsRef.current.add(taskId);
      }
      onFailedRef.current?.(errMsg, taskId);
    },
    [stopPolling]
  );

  const startFallbackPolling = useCallback(
    (taskId: string) => {
      stopPolling();
      if (!fetchImpl || !taskId) return;

      const cleanBase = apiBaseUrl.replace(/\/+$/, "");
      const endpoint = cleanBase.endsWith("/api/v1")
        ? `${cleanBase}/cccd/jobs/${encodeURIComponent(taskId)}`
        : `${cleanBase}/api/v1/cccd/jobs/${encodeURIComponent(taskId)}`;

      let attempts = 0;
      const maxAttempts = 22; // ~55s total fallback window

      pollTimerRef.current = setInterval(async () => {
        if (activeTaskIdRef.current !== taskId) {
          stopPolling();
          return;
        }
        const currentStatus = store.getSnapshot().status;
        if (currentStatus === "COMPLETED" || currentStatus === "FAILED") {
          stopPolling();
          return;
        }

        attempts += 1;
        if (attempts > maxAttempts) {
          stopPolling();
          const timeoutMsg =
            "Quá thời gian chờ phản hồi từ dịch vụ đọc giấy tờ. Vui lòng kiểm tra mạng và thử lại.";
          store.setState({
            task_id: taskId,
            status: "FAILED",
            progress: 0,
            error: timeoutMsg,
          });
          handleTaskFailedOnce(timeoutMsg, taskId);
          return;
        }

        try {
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          const res = await fetchImpl(endpoint, { method: "GET", headers });
          if (!res.ok) return;
          const body = await res.json().catch(() => null);
          const payload = body?.data;
          if (!payload) return;

          if (
            payload.event === "ocr_completed" ||
            payload.event === "ocr_back_completed" ||
            payload.status === "COMPLETED"
          ) {
            const rawExtracted: OCRResultData | null = payload.data ?? null;
            console.log("OCR_PAYLOAD_RECEIVED", rawExtracted);
            const extracted = sanitizeOCRPayload(
              rawExtracted,
              payload.event === "ocr_back_completed" || payload.side === "back"
                ? "back"
                : "front"
            );
            if (extracted) {
              ocrTaskResultCache.set(taskId, {
                data: extracted,
                timestamp: Date.now(),
              });
              store.setState({
                task_id: taskId,
                status: "COMPLETED",
                progress: 100,
                data: extracted,
                error: null,
              });
              handleTaskCompletedOnce(extracted, taskId);
            }
          } else if (payload.event === "ocr_failed" || payload.status === "FAILED") {
            const errMsg =
              payload.error || "Không thể trích xuất văn bản từ ảnh CMND/CCCD.";
            store.setState({
              task_id: taskId,
              status: "FAILED",
              progress: 0,
              error: errMsg,
            });
            handleTaskFailedOnce(errMsg, taskId);
          }
        } catch {
          // Ignore transient network errors during background poll; next tick will retry
        }
      }, 2500);
    },
    [
      apiBaseUrl,
      fetchImpl,
      handleTaskCompletedOnce,
      handleTaskFailedOnce,
      stopPolling,
      store,
      token,
    ]
  );

  const ensureWebSocketConnected = useCallback(
    async (taskId?: string | null) => {
      if (!WebSocketImpl || !fetchImpl) {
        return;
      }
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocketImpl.OPEN ||
          wsRef.current.readyState === WebSocketImpl.CONNECTING)
      ) {
        return;
      }

      // Request ticket in either Guest Mode (token = null) or Authenticated Mode
      const ticketRes = await requestGuestOrUserWsTicket(
        apiBaseUrl,
        token,
        fetchImpl
      );
      const wsUrl = buildOCRWebSocketUrl(
        apiBaseUrl,
        ticketRes.ticket,
        taskId ?? activeTaskIdRef.current
      );

      const ws = new WebSocketImpl(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        store.setState({ is_connected: true });
      };

      ws.onmessage = (msgEvent: MessageEvent) => {
        processOCRWebSocketFrame(
          String(msgEvent.data),
          store,
          activeTaskIdRef.current,
          handleTaskCompletedOnce,
          handleTaskFailedOnce
        );
      };

      ws.onclose = () => {
        store.setState({ is_connected: false });
        wsRef.current = null;
      };
    },
    [
      WebSocketImpl,
      apiBaseUrl,
      fetchImpl,
      handleTaskCompletedOnce,
      handleTaskFailedOnce,
      store,
      token,
    ]
  );

  /**
   * Optimistic UX (< 50ms): Immediately activates the scanning skeleton before HTTP upload finishes.
   * Works without any user JWT token (Guest-First Mode).
   */
  const startOptimisticScan = useCallback(() => {
    stopPolling();
    activeTaskIdRef.current = null;
    store.setState({
      task_id: null,
      status: "QUEUED",
      progress: 15,
      data: null,
      error: null,
    });
    void ensureWebSocketConnected(null).catch(() => null);
  }, [ensureWebSocketConnected, stopPolling, store]);

  /**
   * Binds the active `task_id` returned by `POST /api/v1/cccd/upload` (`202 Accepted`).
   * Automatically resolves from client-side cache if the exact same image was already scanned,
   * and starts HTTP polling fallback in case WebSocket drops.
   */
  const subscribeTask = useCallback(
    async (taskId: string) => {
      activeTaskIdRef.current = taskId;

      // Fast-path: if this task_id already has a cached OCR result on the client, complete immediately (0 network/API tokens)
      const cachedData = getCachedOCRResultByTaskId(taskId);
      if (cachedData) {
        completedTaskIdsRef.current.delete(taskId);
        store.setState({
          task_id: taskId,
          status: "COMPLETED",
          progress: 100,
          data: cachedData,
          error: null,
        });
        handleTaskCompletedOnce(cachedData, taskId);
        return;
      }

      const current = store.getSnapshot();
      store.setState({
        task_id: taskId,
        status: current.status === "IDLE" ? "QUEUED" : current.status,
        progress: Math.max(current.progress, 25),
        error: null,
      });
      startFallbackPolling(taskId);
      await ensureWebSocketConnected(taskId);
    },
    [
      ensureWebSocketConnected,
      handleTaskCompletedOnce,
      startFallbackPolling,
      store,
    ]
  );

  const markFailed = useCallback(
    (errorMessage: string) => {
      stopPolling();
      store.setState({
        status: "FAILED",
        progress: 0,
        error: errorMessage,
      });
    },
    [stopPolling, store]
  );

  const resetScanner = useCallback(() => {
    stopPolling();
    activeTaskIdRef.current = null;
    store.setState({
      task_id: null,
      status: "IDLE",
      progress: 0,
      data: null,
      error: null,
    });
  }, [stopPolling, store]);

  useEffect(() => {
    return () => {
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [stopPolling]);

  return {
    ...snapshot,
    startOptimisticScan,
    subscribeTask,
    markFailed,
    resetScanner,
  };
}
