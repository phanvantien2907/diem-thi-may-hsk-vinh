/**
 * DashboardSkeleton — Full-page skeleton cho Dashboard layout
 *
 * Mô phỏng chính xác cấu trúc: Sidebar + Header + Content area.
 * Dùng cho HydrateFallback trong _app.tsx (SSR → Client hydration).
 *
 * Lưu ý: HydrateFallback không thể chứa <Outlet />, nên component này
 * render toàn bộ layout giả trong một khối duy nhất.
 */
import { Skeleton } from "~/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ── Sidebar Skeleton ──────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex w-[var(--sidebar-width,16rem)] shrink-0 flex-col border-r bg-sidebar"
        aria-hidden="true"
      >
        {/* Header: Logo */}
        <div className="p-2">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mx-2 h-px bg-border" />

        {/* Nav items — 4 mục khớp với NAV_ITEMS */}
        <div className="flex-1 p-2">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <Skeleton className="size-4 rounded shrink-0" />
                <Skeleton
                  className="h-3.5 rounded"
                  style={{ width: [100, 120, 140, 112][i] }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div className="mx-2 h-px bg-border" />

        {/* Footer: User Avatar */}
        <div className="p-2">
          <div className="flex items-center gap-3 rounded-xl px-2.5 py-2">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Area Skeleton ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header bar — khớp h-14 */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          <Skeleton className="size-7 rounded-md" />
          <div className="h-5 w-px bg-border" />
          <Skeleton className="h-4 w-32 rounded" />
        </header>

        {/* Content area — khớp padding p-4 sm:p-6 lg:p-8 */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <ContentAreaSkeleton />
        </main>
      </div>
    </div>
  );
}

/**
 * ContentAreaSkeleton — Skeleton cho vùng content bên trong main.
 * Mô phỏng: Page heading + description + placeholder card (rounded-2xl, border-dashed).
 */
export function ContentAreaSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page heading */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>

      {/* Placeholder card — khớp với rounded-2xl border-dashed của CandidatePage */}
      <Skeleton className="min-h-[320px] rounded-2xl" />
    </div>
  );
}
