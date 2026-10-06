import * as React from "react";
import { Link, useNavigate, useRevalidator, useSearchParams, useOutletContext } from "react-router";
import { cn } from "~/lib/utils";
import { useWebSocket, type WSEvent } from "~/hooks/use-websocket";
import type { Route } from "./+types/_app.dang-ky-thi";
import { requireAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import type {
  ExamType,
  ExamRoom,
  ExamSession,
  ExamSeat,
  ExamRegistration,
  ExamSessionWithSlots,
  AdmissionSlip,
  PaymentDetailData,
  PaymentRecord,
  ApiResponse,
} from "~/types/exam";
import type { CandidateResponseDTO } from "~/types/candidate";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Button, buttonVariants } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "~/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { ExamSessionSelector, formatCurrency } from "~/components/registration/ExamSessionSelector";
import { ConfirmRegistrationDialog } from "~/components/registration/ConfirmRegistrationDialog";
import { RegistrationHistory } from "~/components/registration/RegistrationHistory";
import { PaymentDetailsDialog } from "~/components/registration/PaymentDetailsDialog";
import { usePayOS, type PayOSConfig } from "@payos/payos-checkout";

import {
  BookOpenCheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  FileTextIcon,
  CheckCircle2Icon,
  EyeIcon,
} from "lucide-react";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Đăng ký thi" },
  {
    name: "description",
    content:
      "Đăng ký thi HSK máy tính tại Trường Đại học Vinh. Chọn ca thi, cấp độ và hoàn tất đăng ký.",
  },
];

// ─── Types cho Loader data ────────────────────────────────────────────────────
interface LoaderData {
  token: string;
  apiBaseUrl: string;
  examTypesPromise: Promise<ExamType[]>;
  examRoomsPromise: Promise<ExamRoom[]>;
  sessionsPromise: Promise<ExamSession[]>;
  registrationsPromise: Promise<ExamRegistration[]>;
  seatsDataPromise: Promise<Record<number, number>>;
  profilePromise: Promise<CandidateResponseDTO | null>;
}

