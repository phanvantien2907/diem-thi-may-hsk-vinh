/**
 * Register page — POST /api/v1/auth/register
 *
 * Fields (theo API docs 2.1):
 * - full_name: tối đa 150 ký tự
 * - cccd: đúng 12 chữ số
 * - phone: tối đa 20 ký tự
 * - email: email hợp lệ, tối đa 150 ký tự
 * - password: min 8, max 72, có chữ hoa + thường + số + ký tự đặc biệt
 *
 * Flow:
 * 1. Client-side validation với react-hook-form + zod
 * 2. Submit → action() → POST /api/v1/auth/register
 * 3. Success (201) → action trả { success: true } → client hiện toast → 5s → navigate /login
 * 4. Error 409 → "Tài khoản đã tồn tại"
 * 5. Error 400 → lỗi validation từ server
 */
import * as React from "react";
import { Link, Form, data, useActionData, useNavigation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "./+types/register";

import { registerSchema, type RegisterFormValues } from "~/lib/schemas/auth";
import type { ApiErrorResponse } from "~/types/auth";
import { toast } from "~/components/ui/toast";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/auth/PasswordInput";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Đăng ký tài khoản" },
  {
    name: "description",
    content:
      "Tạo tài khoản mới để đăng ký thi HSK máy tính tại Trường Đại học Vinh.",
  },
];

// ─── Action — Xử lý form submission ──────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = {
    full_name: formData.get("full_name"),
    cccd: formData.get("cccd"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // Validate server-side
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return data(
      {
        success: false as const,
        error: "Vui lòng kiểm tra lại thông tin đăng ký.",
        fieldErrors: {
          full_name: fieldErrors.full_name?.[0],
          cccd: fieldErrors.cccd?.[0],
          phone: fieldErrors.phone?.[0],
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
        },
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${process.env.API_BASE_URL ?? "http://localhost:8080"}/api/v1/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }
    );

    // Lỗi từ server
    if (!response.ok) {
      const errorBody = (await response.json()) as ApiErrorResponse;

      // 409 Conflict — tài khoản đã tồn tại (CCCD hoặc email trùng)
      if (response.status === 409) {
        return data(
          {
            success: false as const,
            error:
              "CCCD hoặc email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng thông tin khác.",
            fieldErrors: undefined,
          },
          { status: 409 }
        );
      }

      return data(
        {
          success: false as const,
          error: errorBody.msg ?? "Đăng ký thất bại, vui lòng thử lại.",
          fieldErrors: undefined,
        },
        { status: response.status }
      );
    }

    // Đăng ký thành công — trả success flag cho client xử lý toast + redirect
    return data({ success: true as const, error: undefined, fieldErrors: undefined });
  } catch {
    return data(
      {
        success: false as const,
        error: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
        fieldErrors: undefined,
      },
      { status: 500 }
    );
  }
}

// ─── Password Strength Indicator ─────────────────────────────────────────────
interface PasswordStrengthProps {
  password: string;
}

function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = [
    { label: "Ít nhất 8 ký tự", ok: password.length >= 8 },
    { label: "Có chữ hoa (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "Có chữ thường (a-z)", ok: /[a-z]/.test(password) },
    { label: "Có chữ số (0-9)", ok: /[0-9]/.test(password) },
    {
      label: "Có ký tự đặc biệt",
      ok: /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password),
    },
  ];

  const passedCount = checks.filter((c) => c.ok).length;
  const strength =
    passedCount <= 2 ? "weak" : passedCount <= 4 ? "medium" : "strong";

  const strengthConfig = {
    weak: { label: "Yếu", colorClass: "bg-destructive", widthClass: "w-1/5" },
    medium: { label: "Trung bình", colorClass: "bg-yellow-500", widthClass: "w-3/5" },
    strong: { label: "Mạnh", colorClass: "bg-green-500", widthClass: "w-full" },
  };

  const config = strengthConfig[strength];

  return (
    <div className="flex flex-col gap-2 mt-1" aria-live="polite" aria-atomic="true">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ${config.colorClass} ${config.widthClass}`}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
          {config.label}
        </span>
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              check.ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            }`}
          >
            <span aria-hidden="true" className="shrink-0 font-medium">
              {check.ok ? "✓" : "○"}
            </span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Countdown indicator khi đăng ký thành công ───────────────────────────────
