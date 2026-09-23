
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

interface ComingSoonProps {
  /** Ký tự Hán hiển thị làm điểm nhấn (vd: "查", "证") */
  hanziChar: string;
  /** Tiêu đề trang (vd: "Tra cứu kết quả") */
  heading: string;
  /** Mô tả ngắn về tính năng */
  description: string;
  className?: string;
}

export function ComingSoon({
  hanziChar,
  heading,
  description,
  className,
}: ComingSoonProps) {
  return (
    <section
      className={cn(
        "flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center px-4 py-16 text-center",
        "animate-in fade-in duration-700",
        className
      )}
      aria-labelledby="coming-soon-heading"
    >
      {/* ── Điểm nhấn thị giác: ký tự Hán ──────────────────────────────── */}
      <div
        className="relative mb-8 select-none"
        aria-hidden="true"
      >
        {/* Vòng hào quang mờ phía sau */}
        <div className="absolute inset-0 scale-150 rounded-full bg-primary/6 blur-2xl" />
        {/* Ký tự chính */}
        <span
          className={cn(
            "relative block text-[7rem] leading-none font-bold tracking-tighter",
            "text-primary/15",
            // Chữ Hán render rõ hơn với font system CJK
            "font-['system-ui','Noto_Serif_SC','Songti_SC',serif]"
          )}
        >
          {hanziChar}
        </span>
        {/* Badge "Đang phát triển" đặt chồng góc phải dưới */}
        <span
          className={cn(
            "absolute -bottom-1 -right-3",
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
            "bg-primary/10 text-primary",
            "text-xs font-semibold tracking-wide",
            "ring-1 ring-primary/20"
          )}
        >
          {/* Chấm nhấp nháy — trạng thái "đang chạy" */}
          <span
            className="size-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
          Sắp ra mắt
        </span>
      </div>

      {/* ── Nội dung văn bản ────────────────────────────────────────────── */}
      <div className="flex max-w-sm flex-col gap-3">
        <h1
          id="coming-soon-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {heading}
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>

        <p className="text-sm font-medium text-muted-foreground/70">
          Tính năng này đang được phát triển.
        </p>
      </div>

      {/* ── Hành động ───────────────────────────────────────────────────── */}
      <div className="mt-8">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/thong-tin-thi-sinh" />}
          className="rounded-full cursor-pointer"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Quay lại trang chủ
        </Button>
      </div>

      {/* ── Footer note ─────────────────────────────────────────────────── */}
      <p className="mt-12 text-xs text-muted-foreground/50 max-w-xs">
        Trung tâm Khảo thí — Trường Đại học Vinh
      </p>
    </section>
  );
}