// ─── Loader (Server-side Streaming) ───────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireAuth(request);
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch tất cả song song, KHÔNG await — stream xuống client
  const examTypesPromise = fetch(`${API_BASE_URL}/api/v1/exam-types`)
    .then((res) => res.json())
    .then((json: ApiResponse<ExamType[]>) => json.data || [])
    .catch(() => [] as ExamType[]);

  const examRoomsPromise = Promise.resolve([] as ExamRoom[]);

  const sessionsPromise = fetch(`${API_BASE_URL}/api/v1/exam-sessions`)
    .then((res) => res.json())
    .then((json: ApiResponse<ExamSession[]>) => json.data || [])
    .catch(() => [] as ExamSession[]);

  const registrationsPromise = fetch(`${API_BASE_URL}/api/v1/me/registrations`, { headers })
    .then((res) => res.json())
    .then((json: ApiResponse<ExamRegistration[]>) => json.data || [])
    .catch(() => [] as ExamRegistration[]);

  // Tính available_slots cho mỗi session: cần lấy seats cho tất cả sessions
  // Dùng chain promise: sessions → fetch seats cho mỗi session → count available
  const seatsDataPromise = sessionsPromise.then(async (sessions) => {
    const slotsMap: Record<number, number> = {};

    // Fetch seats cho tất cả sessions song song
    const seatRequests = sessions.map(async (session) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/exam-sessions/${session.id}/seats`);
        const json = (await res.json()) as ApiResponse<ExamSeat[]>;
        const seats = json.data || [];
        const available = seats.filter((s) => s.status === "available").length;
        slotsMap[session.id] = available;
      } catch {
        // Fallback: nếu API seats chưa sẵn sàng, dùng capacity
        slotsMap[session.id] = session.capacity;
      }
    });

    await Promise.all(seatRequests);
    return slotsMap;
  });

  // Fetch hồ sơ thí sinh để kiểm tra xem đã cập nhật thông tin chưa
  const profilePromise = fetch(`${API_BASE_URL}/api/v1/me/candidate-profile`, { headers })
    .then((res) => {
      if (res.ok) return res.json() as Promise<ApiResponse<CandidateResponseDTO>>;
      return null;
    })
    .then((result) => result?.data ?? null)
    .catch(() => null);

  return {
    token,
    apiBaseUrl: API_BASE_URL,
    examTypesPromise,
    examRoomsPromise,
    sessionsPromise,
    registrationsPromise,
    seatsDataPromise,
    profilePromise,
  } satisfies LoaderData;
}

// ─── Page Component (Suspense Boundary) ──────────────────────────────────────
export default function DangKyThiPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Tiêu đề trang */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Đăng ký thi HSK
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn ca thi phù hợp và hoàn tất đăng ký thi HSK máy tính.
        </p>
      </div>

      {/* Suspense bọc toàn bộ data-dependent UI */}
      <React.Suspense fallback={<PageSkeleton />}>
        <DataWrapper loaderData={loaderData} />
      </React.Suspense>
    </div>
  );
}

// ─── DataWrapper — Giải nén Promises bằng React.use() ────────────────────────
function DataWrapper({ loaderData }: { loaderData: LoaderData }) {
  const examTypes = React.use(loaderData.examTypesPromise);
  const examRooms = React.use(loaderData.examRoomsPromise);
  const sessions = React.use(loaderData.sessionsPromise);
  const registrations = React.use(loaderData.registrationsPromise);
  const slotsMap = React.use(loaderData.seatsDataPromise);
  const profile = React.use(loaderData.profilePromise);

  // Enrich sessions with type names, room names, and available slots
  const enrichedSessions: ExamSessionWithSlots[] = React.useMemo(() => {
    const typeMap = new Map(examTypes.map((t) => [t.id, t]));
    const roomMap = new Map(examRooms.map((r) => [r.id, r]));

    return sessions
      .filter((s) => s.status === "open") // Chỉ hiển thị ca thi đang mở
      .map((s) => ({
        ...s,
        available_slots: slotsMap[s.id] ?? s.capacity,
        exam_type_name: typeMap.get(s.exam_type_id)?.name,
      }));
  }, [sessions, examTypes, examRooms, slotsMap]);

  // Tạo labels cho bảng lịch sử (chỉ render tên cấp độ thi, bỏ ngày theo yêu cầu)
  const sessionLabels = React.useMemo(() => {
    const labels: Record<number, string> = {};
    const typeMap = new Map(examTypes.map((t) => [t.id, t]));
    for (const s of sessions) {
      const typeName = typeMap.get(s.exam_type_id)?.name || `HSK #${s.exam_type_id}`;
      labels[s.id] = typeName;
    }
    return labels;
  }, [sessions, examTypes]);

  return (
    <RegistrationContent
      sessions={enrichedSessions}
      registrations={registrations}
      sessionLabels={sessionLabels}
      profile={profile}
      token={loaderData.token}
      apiBaseUrl={loaderData.apiBaseUrl}
    />
  );
}