function SuccessBanner({ onNavigate }: { onNavigate: () => void }) {
  const [seconds, setSeconds] = React.useState(5);

  React.useEffect(() => {
    if (seconds <= 0) {
      onNavigate();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onNavigate]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
    >
      <p className="font-semibold">Đăng ký thành công! 🎉</p>
      <p className="text-xs mt-0.5 text-green-700 dark:text-green-400">
        Đang chuyển đến trang đăng nhập sau {seconds} giây…
      </p>
    </div>
  );
}

// ─── Register Form Component ──────────────────────────────────────────────────
export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  // Watch password để hiển thị strength indicator
  const watchedPassword = watch("password", "");

  // Trigger toast khi action trả success = true
  React.useEffect(() => {
    if (actionData?.success) {
      toast.add({
        title: "Đăng ký thành công!",
        description: "Tài khoản của bạn đã được tạo. Đang chuyển hướng…",
        type: "success",
        timeout: 6000,
      });
    }
  }, [actionData?.success]);

  // Callback navigate sau 5 giây (từ SuccessBanner)
  const handleNavigateToLogin = React.useCallback(() => {
    navigate("/login");
  }, [navigate]);

  return (
    <div className="flex flex-col gap-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2
          className="text-2xl font-bold text-foreground tracking-tight"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          Tạo tài khoản
        </h2>
        <p className="text-sm text-muted-foreground">
          Đăng ký để dự thi HSK tại Đại học Vinh
        </p>
      </div>

      {/* Success banner + countdown */}
      {actionData?.success && (
        <SuccessBanner onNavigate={handleNavigateToLogin} />
      )}

      {/* Server error banner */}
      {actionData?.error && (
        <div
          id="register-error"
          role="alert"
          aria-live="polite"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive border border-destructive/20"
        >
          {actionData.error}
        </div>
      )}

      {/* Form — ẩn sau khi đăng ký thành công */}
      {!actionData?.success && (
        <Form
          method="post"
          className="flex flex-col gap-4"
          aria-describedby={actionData?.error ? "register-error" : undefined}
        >
          {/* ── Họ và tên ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">
              Họ và tên đầy đủ{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Nguyễn Văn A…"
              autoComplete="name"
              autoFocus
              maxLength={150}
              aria-invalid={
                errors.full_name || actionData?.fieldErrors?.full_name
                  ? true
                  : undefined
              }
              aria-describedby={
                errors.full_name || actionData?.fieldErrors?.full_name
                  ? "full_name-error"
                  : undefined
              }
              {...register("full_name")}
            />
            {(errors.full_name || actionData?.fieldErrors?.full_name) && (
              <p id="full_name-error" role="alert" className="text-xs text-destructive">
                {errors.full_name?.message ?? actionData?.fieldErrors?.full_name}
              </p>
            )}
          </div>

          {/* ── Số CCCD ───────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cccd">
              Số căn cước công dân{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="cccd"
              type="text"
              inputMode="numeric"
              placeholder="012345678901"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              aria-invalid={
                errors.cccd || actionData?.fieldErrors?.cccd ? true : undefined
              }
              aria-describedby={
                errors.cccd || actionData?.fieldErrors?.cccd
                  ? "cccd-error"
                  : "cccd-hint"
              }
              {...register("cccd")}
            />
            <p id="cccd-hint" className="text-xs text-muted-foreground">
              Nhập đúng 12 chữ số trên căn cước của bạn
            </p>
            {(errors.cccd || actionData?.fieldErrors?.cccd) && (
              <p id="cccd-error" role="alert" className="text-xs text-destructive">
                {errors.cccd?.message ?? actionData?.fieldErrors?.cccd}
              </p>
            )}
          </div>

          {/* ── Số điện thoại ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">
              Số điện thoại{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="0901234567…"
              autoComplete="tel"
              maxLength={20}
              aria-invalid={
                errors.phone || actionData?.fieldErrors?.phone ? true : undefined
              }
              aria-describedby={
                errors.phone || actionData?.fieldErrors?.phone
                  ? "phone-error"
                  : undefined
              }
              {...register("phone")}
            />
            {(errors.phone || actionData?.fieldErrors?.phone) && (
              <p id="phone-error" role="alert" className="text-xs text-destructive">
                {errors.phone?.message ?? actionData?.fieldErrors?.phone}
              </p>
            )}
          </div>

          {/* ── Email ─────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              Địa chỉ email{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="example@email.com…"
              autoComplete="email"
              spellCheck={false}
              maxLength={150}
              aria-invalid={
                errors.email || actionData?.fieldErrors?.email ? true : undefined
              }
              aria-describedby={
                errors.email || actionData?.fieldErrors?.email
                  ? "email-error"
                  : undefined
              }
              {...register("email")}
            />
            {(errors.email || actionData?.fieldErrors?.email) && (
              <p id="email-error" role="alert" className="text-xs text-destructive">
                {errors.email?.message ?? actionData?.fieldErrors?.email}
              </p>
            )}
          </div>

          {/* ── Mật khẩu ──────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">
              Mật khẩu{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <PasswordInput
              id="password"
              placeholder="Tối thiểu 8 ký tự…"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={
                errors.password || actionData?.fieldErrors?.password
                  ? true
                  : undefined
              }
              aria-describedby="password-strength"
              {...register("password")}
            />
            {/* Real-time strength indicator */}
            <div id="password-strength">
              <PasswordStrengthIndicator password={watchedPassword ?? ""} />
            </div>
            {(errors.password || actionData?.fieldErrors?.password) && (
              <p id="password-error" role="alert" className="text-xs text-destructive">
                {errors.password?.message ?? actionData?.fieldErrors?.password}
              </p>
            )}
          </div>

          {/* ── Submit ────────────────────────────────────────────────────────── */}
          <Button
            type="submit"
            size="lg"
            className="rounded-full w-full mt-1 text-base font-semibold"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Đang tạo tài khoản…
              </span>
            ) : (
              "Tạo tài khoản"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <span className="text-destructive" aria-hidden="true">*</span>{" "}
            Các trường bắt buộc phải điền
          </p>
        </Form>
      )}

      {/* Switch to Login */}
      {!actionData?.success && (
        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-semibold text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </p>
      )}
    </div>
  );
}
