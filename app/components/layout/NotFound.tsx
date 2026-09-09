/**
 * NotFound.tsx — Giao diện 404 Not Found chuẩn Premium
 *
 * Áp dụng:
 * - @frontend-design: Typography Be Vietnam Pro, ample whitespace, balanced proportions.
 * - @hsk-design-system: Token shadcn, rounded-full button, responsive 320px -> 4K.
 * - @web-design-guidelines: WCAG accessible, focus rings, no overflow.
 */
import * as React from "react";
import { Link } from "react-router";
import { SearchX, GraduationCap, Home } from "lucide-react";
import { Button } from "~/components/ui/button";

export function NotFound() {
  return (
    <main className="relative flex min-h-dvh min-w-0 w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Document metadata (React 19 hoisted) */}
      <title>Không tìm thấy trang</title>

      {/* ── Background Ambient Glow ────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="size-[420px] sm:size-[560px] rounded-full bg-primary/5 blur-[100px] dark:bg-primary/10" />
      </div>

      {/* ── Content Card ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        {/* Institutional Pill Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur-md">
          <GraduationCap className="size-3.5 text-primary shrink-0" aria-hidden="true" />
          <span>Trường Đại học Vinh • Hệ thống đăng ký thi máy HSK</span>
        </div>

        {/* Centerpiece Icon Container */}
        <div className="relative mb-6 flex size-20 sm:size-24 items-center justify-center rounded-3xl border border-border/80 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur-md">
          <div className="flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-muted/60 text-primary transition-transform duration-300 hover:scale-105">
            <SearchX className="size-7 sm:size-8" aria-hidden="true" />
          </div>
          {/* Subtle status code badge */}
          <span className="absolute -bottom-2.5 rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground shadow-xs">
            HTTP 404
          </span>
        </div>

        {/* Heading & Description */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          404 - Không tìm thấy trang
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập.
        </p>

        {/* Call to Action */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Button
            render={<Link to="/" />}
            nativeButton={false}
            size="lg"
            className="w-full sm:w-auto rounded-full cursor-pointer hover:opacity-90 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Home className="size-4" data-icon="inline-start" aria-hidden="true" />
            Quay lại trang chủ
          </Button>
        </div>

        {/* Footer Support Info */}
        <p className="mt-12 text-xs text-muted-foreground/70">
          Nếu bạn cho rằng đây là sự cố hệ thống, vui lòng liên hệ Hội đồng thi HSK Đại học Vinh để được hỗ trợ.
        </p>
      </div>
    </main>
  );
}
