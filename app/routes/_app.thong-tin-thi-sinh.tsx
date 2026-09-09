/**
 * Candidate module — /thong-tin-thi-sinh
 * Placeholder route — module Đăng ký thi (chưa triển khai)
 */
import type { Route } from "./+types/_app.thong-tin-thi-sinh";

export const meta: Route.MetaFunction = () => [
  { title: "Đăng ký thi — HSK Đại học Vinh" },
  {
    name: "description",
    content: "Đăng ký tham dự kỳ thi HSK máy tính tại Trường Đại học Vinh",
  },
];

export default function CandidatePage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Đăng ký thi
        </h1>
        <p className="text-sm text-muted-foreground">
          Module đăng ký thi HSK — đang trong quá trình phát triển.
        </p>
      </div>

      {/* Placeholder card */}
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            {/* Construction icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-7 text-muted-foreground"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              Module Đăng ký thi
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tính năng đang được phát triển. Vui lòng quay lại sau.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
