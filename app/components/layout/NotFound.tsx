/**
 * NotFound.tsx — 404 Page
 *
 * Thiết kế: Tối giản, tĩnh lặng, tự tin.
 * Chữ số 404 lớn tạo ấn tượng thị giác duy nhất; mọi thứ còn lại lui về nền.
 * Không icon container, không glass card, không ambient glow — chỉ typography thuần túy.
 */
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

export function NotFound() {
  return (
    <main className="flex min-h-dvh min-w-0 w-full flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
      <title>Không tìm thấy trang</title>

      <div className="flex w-full max-w-sm flex-col items-center">
        {/* ── Con số 404 — điểm nhấn thị giác duy nhất ─────────────────────── */}
        <p
          aria-hidden="true"
          className="select-none text-[8rem] font-extrabold leading-none tracking-tighter text-foreground/[0.06] sm:text-[10rem]"
        >
          404
        </p>

        {/* ── Nội dung — đặt chồng nhẹ lên phần dưới của con số ────────────── */}
        <div className="-mt-8 flex flex-col items-center gap-3 sm:-mt-10">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Không tìm thấy trang
          </h1>

          <p className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
            Trang bạn tìm không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập.
          </p>

          <Button
            render={<Link to="/" />}
            nativeButton={false}
            size="lg"
            className="mt-4 rounded-full cursor-pointer"
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </main>
  );
}
