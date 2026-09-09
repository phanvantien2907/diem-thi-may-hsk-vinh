/**
 * _app.tsx — Protected Layout Route (AuthGuard)
 *
 * Loader: kiểm tra session cookie — redirect("/login") nếu chưa đăng nhập
 * Layout: SidebarProvider + AppSidebar + SidebarInset (main content)
 *
 * Tất cả routes lồng bên trong đây đều được bảo vệ tự động.
 */
import { redirect, Outlet, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/_app";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { AppSidebar } from "~/components/layout/AppSidebar";
import { DashboardSkeleton } from "~/components/layout/DashboardSkeleton";
import { ContentSkeleton } from "~/components/layout/ContentSkeleton";

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

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {isNavigating ? <ContentSkeleton /> : <Outlet />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
