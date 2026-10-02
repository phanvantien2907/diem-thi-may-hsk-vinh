import * as React from "react";
import { useLoaderData } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Route } from "./+types/_app.tai-khoan-cua-toi";
import { requireAuth } from "~/lib/auth.server";
import { updateProfileSchema, changePasswordSchema, type UpdateProfileFormValues, type ChangePasswordFormValues } from "~/lib/schemas/auth";

import { API_BASE_URL } from "~/lib/env.server";
import type { AccountResponseDTO, UserProfile } from "~/types/auth";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { PasswordInput } from "~/components/auth/PasswordInput";
import { toast } from "~/components/ui/toast";

import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  IdCardIcon,
  LockIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  SaveIcon,
  Loader2Icon,
  InfoIcon,
} from "lucide-react";

export const meta: Route.MetaFunction = () => [
  { title: "Tài khoản của tôi" },
  {
    name: "description",
    content:
      "Quản lý thông tin tài khoản cá nhân và đổi mật khẩu trên hệ thống thi HSK Đại học Vinh.",
  },
];

export type LoaderData = {
  user: UserProfile;
  token: string;
  account: AccountResponseDTO | null;
  apiBaseUrl: string;
};

// ─── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const { user, token } = await requireAuth(request);

  let account: AccountResponseDTO | null = null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const json = await res.json();
      account = json.data || null;
    }
  } catch (err) {
    console.error("[Account] Failed to fetch /api/v1/me:", err);
  }

  return {
    user,
    token,
    account,
    apiBaseUrl: API_BASE_URL,
  };
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "TS";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TaiKhoanCuaToiPage({ loaderData }: Route.ComponentProps) {
  const fallbackData = useLoaderData<typeof loader>();
  const data = loaderData || fallbackData;
  const { user, token, account, apiBaseUrl } = data;
  // revalidator removed

  // ── State Thông tin cá nhân ──
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    control: profileControl,
    formState: { errors: profileErrors, isSubmitting: isSavingProfile },
    reset: resetProfile,
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: account?.full_name || user.full_name || user.name || "",
      email: account?.email || user.email || "",
      phone: account?.phone || user.phone || "",
    },
    mode: "onBlur",
  });

  // ── State Đổi mật khẩu ──
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isChangingPassword },
    reset: resetPassword,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  // Đồng bộ khi loader data cập nhật
  React.useEffect(() => {
    resetProfile({
      fullName: account?.full_name || user.full_name || user.name || "",
      email: account?.email || user.email || "",
      phone: account?.phone || user.phone || "",
    });
  }, [account, user, resetProfile]);

  const onSaveProfile = async (data: UpdateProfileFormValues) => {
    try {
      const resMe = await fetch(`${apiBaseUrl}/api/v1/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: data.fullName.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
        }),
      });

      if (!resMe.ok) {
        const err = await resMe.json().catch(() => null);
        throw new Error(err?.msg || "Không thể cập nhật thông tin tài khoản.");
      }

      const result = await resMe.json().catch(() => null);
      if (result?.data) {
        resetProfile({
          fullName: result.data.full_name || data.fullName,
          email: result.data.email || data.email,
          phone: result.data.phone || data.phone,
        });
      }

      try {
        await fetch(`${apiBaseUrl}/api/v1/me/candidate-profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: data.fullName.trim(),
          }),
        });
      } catch {
      }

      toast.add({
        type: "success",
        title: "Cập nhật thành công!",
        description: "Thông tin tài khoản đã được lưu vào hệ thống.",
      });

      // No reload/revalidate here, handled by client state
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Đã có lỗi xảy ra, vui lòng thử lại.";
      toast.add({
        type: "error",
        title: "Cập nhật thất bại",
        description: message,
      });
    }
  };

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: data.oldPassword,
          new_password: data.newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.msg || "Mật khẩu hiện tại không chính xác.");
      }

      toast.add({
        type: "success",
        title: "Đổi mật khẩu thành công!",
        description: "Mật khẩu tài khoản của bạn đã được cập nhật an toàn.",
      });

      resetPassword({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Đổi mật khẩu không thành công.";
      toast.add({
        type: "error",
        title: "Đổi mật khẩu thất bại",
        description: message,
      });
    }
  };

  const profileFullName = useWatch({ control: profileControl, name: "fullName" });
  const currentFullName = profileFullName || account?.full_name || user.name;
  const usernameDisplay = account?.username || user.username || user.cccd || "—";
  const userRole = user.role || (account?.role_id === 1 ? "Quản trị viên" : "Thí sinh");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* ── Tiêu đề trang ── */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Tài khoản của tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý thông tin tài khoản cá nhân, thông tin liên lạc và cập nhật mật khẩu bảo mật.
        </p>
      </div>

      {/* ── Hero Profile Summary Card ── */}
      <Card className="overflow-hidden border border-border/70 shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 sm:size-16 ring-2 ring-primary/20 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl font-bold">
                  {getInitials(currentFullName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                    {currentFullName}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5"
                  >
                    {userRole}
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                  <IdCardIcon className="size-3.5" />
                  <span>Mã đăng nhập:</span>
                  <span className="font-mono font-medium text-foreground">
                    {usernameDisplay}
                  </span>
                </p>
              </div>
            </div>

            {/* Trạng thái tài khoản */}
            <div className="self-end sm:self-center">
              <Badge
                variant="outline"
                className="rounded-full border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 py-1 px-3 text-xs font-semibold gap-1.5"
              >
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đang hoạt động</span>
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Grid 2 Cột: Cập nhật thông tin & Đổi mật khẩu ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Cột trái (7/12): Cập nhật thông tin tài khoản ── */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-border/70 shadow-xs">
            <form onSubmit={handleSubmitProfile(onSaveProfile)}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserIcon className="size-4 text-primary" />
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật họ tên và thông tin liên hệ được liên kết với tài khoản này.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Username / CCCD — Không thể sửa */}
                <div className="space-y-1.5">
                  <Label htmlFor="account-username" className="text-xs font-medium text-muted-foreground">
                    Số định danh / CCCD (Tên đăng nhập)
                  </Label>
                  <div className="relative">
                    <Input
                      id="account-username"
                      value={usernameDisplay}
                      disabled
                      className="bg-muted/50 font-mono text-foreground cursor-not-allowed pl-9"
                    />
                    <LockIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    * Mã định danh tài khoản cố định và không thể thay đổi sau khi đăng ký.
                  </p>
                </div>

                {/* Họ và tên */}
                <div className="space-y-1.5">
                  <Label htmlFor="profile-fullname" className="text-xs font-medium">
                    Họ và tên thí sinh <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-fullname"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      aria-invalid={profileErrors.fullName ? true : undefined}
                      className="pl-9"
                      {...registerProfile("fullName")}
                    />
                    <UserIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {profileErrors.fullName && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {profileErrors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="profile-email" className="text-xs font-medium">
                    Địa chỉ Email liên hệ <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-email"
                      type="email"
                      placeholder="example@gmail.com"
                      aria-invalid={profileErrors.email ? true : undefined}
                      className="pl-9"
                      {...registerProfile("email")}
                    />
                    <MailIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {profileErrors.email && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {profileErrors.email.message}
                    </p>
                  )}
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1.5">
                  <Label htmlFor="profile-phone" className="text-xs font-medium">
                    Số điện thoại
                  </Label>
                  <div className="relative">
                    <Input
                      id="profile-phone"
                      type="tel"
                      placeholder="0912345678"
                      aria-invalid={profileErrors.phone ? true : undefined}
                      className="pl-9"
                      {...registerProfile("phone")}
                    />
                    <PhoneIcon className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  {profileErrors.phone && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {profileErrors.phone.message}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-full cursor-pointer hover:bg-primary/90 font-medium gap-2 w-full sm:w-auto"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="size-4" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* ── Cột phải (5/12): Đổi mật khẩu & Bảo mật ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Đổi mật khẩu */}
          <Card className="border border-border/70 shadow-xs">
            <form onSubmit={handleSubmitPassword(onChangePassword)}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <KeyRoundIcon className="size-4 text-primary" />
                  Đổi mật khẩu
                </CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật mật khẩu định kỳ để nâng cao tính an toàn cho tài khoản.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3.5">
                {/* Mật khẩu cũ */}
                <div className="space-y-1.5">
                  <Label htmlFor="old-password" className="text-xs font-medium">
                    Mật khẩu hiện tại <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="old-password"
                    placeholder="Nhập mật khẩu hiện tại"
                    aria-invalid={passwordErrors.oldPassword ? true : undefined}
                    {...registerPassword("oldPassword")}
                  />
                  {passwordErrors.oldPassword && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {passwordErrors.oldPassword.message}
                    </p>
                  )}
                </div>

                {/* Mật khẩu mới */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-medium">
                    Mật khẩu mới <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="new-password"
                    placeholder="Nhập mật khẩu mới"
                    aria-invalid={passwordErrors.newPassword ? true : undefined}
                    {...registerPassword("newPassword")}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-medium">
                    Xác nhận mật khẩu mới <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="confirm-password"
                    placeholder="Nhập lại mật khẩu mới"
                    aria-invalid={passwordErrors.confirmPassword ? true : undefined}
                    {...registerPassword("confirmPassword")}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-[11px] font-medium text-destructive mt-1.5">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Ghi chú quy tắc mật khẩu */}
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border border-border/50">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <InfoIcon className="size-3.5 text-primary" />
                    Quy tắc đặt mật khẩu:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Tối thiểu 8 ký tự (tối đa 72 ký tự).</li>
                    <li>Có ít nhất 1 chữ hoa, 1 chữ thường và 1 số.</li>
                    <li>Có ít nhất 1 ký tự đặc biệt (ví dụ: @, #, $, !...).</li>
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isChangingPassword}
                  className="rounded-full cursor-pointer font-medium gap-2 w-full sm:w-auto"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin text-primary" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="size-4 text-primary" />
                      <span>Đổi mật khẩu</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Card Thông tin hệ thống / Bảo mật */}
          <Card className="border border-border/70 shadow-xs bg-muted/20">
            <CardContent className="p-4 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Ngày tạo tài khoản:</span>
                <span className="font-medium text-foreground">
                  {formatDate(account?.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Lần cập nhật cuối:</span>
                <span className="font-medium text-foreground">
                  {formatDate(account?.updated_at || account?.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hệ thống bảo vệ:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2Icon className="size-3.5" />
                  Mã hóa chuẩn JWT & Bcrypt
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
