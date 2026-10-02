/**
 * app/routes/admin/layout.tsx — Protected Admin Layout Route (AdminAuthGuard)
 *
 * Loader: kiểm tra session + quyền Admin (requireAdminAuth)
 * Nếu không có token -> redirect("/dang-nhap?returnTo=...")
 * Nếu không phải role "admin" -> redirect("/thong-tin-thi-sinh")
 *
 * Layout: SidebarProvider + AdminSidebar + SidebarInset
 */
import * as React from "react";
import { Outlet, useLoaderData, useNavigation, Link } from "react-router";
import type { Route } from "./+types/layout";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { AdminSidebar } from "~/components/layout/AdminSidebar";
import { AppCommandMenu } from "~/components/layout/AppCommandMenu";
import { LogoutDialog } from "~/components/layout/logout-dialog";
import { DashboardSkeleton } from "~/components/layout/DashboardSkeleton";
import { ContentSkeleton } from "~/components/layout/ContentSkeleton";
import { requireAdminAuth } from "~/lib/auth.server";
import { ActivityIcon, ArrowRightLeftIcon, SearchIcon } from "lucide-react";

// ─── Loader — AdminAuthGuard ──────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  return { user, token };
}

// ─── Meta ──────────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Cổng Quản Trị — Vinh University HSK" },
  {
    name: "description",
    content: "Trang quản trị hệ thống đăng ký thi HSK máy tính Trường Đại học Vinh.",
  },
];

// ─── HydrateFallback — Skeleton khi hydrating ──────────────────────────────────
export function HydrateFallback() {
  return <DashboardSkeleton />;
}

// ─── Layout Component ─────────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = React.useState(false);
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent || navigator.platform || "";
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(userAgent));
    }
  }, []);

  return (
    <SidebarProvider>
      {/* Sidebar quản trị */}
      <AdminSidebar
        user={user}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      {/* Main content area */}
      <SidebarInset className="min-w-0 overflow-hidden flex flex-col flex-1 bg-muted/20">
        {/* ── Top bar: Toggle, Breadcrumb, Search, Live Indicator ───────── */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur-md px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SidebarTrigger
              className="-ml-1 cursor-pointer hover:bg-muted rounded-full"
              aria-label="Mở/đóng sidebar điều hướng quản trị"
            />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                Cổng Quản Trị Hệ Thống
              </span>
              <span className="text-muted-foreground/60 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                Đại học Vinh
              </span>
            </div>
          </div>

          {/* Right actions: Search, Live sync & switch link */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick search button in topbar */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs shadow-2xs"
              aria-label="Mở tìm kiếm nhanh quản trị"
            >
              <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span className="hidden lg:inline">Tìm kiếm quản trị, ca thi...</span>
              <span className="lg:hidden hidden sm:inline">Tìm kiếm...</span>
              <kbd className="font-mono text-[10px] bg-muted/80 border px-1.5 py-0.5 rounded text-muted-foreground">
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-background shadow-2xs text-[11px] font-medium text-foreground">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">Hệ thống:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Real-time Live</span>
            </div>

            <Link
              to="/thong-tin-thi-sinh"
              className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 px-3 py-1.5 rounded-full border border-border/70 transition-colors cursor-pointer"
            >
              <ArrowRightLeftIcon className="size-3.5" />
              <span>Góc nhìn Thí sinh</span>
            </Link>
          </div>
        </header>

        {/* ── Main content outlet ────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isNavigating ? <ContentSkeleton /> : <Outlet />}
        </main>
      </SidebarInset>

      {/* ── Global Command Menu for Admin ───────────────────────────────── */}
      <AppCommandMenu
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        isAdmin={true}
        onLogout={() => setIsLogoutDialogOpen(true)}
      />

      <LogoutDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
      />
    </SidebarProvider>
  );
}