// ─── Pricing Info ──────────────────────────────────────────────────────────────
function PricingInfo({ sessions }: { sessions: ExamSessionWithSlots[] }) {
  // Tập hợp các mức phí duy nhất
  const uniqueFees = React.useMemo(() => {
    const feeMap = new Map<number, { typeName: string; fee: number }>();
    for (const s of sessions) {
      if (!feeMap.has(s.exam_type_id)) {
        feeMap.set(s.exam_type_id, {
          typeName: s.exam_type_name || `Loại thi #${s.exam_type_id}`,
          fee: s.fee,
        });
      }
    }
    return Array.from(feeMap.values());
  }, [sessions]);

  if (uniqueFees.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2.5 text-left font-medium text-foreground">Loại thi</th>
            <th className="px-4 py-2.5 text-right font-medium text-foreground">Lệ phí</th>
          </tr>
        </thead>
        <tbody>
          {uniqueFees.map((item, idx) => (
            <tr
              key={idx}
              className="border-b border-border/40 last:border-0"
            >
              <td className="px-4 py-2.5 text-muted-foreground">{item.typeName}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                {formatCurrency(item.fee)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PayOS Checkout Wrapper ──────────────────────────────────────────────────
function PayOSCheckoutWrapper({
  checkoutUrl,
  amount,
  orderCode,
  onExit,
}: {
  checkoutUrl: string;
  amount?: number;
  orderCode?: string;
  onExit: () => void;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

  const onExitRef = React.useRef(onExit);
  React.useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const config = React.useMemo<PayOSConfig>(
    () => ({
      RETURN_URL: `${origin}/dang-ky-thi?payment=success`,
      ELEMENT_ID: "payos-checkout-iframe",
      CHECKOUT_URL: checkoutUrl,
      embedded: true,
      onSuccess: () => onExitRef.current(),
      onExit: () => onExitRef.current(),
      onCancel: () => onExitRef.current(),
    }),
    [checkoutUrl, origin]
  );

  const { open, exit } = usePayOS(config);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      open();
    }, 50);
    return () => {
      clearTimeout(timer);
      exit();
    };
  }, [checkoutUrl]);

  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onExit(); }}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
        <DialogTitle className="sr-only">Thanh toán PayOS</DialogTitle>
        <div className="grid grid-cols-1 md:grid-cols-5 h-[85vh] sm:h-[650px]">
          {/* Cột trái: Hướng dẫn / Thông tin */}
          <div className="md:col-span-2 bg-slate-50 p-6 md:p-8 border-r border-slate-100 flex flex-col justify-center overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Thanh toán lệ phí thi</h3>
              <p className="text-slate-500 text-sm">Quét mã QR để thanh toán nhanh hoặc chuyển khoản theo thông tin bên dưới.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col text-sm">
                  <span className="text-slate-500 mb-1">Ngân hàng thụ hưởng</span>
                  <span className="font-semibold text-slate-700">Ngân Hàng TMCP Quân Đội (MB Bank)</span>
                </div>
                <div className="flex flex-col text-sm">
                  <span className="text-slate-500 mb-1">Chủ tài khoản</span>
                  <span className="font-semibold text-slate-700 uppercase">Trường Đại Học Vinh</span>
                </div>
                {amount && (
                  <div className="flex flex-col text-sm">
                    <span className="text-slate-500 mb-1">Số tiền</span>
                    <span className="font-bold text-blue-600 text-base">{formatCurrency(amount)}</span>
                  </div>
                )}
                {orderCode && (
                  <div className="flex flex-col text-sm">
                    <span className="text-slate-500 mb-1">Nội dung chuyển khoản (Bắt buộc)</span>
                    <span className="font-bold text-orange-600 text-base tracking-wider bg-orange-50 px-2 py-1 rounded inline-block w-fit">{orderCode}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
                <p className="text-blue-800 font-medium mb-1">💡 Lưu ý quan trọng:</p>
                <ul className="text-blue-700/90 space-y-1.5 list-disc pl-4 text-xs">
                  <li>Vui lòng chuyển <strong>chính xác số tiền</strong> và <strong>nội dung</strong>.</li>
                  <li>Nếu chuyển sai nội dung, hệ thống sẽ không thể tự động xác nhận.</li>
                  <li>Nếu muốn lấy <strong>Số tài khoản</strong> chính xác, hãy bấm qua tab <strong className="text-blue-800">Chuyển khoản</strong> trên màn hình bên cạnh.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Cột phải: PayOS iframe */}
          <div className="md:col-span-3 relative h-full flex flex-col bg-white overflow-hidden">
            <div id="payos-checkout-iframe" className="w-full h-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Content (Memoized) ─────────────────────────────────────────────────
const RegistrationContent = React.memo(function RegistrationContent({
  sessions,
  registrations: initialRegistrations,
  sessionLabels,
  profile,
  token,
  apiBaseUrl,
}: {
  sessions: ExamSessionWithSlots[];
  registrations: ExamRegistration[];
  sessionLabels: Record<number, string>;
  profile: CandidateResponseDTO | null;
  token: string;
  apiBaseUrl: string;
}) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const outletContext = useOutletContext<{ isAdminPreview?: boolean }>() || {};
  const isAdminPreview = Boolean(outletContext?.isAdminPreview);

  // Kiểm tra tài khoản đã cập nhật thông tin cá nhân chưa
  const hasProfile = Boolean(profile && profile.id && profile.full_name && profile.dob);

  // State quản lý
  const [selectedBatchDate, setSelectedBatchDate] = React.useState<string | null>(null);
  const [selectedSession, setSelectedSession] = React.useState<ExamSessionWithSlots | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registrations, setRegistrations] = React.useState(initialRegistrations);
  const [payingId, setPayingId] = React.useState<number | null>(null);
  const [payosCheckoutData, setPayosCheckoutData] = React.useState<{ url: string; amount?: number; orderCode?: string } | null>(null);
  const [paymentDetailData, setPaymentDetailData] = React.useState<PaymentDetailData | null>(null);
  const [isLoadingPaymentDetail, setIsLoadingPaymentDetail] = React.useState(false);
  const [isPaymentSuccessOpen, setIsPaymentSuccessOpen] = React.useState(false);

  // Cập nhật danh sách đăng ký khi prop thay đổi
  React.useEffect(() => {
    setRegistrations(initialRegistrations);
  }, [initialRegistrations]);

  // Kiểm tra callback sau khi thanh toán từ cổng PayOS quay về (Return URL)
  React.useEffect(() => {
    const paymentParam = searchParams.get("payment");
    const statusParam = searchParams.get("status");

    if (paymentParam === "success" || statusParam === "PAID") {
      setIsPaymentSuccessOpen(true);
      // Tải lại dữ liệu phiếu đăng ký mới nhất từ server
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
      // Dọn sạch query params trên URL mà không reload trang
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment");
      newParams.delete("status");
      newParams.delete("code");
      newParams.delete("id");
      newParams.delete("orderCode");
      newParams.delete("cancel");
      setSearchParams(newParams, { replace: true });
    } else if (paymentParam === "cancel" || statusParam === "CANCELLED") {
      toast.add({
        type: "info",
        title: "Giao dịch thanh toán đã hủy",
        description: "Bạn có thể tiến hành thanh toán lại bất kỳ lúc nào trước khi hết thời gian giữ chỗ.",
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment");
      newParams.delete("status");
      newParams.delete("code");
      newParams.delete("id");
      newParams.delete("orderCode");
      newParams.delete("cancel");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, revalidator]);

  // Thiết lập WebSocket
  useWebSocket({
    url: apiBaseUrl,
    token,
    onMessage: (event: WSEvent) => {
      console.log("[WS] Received event:", event.type, event.payload);
      switch (event.type) {
        case "registration_created":
        case "registration_cancelled":
        case "payment_confirmed":
        case "seat_updated":
        case "seats_released":
          // Gọi revalidator để tải lại toàn bộ data mới từ server
          if (revalidator.state === "idle") {
            revalidator.revalidate();
          }
          break;
      }
    },
  });

  // Map lệ phí theo session_id
  const sessionFees = React.useMemo(() => {
    const map: Record<number, number> = {};
    for (const s of sessions) {
      map[s.id] = s.fee;
    }
    return map;
  }, [sessions]);

  // Xử lý tạo link thanh toán PayOS
  const handlePayment = React.useCallback(
    async (reg: ExamRegistration) => {
      if (isAdminPreview) {
        toast.add({
          type: "warning",
          title: "Chế độ xem trước dành cho Quản trị viên",
          description: "Thao tác kết nối thanh toán PayOS bị vô hiệu hóa để bảo vệ dữ liệu thực.",
        });
        return;
      }
      try {
        setPayingId(reg.id);
        toast.add({
          type: "info",
          title: "Đang kết nối cổng thanh toán PayOS...",
          description: "Vui lòng chờ trong giây lát.",
        });

        const origin =
          typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
        const returnUrl = `${origin}/dang-ky-thi?payment=success`;
        const cancelUrl = `${origin}/dang-ky-thi?payment=cancel`;

        const res = await fetch(`${apiBaseUrl}/api/v1/payments/payos/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exam_registration_id: reg.id,
            return_url: returnUrl,
            cancel_url: cancelUrl,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorMsg =
            errorData?.msg || errorData?.error || "Không thể tạo liên kết thanh toán PayOS.";
          toast.add({ type: "error", title: errorMsg });
          setPayingId(null);
          return;
        }

        const result = await res.json();
        const checkoutUrl = result?.data?.checkout_url || result?.data?.checkoutUrl;

        if (checkoutUrl) {
          toast.add({
            type: "success",
            title: "Khởi tạo thành công!",
            description: "Đang mở mã QR thanh toán PayOS...",
          });
          // Hiển thị dialog/modal QR của PayOS thay vì redirect
          setPayosCheckoutData({
            url: checkoutUrl,
            amount: result?.data?.amount,
            orderCode: result?.data?.transaction_ref || result?.data?.transactionRef,
          });
        } else {
          toast.add({
            type: "error",
            title: "Không tìm thấy URL thanh toán từ PayOS.",
          });
          setPayingId(null);
        }
      } catch (err) {
        console.error("[PayOS] Error:", err);
        toast.add({
          type: "error",
          title: "Lỗi kết nối khi khởi tạo thanh toán",
          description: "Vui lòng kiểm tra lại mạng hoặc thử lại sau.",
        });
        setPayingId(null);
      }
    },
    [apiBaseUrl, token]
  );

  // Xử lý hủy phiếu đăng ký
  const handleCancelRegistration = React.useCallback(
    async (reg: ExamRegistration) => {
      if (isAdminPreview) {
        toast.add({
          type: "warning",
          title: "Chế độ xem trước dành cho Quản trị viên",
          description: "Thao tác hủy phiếu đăng ký bị khóa đối với tài khoản quản trị.",
        });
        return;
      }
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/me/registrations/${reg.id}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorMsg =
            errorData?.msg || errorData?.error || "Không thể hủy đăng ký.";
          toast.add({ type: "error", title: errorMsg });
          return;
        }

        // Cập nhật trạng thái phiếu đăng ký
        setRegistrations((prev) =>
          prev.map((r) => (r.id === reg.id ? { ...r, status: "cancelled" } : r))
        );

        toast.add({
          type: "success",
          title: "Hủy đăng ký thành công",
        });


      } catch (err) {
        console.error("[Cancel Registration] Error:", err);
        toast.add({
          type: "error",
          title: "Lỗi kết nối khi hủy đăng ký",
        });
      }
    },
    [apiBaseUrl, token, navigate]
  );

  // Xử lý lấy và xem chi tiết giao dịch thanh toán
  const handleViewPaymentDetails = React.useCallback(
    async (reg: ExamRegistration) => {
      // Tìm session tương ứng
      const session = sessions.find((s) => s.id === reg.exam_session_id);
      const typeName = session?.exam_type_name || sessionLabels[reg.exam_session_id];

      // Set dữ liệu ban đầu để mở Dialog lập tức (trải nghiệm mượt)
      const initialData: PaymentDetailData = {
        registration: reg,
        session: session,
        examTypeName: typeName,
        candidateName: profile?.full_name,
        roomName: session?.exam_room_name,
        roomLocation: session?.exam_room_location,
      };

      setPaymentDetailData(initialData);
      setIsLoadingPaymentDetail(true);

      try {
        const candidateId = profile?.id || reg.candidate_id;
        const res = await fetch(
          `${apiBaseUrl}/api/v1/payments?candidate_id=${candidateId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const result = await res.json();
          const payments: PaymentRecord[] = result?.data || [];
          // Tìm giao dịch khớp với phiếu đăng ký này
          const matchedPayment = payments.find(
            (p) => p.exam_registration_id === reg.id
          );
          if (matchedPayment) {
            setPaymentDetailData((prev) =>
              prev ? { ...prev, payment: matchedPayment } : prev
            );
          }
        }
      } catch (err) {
        console.error("[Payment Details] Error fetching payments:", err);
      } finally {
        setIsLoadingPaymentDetail(false);
      }
    },
    [apiBaseUrl, token, sessions, sessionLabels, profile]
  );

  // Nhóm ca thi theo đợt (ngày thi)
  const batches = React.useMemo(() => {
    const map = new Map<string, ExamSessionWithSlots[]>();
    for (const s of sessions) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [sessions]);

  // Default đợt thi còn hạn đầu tiên (hoặc đợt đầu tiên nếu tất cả đều hết hạn)
  React.useEffect(() => {
    if (!selectedBatchDate && batches.length > 0) {
      const firstAvailableBatch = batches.find(([, batchSessions]) =>
        batchSessions.some((s) => new Date(s.registration_deadline) >= new Date())
      );
      setSelectedBatchDate(firstAvailableBatch ? firstAvailableBatch[0] : batches[0][0]);
    }
  }, [batches, selectedBatchDate]);

  // Lọc ca thi theo đợt đang chọn
  const currentBatchSessions = React.useMemo(() => {
    if (!selectedBatchDate) return [];
    const found = batches.find((b) => b[0] === selectedBatchDate);
    return found ? found[1] : [];
  }, [batches, selectedBatchDate]);

  // Reset selected session khi đổi đợt thi
  React.useEffect(() => {
    setSelectedSession(null);
  }, [selectedBatchDate]);

  // Xử lý chọn ca thi
  const handleSelectSession = React.useCallback((session: ExamSessionWithSlots) => {
    setSelectedSession((prev) => (prev?.id === session.id ? null : session));
  }, []);

  // Mở dialog xác nhận (hoặc toast thông báo nếu chưa cập nhật thông tin thí sinh)
  const handleOpenConfirm = React.useCallback(() => {
    if (isAdminPreview) {
      toast.add({
        type: "warning",
        title: "Chế độ xem trước dành cho Quản trị viên",
        description: "Bạn đang ở chế độ xem trước (Chỉ đọc), không thể thực hiện đăng ký thi.",
      });
      return;
    }
    if (!hasProfile) {
      toast.add({
        type: "error",
        title: "Vui lòng cập nhật thông tin cá nhân",
        description: "Bạn cần hoàn thiện thông tin thí sinh trước khi đăng ký ca thi.",
      });
      return;
    }
    if (!selectedSession) {
      toast.add({ type: "warning", title: "Vui lòng chọn ca thi trước khi đăng ký." });
      return;
    }
    setIsDialogOpen(true);
  }, [hasProfile, selectedSession]);

  // Submit đăng ký thi
  const handleConfirmRegistration = React.useCallback(async () => {
    if (isAdminPreview) {
      toast.add({
        type: "warning",
        title: "Chế độ xem trước",
        description: "Thao tác gửi đăng ký bị chặn trong chế độ xem trước.",
      });
      return;
    }
    if (!selectedSession) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/me/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exam_session_id: selectedSession.id }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMsg =
          errorData?.msg || errorData?.error || "Có lỗi xảy ra, vui lòng thử lại.";
        toast.add({ type: "error", title: errorMsg });
        setIsSubmitting(false);
        return;
      }

      const result = await res.json();
      const newRegistration = result.data as ExamRegistration;

      // Cập nhật danh sách đăng ký local
      setRegistrations((prev) => [newRegistration, ...prev]);

      // Đóng dialog + reset selection
      setIsDialogOpen(false);
      setSelectedSession(null);
      setIsSubmitting(false);

      // Hiện toast thành công
      toast.add({ type: "success", title: "Đăng ký thi thành công!", description: "Ghế đã được giữ trong 15 phút." });


    } catch (error) {
      console.error("[Registration] Submit error:", error);
      toast.add({ type: "error", title: "Không thể kết nối đến máy chủ. Vui lòng thử lại." });
      setIsSubmitting(false);
    }
  }, [selectedSession, token, navigate]);

  return (
    <div className="space-y-6">
      {/* Banner cảnh báo chưa cập nhật thông tin thí sinh */}
      {!hasProfile && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
          <div className="flex items-center gap-2.5">
            <AlertTriangleIcon className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-semibold text-destructive">Tài khoản chưa cập nhật hồ sơ thí sinh</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bạn cần hoàn thiện thông tin cá nhân và giấy tờ tùy thân trước khi tiến hành đăng ký thi.
              </p>
            </div>
          </div>
          <Link
            to="/thong-tin-thi-sinh"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full shrink-0 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            Cập nhật hồ sơ
          </Link>
        </div>
      )}

      {/* ── Card 1: Chọn ca thi ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheckIcon className="size-5 text-primary" aria-hidden="true" />
            Chọn ca thi
          </CardTitle>
          <CardDescription>
            Chọn ca thi phù hợp với lịch trình của bạn. Số ghế trống được hiển thị trên mỗi thẻ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lựa chọn Đợt thi */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-foreground">1. Chọn đợt thi:</h3>
            <div className="flex flex-wrap gap-2">
              {batches.map(([date, batchSessions]) => {
                const isSelected = date === selectedBatchDate;
                const isDeadlinePassed = batchSessions.every(
                  (s) => new Date(s.registration_deadline) < new Date()
                );
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedBatchDate(date)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border px-4 py-2 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/30",
                      isDeadlinePassed && !isSelected && "opacity-60 grayscale cursor-not-allowed"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {new Date(date).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    {isDeadlinePassed ? (
                      <span className="text-xs font-medium text-destructive mt-1">Đã hết hạn</span>
                    ) : (
                      <span className="text-xs text-muted-foreground mt-1">Đang mở đăng ký</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="mb-3 text-sm font-medium text-foreground">2. Chọn ca thi:</h3>
          <ExamSessionSelector
            sessions={currentBatchSessions}
            selectedSessionId={selectedSession?.id ?? null}
            onSelect={handleSelectSession}
            highlightLevel={searchParams.get("level")}
          />

          {/* Nút đăng ký — chỉ hiện khi đã chọn ca thi */}
          {selectedSession && (
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-3">
              {isAdminPreview && (
                <Badge variant="outline" className="rounded-full text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300">
                  <EyeIcon className="size-3.5 mr-1" />
                  Xem trước (Chỉ đọc)
                </Badge>
              )}
              {!hasProfile && !isAdminPreview && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertTriangleIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span>Chưa cập nhật thông tin cá nhân</span>
                </div>
              )}
              <Button
                size="lg"
                disabled={isAdminPreview || !hasProfile}
                className={cn(
                  "rounded-full cursor-pointer hover:bg-primary/90",
                  (!hasProfile || isAdminPreview) && "opacity-75 cursor-not-allowed"
                )}
                onClick={handleOpenConfirm}
              >
                {isAdminPreview ? "Đăng ký thi (Xem trước)" : "Đăng ký thi"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Lưu ý quan trọng */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              Lưu ý quan trọng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Ghế được giữ tối đa <strong className="text-foreground">15 phút</strong> sau khi đăng ký. Vui lòng thanh toán kịp thời.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Mỗi thí sinh chỉ được đăng ký <strong className="text-foreground">một lần</strong> cho mỗi ca thi.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Đảm bảo hồ sơ thí sinh đã hoàn thiện trước khi đăng ký.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <span>Liên hệ Trung tâm Khảo thí nếu cần hỗ trợ chuyển ca thi.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Bảng lệ phí */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfoIcon className="size-4 text-primary" aria-hidden="true" />
              Lệ phí thi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PricingInfo sessions={sessions} />
          </CardContent>
        </Card>
      </div>

      {/* ── Card 3: Lịch sử đăng ký ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử đăng ký</CardTitle>
          <CardDescription>
            Danh sách các lần đăng ký thi HSK của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationHistory
            registrations={registrations}
            sessionLabels={sessionLabels}
            sessionFees={sessionFees}
            payingId={payingId}
            onPayment={handlePayment}
            onCancel={handleCancelRegistration}
            onViewPaymentDetails={handleViewPaymentDetails}
            isAdminPreview={isAdminPreview}
          />
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ──────────────────────────────────────────────── */}
      <ConfirmRegistrationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        session={selectedSession}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmRegistration}
      />

      {/* ── Dialog Chi tiết thanh toán ────────────────────────────────────────── */}
      <PaymentDetailsDialog
        open={Boolean(paymentDetailData)}
        onOpenChange={(open) => !open && setPaymentDetailData(null)}
        data={paymentDetailData}
        isLoading={isLoadingPaymentDetail}
      />

      {/* ── Dialog Thanh toán thành công ──────────────── */}
      <Dialog
        open={isPaymentSuccessOpen}
        onOpenChange={setIsPaymentSuccessOpen}
      >
        <DialogContent className="sm:max-w-md p-6">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 ring-8 ring-emerald-500/5">
            <CheckCircle2Icon className="size-7" />
          </div>

          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-lg font-bold text-foreground">
              Thanh toán thành công!
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Giao dịch qua cổng PayOS đã hoàn tất. Phiếu đăng ký và ghế thi của bạn đã được xác nhận chính thức.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-2.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cổng thanh toán:</span>
              <span className="font-semibold text-foreground">VietQR / PayOS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trạng thái phiếu:</span>
              <Badge
                variant="outline"
                className="rounded-full border-emerald-400/50 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />
                Đã xác nhận
              </Badge>
            </div>
            <div className="border-t border-border/40 pt-2 text-muted-foreground leading-relaxed">
              💡 Thí sinh có thể xem lại biên lai và chi tiết giao dịch tại mục <strong>Hành động → Xem chi tiết thanh toán</strong> trong bảng lịch sử đăng ký bên dưới.
            </div>
          </div>

          <DialogFooter className="sm:justify-center mt-2">
            <Button
              className="rounded-full cursor-pointer w-full font-medium"
              onClick={() => setIsPaymentSuccessOpen(false)}
            >
              Hoàn tất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PayOS Checkout Modal ──────────────────────────────────────────────── */}
      {payosCheckoutData && (
        <PayOSCheckoutWrapper
          checkoutUrl={payosCheckoutData.url}
          amount={payosCheckoutData.amount}
          orderCode={payosCheckoutData.orderCode}
          onExit={() => {
            setPayosCheckoutData(null);
            setPayingId(null);
          }}
        />
      )}
    </div>
  );
});

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton cho card chọn ca thi */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skeleton cho lưu ý + bảng giá */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      {/* Skeleton cho lịch sử */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-1 h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
