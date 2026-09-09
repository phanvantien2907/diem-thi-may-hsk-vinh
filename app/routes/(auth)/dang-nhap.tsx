/**
 * Login page — POST /api/v1/auth/login
 * Fields: identifier (CCCD hoặc Email), password
 *
 * Flow:
 * 1. Client-side validation với react-hook-form + zod
 * 2. Submit → action() → gọi API backend
 * 3. Success → { success: true } → toast + SuccessBanner 3s → navigate("/")
 * 4. Error server → toast type="error" (inline field errors vẫn giữ dưới input)
 * 5. must_change_password → redirect ngay (forced flow, không cần toast)
 */
import * as React from "react";
import { Link, Form, redirect, data, useActionData, useNavigation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { API_BASE_URL } from "~/lib/env.server";
import type { Route } from "./+types/dang-nhap";

import { loginSchema, type LoginFormValues } from "~/lib/schemas/auth";
import type { LoginResponseData, ApiErrorResponse } from "~/types/auth";
import { toast } from "~/components/ui/toast";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/auth/PasswordInput";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Đăng nhập hệ thống" },
  {
    name: "description",
    content:
      "Đăng nhập vào hệ thống đăng ký thi HSK máy tính Trường Đại học Vinh.",
  },
];

// ─── Loader — Chuyển hướng nếu đã đăng nhập ──────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  if (cookieHeader.includes("session=")) {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo");
    const isSafeReturnTo =
      returnTo &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.includes(".data") &&
      !returnTo.startsWith("/_");

    return redirect(isSafeReturnTo ? returnTo : "/thong-tin-thi-sinh");
  }
  return null;
}

// ─── Action — Xử lý form submission ──────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = {
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  };

  // Validate server-side
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return data(
      {
        success: false as const,
        error: "Vui lòng kiểm tra lại thông tin đăng nhập.",
        fieldErrors: {
          identifier: fieldErrors.identifier?.[0],
          password: fieldErrors.password?.[0],
        },
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }
    );

    // Lỗi từ server (401 sai mật khẩu, 404 không tìm thấy, 403 bị khoá...)
    if (!response.ok) {
      const errorBody = (await response.json()) as ApiErrorResponse;
      return data(
        {
          success: false as const,
          error: errorBody.msg ?? "Đăng nhập thất bại, vui lòng thử lại.",
          fieldErrors: undefined,
        },
        { status: response.status }
      );
    }

    const result = (await response.json()) as {
      success: boolean;
      data: LoginResponseData;
    };

    // Forced redirect — đổi mật khẩu lần đầu, không qua toast flow
    if (result.data.must_change_password) {
      return redirect("/auth/force-change-password");
    }

    // Thiết lập session cookies cho browser
    const headers = new Headers();
    const expiresIn = result.data.expires_in || 86400;
    headers.append(
      "Set-Cookie",
      `session=${result.data.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expiresIn}`
    );
    if (result.data.refresh_token) {
      headers.append(
        "Set-Cookie",
        `refresh_token=${result.data.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
      );
    }

    // Lưu thông tin người dùng ban đầu vào cookie
    const isEmail = parsed.data.identifier.includes("@");
    const basicUser = {
      username: parsed.data.identifier,
      name: isEmail
        ? parsed.data.identifier.split("@")[0]
        : `Thí sinh (${parsed.data.identifier.slice(-4)})`,
      email: isEmail ? parsed.data.identifier : "",
      cccd: !isEmail ? parsed.data.identifier : "",
      role: "Thí sinh",
    };
    headers.append(
      "Set-Cookie",
      `user_info=${encodeURIComponent(JSON.stringify(basicUser))}; Path=/; SameSite=Lax; Max-Age=${expiresIn}`
    );

    return data(
      {
        success: true as const,
        error: undefined,
        fieldErrors: undefined,
      },
      { headers }
    );
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

// ─── Login Form Component ─────────────────────────────────────────────────────
export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  // Toast khi có lỗi server (sai mật khẩu, tài khoản không tồn tại, v.v.)
  React.useEffect(() => {
    if (actionData?.error) {
      toast.add({
        type: "error",
        title: "Đăng nhập thất bại",
        description: actionData.error,
        timeout: 5000,
      });
    }
  }, [actionData?.error]);

  // Toast khi đăng nhập thành công & chuyển hướng ngay lập tức (không trễ)
  React.useEffect(() => {
    if (actionData?.success) {
      toast.add({
        type: "success",
        title: "Đăng nhập thành công!",
        description: "Chào mừng bạn quay trở lại.",
        timeout: 3000,
      });

      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo");
      const isSafeReturnTo =
        returnTo &&
        returnTo.startsWith("/") &&
        !returnTo.startsWith("//") &&
        !returnTo.includes(".data") &&
        !returnTo.startsWith("/_");

      navigate(isSafeReturnTo ? returnTo : "/thong-tin-thi-sinh", { replace: true });
    }
  }, [actionData?.success, navigate]);

  return (
    <div className="flex flex-col gap-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2
          className="text-2xl font-bold text-foreground tracking-tight"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          Chào mừng trở lại
        </h2>
        <p className="text-sm text-muted-foreground">
          Đăng nhập để tiếp tục sử dụng hệ thống
        </p>
      </div>

      {/* Thông báo chuyển hướng khi thành công */}
      {actionData?.success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-green-50/80 border border-green-200/80 p-4 text-sm text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300 flex items-center gap-3"
        >
          <div className="size-4 rounded-full border-2 border-green-600 border-t-transparent animate-spin shrink-0" />
          <p className="font-medium">Đăng nhập thành công! Đang chuyển hướng…</p>
        </div>
      )}

      {/* Form — ẩn sau khi đăng nhập thành công */}
      {!actionData?.success && (
        <Form method="post" className="flex flex-col gap-4">
          {/* ── identifier ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">
              Email hoặc số CCCD{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Nhập email hoặc số CCCD…"
              autoComplete="username"
              autoFocus
              spellCheck={false}
              aria-invalid={
                errors.identifier || actionData?.fieldErrors?.identifier
                  ? true
                  : undefined
              }
              aria-describedby={
                errors.identifier || actionData?.fieldErrors?.identifier
                  ? "identifier-error"
                  : undefined
              }
              {...register("identifier")}
            />
            {(errors.identifier || actionData?.fieldErrors?.identifier) && (
              <p
                id="identifier-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.identifier?.message ??
                  actionData?.fieldErrors?.identifier}
              </p>
            )}
          </div>

          {/* ── password ───────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">
                Mật khẩu{" "}
                <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="Nhập mật khẩu…"
              autoComplete="current-password"
              aria-invalid={
                errors.password || actionData?.fieldErrors?.password
                  ? true
                  : undefined
              }
              aria-describedby={
                errors.password || actionData?.fieldErrors?.password
                  ? "password-error"
                  : undefined
              }
              {...register("password")}
            />
            {(errors.password || actionData?.fieldErrors?.password) && (
              <p
                id="password-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.password?.message ?? actionData?.fieldErrors?.password}
              </p>
            )}
          </div>

          {/* ── Submit ─────────────────────────────────────────────────────── */}
          <Button
            type="submit"
            size="lg"
            className="w-full mt-1 text-base font-semibold"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
                Đang đăng nhập…
              </span>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </Form>
      )}

      {/* Switch to Register */}
      {!actionData?.success && (
        <p className="text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            to="/dang-ky"
            className="font-semibold text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Đăng ký ngay
          </Link>
        </p>
      )}
    </div>
  );
}
