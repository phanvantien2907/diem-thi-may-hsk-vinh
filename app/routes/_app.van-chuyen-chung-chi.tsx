import type { Route } from "./+types/_app.van-chuyen-chung-chi";
import { ComingSoon } from "~/components/shared/ComingSoon";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Vận chuyển chứng chỉ" },
  {
    name: "description",
    content:
      "Đặt dịch vụ vận chuyển chứng chỉ HSK về địa chỉ của bạn. Tính năng đang được phát triển.",
  },
];

// ─── Page Component ──────────────────────────────────────────────────────────
export default function VanChuyenChungChiPage() {
  return (
    <ComingSoon
      hanziChar="证"
      heading="Vận chuyển chứng chỉ"
      description="Dịch vụ giao nhận chứng chỉ HSK tận nhà đang được chuẩn bị. Bạn sẽ sớm nhận được thông báo khi tính năng khả dụng."
    />
  );
}
