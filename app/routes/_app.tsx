import { redirect, Outlet, useLoaderData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/_app";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { AppSidebar } from "~/components/layout/AppSidebar";
import { DashboardSkeleton } from "~/components/layout/DashboardSkeleton";
import { ContentSkeleton } from "~/components/layout/ContentSkeleton";
import { EyeIcon, ShieldCheckIcon } from "lucide-react";

import { requireAuth } from "~/lib/auth.server";

// ─── Loader — AuthGuard ───────────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  return { user };
}

// ─── Meta ──────────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Trang chủ" },
  {
    name: "description",
    content: "Hệ thống đăng ký thi HSK máy tính Trường Đại học Vinh",
  },
];

// ─── HydrateFallback — Skeleton hiển thị trong quá trình SSR hydration ──────────────
export function HydrateFallback() {
  return <DashboardSkeleton />;
}

// ─── Layout Component ─────────────────────────────────────────────────────────────
export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const isAdmin = user.rawRole === "admin" || user.role === "Quản trị viên" || user.role === "admin";

  return (
    <SidebarProvider>
      {/* Sidebar — tự động collapse thành Sheet trên mobile */}
      <AppSidebar user={user} />

      {/* Main content area */}
      <SidebarInset className="min-w-0 overflow-hidden">
        {/* ── Top bar: Sidebar toggle + breadcrumb area ─────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          {/* Hamburger trigger (mobile) / collapse toggle (desktop) */}
          <SidebarTrigger
            className="-ml-1"
            aria-label="Mở/đóng sidebar điều hướng"
          />
          <Separator orientation="vertical" className="h-5" />
          {/* Breadcrumb slot — children có thể inject qua handle */}
          <div
            id="app-breadcrumb"
            className="flex min-w-0 flex-1 items-center"
            aria-label="Breadcrumb"
          />
        </header>

        {/* ── Admin Preview Notice Banner ─────────────────────────────────── */}
        {isAdmin && (
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 backdrop-blur-md sm:px-6 dark:bg-amber-950/40">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <EyeIcon className="size-3.5" />
              </span>
              <span>
                <strong>Chế độ xem trước dành cho Quản trị viên (Chỉ đọc)</strong>: Bạn đang xem giao diện với tư cách quản trị viên. Các tính năng nộp hồ sơ, đăng ký thi, thanh toán PayOS đã bị vô hiệu hóa để bảo vệ dữ liệu thí sinh.
              </span>
            </div>
            <Link
              to="/trang-quan-tri"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 cursor-pointer shrink-0"
            >
              <ShieldCheckIcon className="size-3.5" />
              Về Trang quản trị
            </Link>
          </div>
        )}

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {isNavigating ? (
            <ContentSkeleton />
          ) : (
            <Outlet context={{ isAdminPreview: isAdmin, user }} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
