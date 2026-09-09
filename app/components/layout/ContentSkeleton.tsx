/**
 * ContentSkeleton — Skeleton cho vùng content khi chuyển trang nội bộ
 *
 * Dùng khi user click vào một nav item trên Sidebar.
 * Sidebar đã render sẵn, chỉ content area cần skeleton.
 */
import { Skeleton } from "~/components/ui/skeleton";

export function ContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 duration-150">
      {/* Page heading */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40 rounded" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>

      {/* Content placeholder — khớp min-h-[320px] rounded-2xl */}
      <Skeleton className="min-h-[320px] rounded-2xl" />
    </div>
  );
}
