import * as React from "react";
import {
  ShieldCheckIcon,
  LockIcon,
  KeyRoundIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldAlertIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "~/components/ui/input-otp";
import { toast } from "~/components/ui/toast";

export const PII_UNLOCK_TTL_SECONDS = 300; // 5 minutes strict TTL
const MAX_PIN_ATTEMPTS = 5;
const SUBMIT_THROTTLE_MS = 800;

interface AdminPinStatusPayload {
  has_pin: boolean;
  is_locked: boolean;
  locked_until?: string | null;
  remaining_lock_seconds: number;
  failed_count: number;
  max_attempts: number;
  remaining_attempts: number;
}

interface VerifyAdminPinPayload {
  pii_access_token: string;
  scope: string;
  expires_in: number;
  expires_at: string;
}

export interface AdminPiiPinGatewayContextValue {
  isPiiUnlocked: boolean;
  piiAccessToken: string | null;
  remainingUnlockSeconds: number;
  hasPinConfigured: boolean;
  isLockedOut: boolean;
  remainingLockSeconds: number;
  remainingAttempts: number;
  lockEpoch: number;
  /**
   * Intercepts a PII reveal action. If already unlocked within the 5-minute window,
   * invokes `onSuccess(token)` immediately; otherwise opens the 6-digit PIN modal
   * and invokes `onSuccess(token)` as soon as verification succeeds.
   */
  requestPiiUnlock: (onSuccess?: (token: string) => void) => void;
  /** Opens the PIN Setup / Change dialog explicitly. */
  openPinSetupDialog: () => void;
  /** Immediately locks PII access and re-blurs all open candidate images. */
  lockPiiNow: (reasonToast?: boolean) => void;
}

const AdminPiiPinGatewayContext =
  React.createContext<AdminPiiPinGatewayContextValue | null>(null);

function formatCountdownMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function AdminPiiPinGatewayProvider({
  initialHasPin,
  children,
}: {
  initialHasPin?: boolean;
  children: React.ReactNode;
}) {
  const [hasPinConfigured, setHasPinConfigured] = React.useState<boolean>(
    initialHasPin ?? true
  );
  const [isPiiUnlocked, setIsPiiUnlocked] = React.useState(false);
  const [piiAccessToken, setPiiAccessToken] = React.useState<string | null>(null);
  const [remainingUnlockSeconds, setRemainingUnlockSeconds] = React.useState(0);
  const [lockEpoch, setLockEpoch] = React.useState(0);

  // Anti-spam & lockout state (5 failed attempts -> 15-minute lock)
  const [isLockedOut, setIsLockedOut] = React.useState(false);
  const [remainingLockSeconds, setRemainingLockSeconds] = React.useState(0);
  const [remainingAttempts, setRemainingAttempts] = React.useState(MAX_PIN_ATTEMPTS);

  // Modal state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"verify" | "setup">("verify");
  const [isMandatoryOnboarding, setIsMandatoryOnboarding] = React.useState(false);

  // Form state
  const [pinValue, setPinValue] = React.useState("");
  const [confirmPinValue, setConfirmPinValue] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [showPinDigits, setShowPinDigits] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const pendingCallbackRef = React.useRef<((token: string) => void) | null>(null);
  const autoLockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSubmitAtRef = React.useRef<number>(0);

  const clearAutoLockTimer = React.useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  }, []);

  const lockPiiNow = React.useCallback(
    (showToast = false) => {
      clearAutoLockTimer();
      setIsPiiUnlocked(false);
      setPiiAccessToken(null);
      setRemainingUnlockSeconds(0);
      setLockEpoch((prev) => prev + 1);
      if (showToast) {
        toast.add({
          type: "info",
          title: "Đã khóa cổng bảo mật ảnh PII",
          description:
            "Phiên truy cập ảnh giấy tờ tùy thân (5 phút) đã kết thúc và toàn bộ ảnh đã được làm mờ lại.",
        });
      }
    },
    [clearAutoLockTimer]
  );

  const startUnlockWindow = React.useCallback(
    (token: string, ttlSeconds: number) => {
      clearAutoLockTimer();
      const safeTtl = ttlSeconds > 0 ? ttlSeconds : PII_UNLOCK_TTL_SECONDS;
      setPiiAccessToken(token);
      setIsPiiUnlocked(true);
      setRemainingUnlockSeconds(safeTtl);

      autoLockTimerRef.current = setTimeout(() => {
        lockPiiNow(true);
      }, safeTtl * 1000);
    },
    [clearAutoLockTimer, lockPiiNow]
  );

  // Countdown ticker for active 5-minute PII unlock window
  React.useEffect(() => {
    if (!isPiiUnlocked || remainingUnlockSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingUnlockSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPiiUnlocked, remainingUnlockSeconds > 0]);

  // Countdown ticker for 15-minute brute-force lockout window
  React.useEffect(() => {
    if (!isLockedOut || remainingLockSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingLockSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLockedOut(false);
          setRemainingAttempts(MAX_PIN_ATTEMPTS);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut, remainingLockSeconds > 0]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => clearAutoLockTimer();
  }, [clearAutoLockTimer]);

  // Sync PIN status from backend on mount; if admin has not set up a PIN yet,
  // automatically pop up the PIN setup dialog upon login!
  const syncPinStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/internal/admin/verify-pin", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const data = (json?.data ?? null) as AdminPinStatusPayload | null;
      if (!data) return;

      setHasPinConfigured(Boolean(data.has_pin));
      setIsLockedOut(Boolean(data.is_locked));
      setRemainingLockSeconds(Number(data.remaining_lock_seconds) || 0);
      setRemainingAttempts(
        typeof data.remaining_attempts === "number"
          ? data.remaining_attempts
          : MAX_PIN_ATTEMPTS
      );

      if (!data.has_pin) {
        setDialogMode("setup");
        setIsMandatoryOnboarding(true);
        setPinValue("");
        setConfirmPinValue("");
        setCurrentPassword("");
        setErrorMessage(null);
        setIsDialogOpen(true);
      }
    } catch {
      // Fallback to initialHasPin from loader if offline
      if (initialHasPin === false) {
        setHasPinConfigured(false);
        setDialogMode("setup");
        setIsMandatoryOnboarding(true);
        setIsDialogOpen(true);
      }
    }
  }, [initialHasPin]);

  React.useEffect(() => {
    void syncPinStatus();
  }, [syncPinStatus]);

  const resetDialogInputs = React.useCallback(() => {
    setPinValue("");
    setConfirmPinValue("");
    setCurrentPassword("");
    setErrorMessage(null);
  }, []);

  const requestPiiUnlock = React.useCallback(
    (onSuccess?: (token: string) => void) => {
      if (isPiiUnlocked && piiAccessToken) {
        onSuccess?.(piiAccessToken);
        return;
      }
      pendingCallbackRef.current = onSuccess ?? null;
      resetDialogInputs();
      setDialogMode(hasPinConfigured ? "verify" : "setup");
      setIsMandatoryOnboarding(!hasPinConfigured);
      setIsDialogOpen(true);
      void syncPinStatus();
    },
    [hasPinConfigured, isPiiUnlocked, piiAccessToken, resetDialogInputs, syncPinStatus]
  );

  const openPinSetupDialog = React.useCallback(() => {
    pendingCallbackRef.current = null;
    resetDialogInputs();
    setDialogMode("setup");
    setIsMandatoryOnboarding(!hasPinConfigured);
    setIsDialogOpen(true);
  }, [hasPinConfigured, resetDialogInputs]);

  const handleVerifyPin = React.useCallback(
    async (candidatePin?: string) => {
      const pinToVerify = (candidatePin ?? pinValue).replace(/\D/g, "");
      if (pinToVerify.length !== 6) {
        setErrorMessage("Vui lòng nhập đủ 6 chữ số mã PIN bảo mật.");
        return;
      }
      if (isLockedOut && remainingLockSeconds > 0) {
        setErrorMessage(
          `Cổng bảo mật đang tạm khóa chống dò mã. Vui lòng thử lại sau ${formatCountdownMMSS(
            remainingLockSeconds
          )}.`
        );
        return;
      }

      // Anti-spam client-side throttle (800ms)
      const now = Date.now();
      if (now - lastSubmitAtRef.current < SUBMIT_THROTTLE_MS) {
        return;
      }
      lastSubmitAtRef.current = now;

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/internal/admin/verify-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ intent: "verify", pin: pinToVerify }),
        });

        const json = await res.json().catch(() => null);

        if (res.status === 429) {
          // Locked out after 5 failed attempts
          const msg =
            json?.msg ||
            json?.error?.message ||
            json?.error ||
            "Nhập sai mã PIN quá 5 lần liên tiếp. Cổng bảo mật PII đã tạm khóa 15 phút.";
          setIsLockedOut(true);
          setRemainingLockSeconds((prev) => (prev > 0 ? prev : 15 * 60));
          setRemainingAttempts(0);
          setPinValue("");
          setErrorMessage(String(msg));
          toast.add({
            type: "error",
            title: "Đã khóa cổng PIN bảo mật (15 phút)",
            description: String(msg),
          });
          return;
        }

        if (!res.ok || !json?.success) {
          const msg =
            json?.msg ||
            json?.error?.message ||
            json?.error ||
            "Mã PIN bảo mật không chính xác.";
          setPinValue("");
          setErrorMessage(String(msg));

          // Extract remaining attempts from message if present (e.g., "còn 3/5 lần thử")
          const match = String(msg).match(/còn\s+(\d+)\/(\d+)/i);
          if (match) {
            setRemainingAttempts(Number(match[1]));
          } else {
            setRemainingAttempts((prev) => Math.max(0, prev - 1));
          }
          return;
        }

        const data = json.data as VerifyAdminPinPayload;
        const token = data?.pii_access_token;
        const ttl = Number(data?.expires_in) || PII_UNLOCK_TTL_SECONDS;

        if (!token) {
          setErrorMessage("Máy chủ không trả về pii_access_token hợp lệ.");
          return;
        }

        setRemainingAttempts(MAX_PIN_ATTEMPTS);
        setIsLockedOut(false);
        startUnlockWindow(token, ttl);
        setIsDialogOpen(false);
        setPinValue("");

        toast.add({
          type: "success",
          title: "Đã mở khóa ảnh PII (Hiệu lực 5 phút)",
          description:
            "Hệ thống sẽ tự động khóa lại và làm mờ ảnh sau 05:00 phút để bảo vệ dữ liệu cá nhân.",
        });

        const cb = pendingCallbackRef.current;
        pendingCallbackRef.current = null;
        cb?.(token);
      } catch {
        setErrorMessage("Không thể kết nối tới máy chủ xác thực PIN. Vui lòng thử lại.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isLockedOut, pinValue, remainingLockSeconds, startUnlockWindow]
  );

  const handleSetupPin = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const cleanPin = pinValue.replace(/\D/g, "");
      const cleanConfirm = confirmPinValue.replace(/\D/g, "");

      if (cleanPin.length !== 6) {
        setErrorMessage("Mã PIN bảo mật phải bao gồm đúng 6 chữ số (0–9).");
        return;
      }
      if (cleanPin !== cleanConfirm) {
        setErrorMessage("Mã PIN xác nhận không khớp với mã PIN vừa nhập.");
        return;
      }
      if (hasPinConfigured && !currentPassword.trim()) {
        setErrorMessage(
          "Vui lòng nhập mật khẩu đăng nhập hiện tại để xác nhận đổi mã PIN."
        );
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const setupRes = await fetch("/internal/admin/verify-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            intent: "setup",
            pin: cleanPin,
            current_password: currentPassword.trim() || undefined,
          }),
        });

        const setupJson = await setupRes.json().catch(() => null);
        if (!setupRes.ok || !setupJson?.success) {
          const msg =
            setupJson?.msg ||
            setupJson?.error?.message ||
            setupJson?.error ||
            "Không thể thiết lập mã PIN bảo mật.";
          setErrorMessage(String(msg));
          return;
        }

        setHasPinConfigured(true);
        setIsMandatoryOnboarding(false);
        setIsLockedOut(false);
        setRemainingAttempts(MAX_PIN_ATTEMPTS);

        toast.add({
          type: "success",
          title: "Thiết lập mã PIN 6 số thành công",
          description:
            "Mã PIN bảo mật của bạn đã được mã hóa bcrypt an toàn trên hệ thống.",
        });

        // If the setup was triggered by a Click-to-Reveal action, automatically verify and unlock!
        if (pendingCallbackRef.current) {
          await handleVerifyPin(cleanPin);
        } else {
          setIsDialogOpen(false);
          resetDialogInputs();
        }
      } catch {
        setErrorMessage("Lỗi kết nối khi lưu mã PIN bảo mật. Vui lòng thử lại.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      confirmPinValue,
      currentPassword,
      handleVerifyPin,
      hasPinConfigured,
      pinValue,
      resetDialogInputs,
    ]
  );

  const ctxValue = React.useMemo<AdminPiiPinGatewayContextValue>(
    () => ({
      isPiiUnlocked,
      piiAccessToken,
      remainingUnlockSeconds,
      hasPinConfigured,
      isLockedOut,
      remainingLockSeconds,
      remainingAttempts,
      lockEpoch,
      requestPiiUnlock,
      openPinSetupDialog,
      lockPiiNow,
    }),
    [
      hasPinConfigured,
      isLockedOut,
      isPiiUnlocked,
      lockEpoch,
      lockPiiNow,
      openPinSetupDialog,
      piiAccessToken,
      remainingAttempts,
      remainingLockSeconds,
      remainingUnlockSeconds,
      requestPiiUnlock,
    ]
  );

  return (
    <AdminPiiPinGatewayContext.Provider value={ctxValue}>
      {children}

      {/* Zero-Trust 6-Digit Admin PIN Gateway Modal */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          // If the admin has not set up their PIN upon login, keep prompting until configured
          if (!nextOpen && isMandatoryOnboarding && !hasPinConfigured) {
            toast.add({
              type: "warning",
              title: "Yêu cầu bắt buộc thiết lập mã PIN 6 số",
              description:
                "Tài khoản Quản trị viên cần thiết lập mã PIN 6 số để bảo vệ dữ liệu định danh thí sinh (Nghị định 13/2023/NĐ-CP).",
            });
            return;
          }
          setIsDialogOpen(nextOpen);
          if (!nextOpen) {
            pendingCallbackRef.current = null;
            resetDialogInputs();
          }
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-primary border-primary/25 bg-primary/5 flex items-center gap-1.5"
              >
                <ShieldCheckIcon className="size-3.5" />
                Zero-Trust PII Gateway • NĐ 13/2023
              </Badge>
              {dialogMode === "verify" && !isLockedOut && (
                <Badge
                  variant="outline"
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  Còn {remainingAttempts}/{MAX_PIN_ATTEMPTS} lần thử
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-primary shrink-0" />
              {dialogMode === "setup"
                ? hasPinConfigured
                  ? "Đổi mã PIN bảo mật 6 số"
                  : "Thiết lập mã PIN bảo mật 6 số (Lần đầu)"
                : "Nhập mã PIN 6 số để mở khóa ảnh PII"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {dialogMode === "setup"
                ? "Tài khoản quản trị viên bắt buộc cài đặt mã PIN 6 chữ số (mã hóa bcrypt) để xác thực trước khi xem ảnh CCCD/Hộ chiếu và ảnh chân dung thí sinh."
                : "Phiên mở khóa có hiệu lực nghiêm ngặt trong 05:00 phút và tự động khóa lại khi hết hạn."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "verify" ? (
            <div className="p-5 space-y-4">
              {/* Lockout warning banner if 5 failed attempts reached */}
              {isLockedOut && remainingLockSeconds > 0 && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldAlertIcon className="size-4 shrink-0" />
                    <span>Tạm khóa chống dò mã PIN (Nhập sai quá 5 lần)</span>
                  </div>
                  <p className="text-[11px] text-foreground/90 leading-relaxed pl-5.5">
                    Vui lòng đợi{" "}
                    <span className="font-mono font-bold text-destructive">
                      {formatCountdownMMSS(remainingLockSeconds)}
                    </span>{" "}
                    trước khi thử lại hoặc đặt lại mã PIN bằng mật khẩu đăng nhập.
                  </p>
                </div>
              )}

              {/* Error banner */}
              {errorMessage && !isLockedOut && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2.5 flex flex-col items-center py-1">
                <div className="flex items-center justify-between w-full px-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Nhập 6 chữ số mã PIN bảo mật
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPinDigits((prev) => !prev)}
                    className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPinDigits ? (
                      <>
                        <EyeOffIcon className="size-3" />
                        <span>Ẩn số</span>
                      </>
                    ) : (
                      <>
                        <EyeIcon className="size-3" />
                        <span>Hiện số</span>
                      </>
                    )}
                  </button>
                </div>

                <InputOTP
                  maxLength={6}
                  value={pinValue}
                  onChange={setPinValue}
                  onComplete={(completedPin) => {
                    void handleVerifyPin(completedPin);
                  }}
                  disabled={isSubmitting || (isLockedOut && remainingLockSeconds > 0)}
                  mask={!showPinDigits}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <p className="text-[11px] text-muted-foreground text-center">
                  Mọi thao tác mở khóa ảnh định danh đều được ghi nhận vào Nhật ký Kiểm toán (Audit Log).
                </p>
              </div>

              <DialogFooter className="pt-2 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetDialogInputs();
                    setDialogMode("setup");
                  }}
                  className="rounded-full cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                >
                  Quên / Đổi mã PIN?
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="rounded-full cursor-pointer text-xs"
                  >
                    Đóng
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      isSubmitting ||
                      pinValue.length !== 6 ||
                      (isLockedOut && remainingLockSeconds > 0)
                    }
                    onClick={() => void handleVerifyPin()}
                    className="rounded-full cursor-pointer text-xs font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                        Đang xác thực...
                      </>
                    ) : (
                      <>
                        <LockIcon className="size-3.5 mr-1.5" />
                        Mở khóa (5 phút)
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSetupPin} className="p-5 space-y-4">
              {isMandatoryOnboarding && !hasPinConfigured && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-4 shrink-0" />
                    Thiết lập bảo mật bắt buộc khi đăng nhập Quản trị viên
                  </p>
                  <p className="text-[11px] leading-relaxed pl-5.5">
                    Tài khoản của bạn chưa cấu hình mã PIN 6 số. Vui lòng khởi tạo mã PIN ngay bây giờ để sử dụng khi duyệt ảnh giấy tờ thí sinh.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="flex items-center justify-between w-full">
                    <Label className="text-xs font-semibold">
                      Mã PIN 6 chữ số mới <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPinDigits((prev) => !prev)}
                      className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showPinDigits ? "Ẩn số" : "Hiện số"}
                    </button>
                  </div>
                  <InputOTP
                    maxLength={6}
                    value={pinValue}
                    onChange={setPinValue}
                    disabled={isSubmitting}
                    mask={!showPinDigits}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                  <Label className="text-xs font-semibold self-start">
                    Nhập lại mã PIN 6 chữ số <span className="text-destructive">*</span>
                  </Label>
                  <InputOTP
                    maxLength={6}
                    value={confirmPinValue}
                    onChange={setConfirmPinValue}
                    disabled={isSubmitting}
                    mask={!showPinDigits}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {hasPinConfigured && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="admin-current-password" className="text-xs font-semibold">
                      Mật khẩu đăng nhập hiện tại <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="admin-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu tài khoản Admin để xác nhận..."
                      className="h-9 text-xs"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
                {hasPinConfigured ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetDialogInputs();
                      setDialogMode("verify");
                    }}
                    className="rounded-full cursor-pointer text-xs text-muted-foreground"
                  >
                    Quay lại xác thực PIN
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Mã hóa một chiều bằng thuật toán bcrypt
                  </span>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isSubmitting ||
                    pinValue.length !== 6 ||
                    confirmPinValue.length !== 6
                  }
                  className="rounded-full cursor-pointer text-xs font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                      Đang lưu mã PIN...
                    </>
                  ) : (
                    <>
                      <CheckCircle2Icon className="size-3.5 mr-1.5" />
                      Lưu mã PIN 6 số
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminPiiPinGatewayContext.Provider>
  );
}

export function useAdminPiiPinGateway(): AdminPiiPinGatewayContextValue {
  const ctx = React.useContext(AdminPiiPinGatewayContext);
  if (!ctx) {
    return {
      isPiiUnlocked: false,
      piiAccessToken: null,
      remainingUnlockSeconds: 0,
      hasPinConfigured: true,
      isLockedOut: false,
      remainingLockSeconds: 0,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      lockEpoch: 0,
      requestPiiUnlock: () => {},
      openPinSetupDialog: () => {},
      lockPiiNow: () => {},
    };
  }
  return ctx;
}

