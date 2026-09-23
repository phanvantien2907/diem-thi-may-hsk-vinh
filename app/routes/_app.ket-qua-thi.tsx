import type { Route } from "./+types/_app.ket-qua-thi";
import { ComingSoon } from "~/components/shared/ComingSoon";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Tra cứu kết quả thi" },
  {
    name: "description",
    content:
      "Tra cứu kết quả thi HSK máy tính tại Trường Đại học Vinh. Tính năng đang được phát triển.",
  },
];

// ─── Page Component ──────────────────────────────────────────────────────────
export default function KetQuaThiPage() {
  return (
    <ComingSoon
      hanziChar="查"
      heading="Tra cứu kết quả thi"
      description="Hệ thống tra cứu điểm thi HSK trực tuyến đang được xây dựng. Kết quả sẽ được công bố ngay sau kỳ thi."
    />
  );
}
