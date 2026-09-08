/**
 * Auth Layout — Full-screen background image + glassmorphism card
 *
 * Thiết kế:
 * - bg-dhv.jpg (ảnh lễ tốt nghiệp Đại học Vinh) làm backdrop toàn màn hình
 * - Gradient scrim nhẹ để đảm bảo contrast form
 * - Logo + tên trường phía trên glass card
 * - Glass card: backdrop-blur + bg-white/85 + shadow-2xl
 * - Mobile: full-width, Desktop: centered max-w-md
 */
import { Outlet, Link } from "react-router";
import type { Route } from "./+types/layout";

export const meta: Route.MetaFunction = () => [
  { title: "HSK — Trường Đại học Vinh" },
];

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      {/* ── Background image ─────────────────────────────────────────────────── */}
      <img
        src="/bg-dhv.jpg"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-center"
        width={1280}
        height={853}
      />

      {/* ── Gradient scrim — nhẹ, bảo toàn ảnh ─────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/50"
      />

      {/* ── Content wrapper ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex w-full flex-col items-center gap-6 px-4 py-8 sm:px-6 sm:py-10">

        {/* Logo + tên trường */}
        <Link
          to="/"
          className="group flex flex-col items-center gap-2 text-center"
          aria-label="Trang chủ — Đại học Vinh"
        >
          {/* Emblem */}
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40 backdrop-blur-sm transition-all group-hover:bg-white/30 group-hover:ring-white/60">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-8 text-white drop-shadow"
              aria-hidden="true"
            >
              <path
                d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"
                fill="currentColor"
                opacity="0.95"
              />
              <path
                d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"
                fill="currentColor"
                opacity="0.65"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-white/70 tracking-widest uppercase drop-shadow">
              Trường
            </span>
            <span className="text-lg font-bold text-white leading-tight drop-shadow-md">
              Đại học Vinh
            </span>
          </div>
        </Link>

        {/* ── Glassmorphism form card ──────────────────────────────────────── */}
        <div
          className={[
            // Glass effect
            "w-full max-w-md min-w-0",
            "rounded-2xl border border-white/25",
            "bg-white/88 backdrop-blur-md",
            "shadow-2xl shadow-black/20",
            // Padding
            "px-6 py-7 sm:px-8 sm:py-8",
          ].join(" ")}
        >
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 drop-shadow">
          © {new Date().getFullYear()} Trường Đại học Vinh. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
