import * as React from "react";
import { useFetcher } from "react-router";
import {
  UsersRoundIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Undo2Icon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  FileTextIcon,
  Image as ImageIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  LockIcon,
  KeyRoundIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { maskAddress, maskDocumentNumber, maskEmail, maskPhoneNumber } from "~/lib/mask";
import { CandidateSecurePhotoCard } from "~/components/dashboard/CandidateSecurePhotoCard";
import { useAdminPiiPinGateway } from "~/components/dashboard/AdminPiiPinGateway";
import type { AdminCandidateResponseDTO, ApiEnvelope } from "~/types/admin";

export function EmptyFieldBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-normal text-muted-foreground border-dashed border-border/80 bg-muted/30 select-none inline-flex items-center gap-1 shrink-0 ${
        className || ""
      }`}
    >
      Chưa cập nhật
    </Badge>
  );
}

function isEmptyFieldValue(value: React.ReactNode): boolean {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    value === "—" ||
    (typeof value === "string" && ["null", "undefined"].includes(value.trim().toLowerCase()))
  ) {
    return true;
  }
  return false;
}

export function renderFieldOrBadge(value: React.ReactNode, className?: string): React.ReactNode {
  return isEmptyFieldValue(value) ? <EmptyFieldBadge className={className} /> : value;
}

export function formatGender(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === "male") return "Nam";
  if (value === "female") return "Nữ";
  if (value === "other") return "Khác";
  return value;
}

export function formatDateOrBadge(value: string | null | undefined, includeSeconds = false): React.ReactNode {
  if (!value) return <EmptyFieldBadge />;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <EmptyFieldBadge />;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  if (!includeSeconds) {
    return `${d}/${m}/${y}`;
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

export interface CandidateDetailDialogProps {
  candidate: AdminCandidateResponseDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (c: AdminCandidateResponseDTO) => void;
  onReject: (c: AdminCandidateResponseDTO) => void;
  onReapprove?: (c: AdminCandidateResponseDTO) => void;
  onRevoke?: (c: AdminCandidateResponseDTO) => void;
  onPreviewImage: (url: string) => void;
}

export function CandidateDetailDialog({
  candidate: initialCandidate,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onReapprove,
  onRevoke,
  onPreviewImage,
}: CandidateDetailDialogProps) {
  const fetcher = useFetcher<ApiEnvelope<AdminCandidateResponseDTO>>();
  const {
    isPiiUnlocked,
    piiAccessToken,
    remainingUnlockSeconds,
    lockEpoch,
    requestPiiUnlock,
    lockPiiNow,
    openPinSetupDialog,
  } = useAdminPiiPinGateway();

  // Trạng thái mở xem ảnh bảo mật thị giác (Visual PII Protection §NĐ 13/2023)
  const [revealedImages, setRevealedImages] = React.useState<Record<string, boolean>>({});
  const [unlockedCandidate, setUnlockedCandidate] =
    React.useState<AdminCandidateResponseDTO | null>(null);
  const [isFetchingUnlockedPii, setIsFetchingUnlockedPii] = React.useState(false);

  // Tự động che mờ lại khi đóng dialog, đổi thí sinh, hoặc hết hạn 5 phút mở khóa PIN
  React.useEffect(() => {
    if (!open) {
      setRevealedImages({});
      setUnlockedCandidate(null);
    }
  }, [open]);

  React.useEffect(() => {
    setRevealedImages({});
    setUnlockedCandidate(null);
  }, [initialCandidate?.id, lockEpoch]);

  // Tải chi tiết dữ liệu mới nhất từ server khi mở dialog (§3.10)
  React.useEffect(() => {
    if (open && initialCandidate?.id) {
      fetcher.load(`/internal/admin/candidates/${initialCandidate.id}`);
    }
  }, [open, initialCandidate?.id]);

  // Hợp nhất dữ liệu: ưu tiên dữ liệu đã mở khóa PII (nếu khớp ID), sau đó đến dữ liệu mới nhất từ API
  const baseCandidate: AdminCandidateResponseDTO | null = initialCandidate
    ? fetcher.data?.success && fetcher.data.data
      ? fetcher.data.data
      : initialCandidate
    : null;

  const freshCandidate: AdminCandidateResponseDTO | null =
    baseCandidate &&
    unlockedCandidate &&
    unlockedCandidate.id === baseCandidate.id &&
    isPiiUnlocked
      ? unlockedCandidate
      : baseCandidate;

  const fetchUnlockedCandidateData = React.useCallback(
    async (
      candidateId: number,
      token: string
    ): Promise<AdminCandidateResponseDTO | null> => {
      setIsFetchingUnlockedPii(true);
      try {
        const res = await fetch(
          `/internal/admin/candidates/${candidateId}?pii_token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "X-PII-Access-Token": token,
            },
          }
        );
        const payload = (await res
          .json()
          .catch(() => null)) as ApiEnvelope<AdminCandidateResponseDTO> | null;
        if (
          !res.ok ||
          !payload?.success ||
          !payload.data ||
          payload.data.latest_document?.pii_locked === true
        ) {
          lockPiiNow();
          return null;
        }
        setUnlockedCandidate(payload.data);
        return payload.data;
      } catch {
        return null;
      } finally {
        setIsFetchingUnlockedPii(false);
      }
    },
    [lockPiiNow]
  );

  if (!freshCandidate) return null;

  const doc = freshCandidate.latest_document;
  const docStatus = doc?.verification_status || "pending";
  const isPassport = doc?.doc_type === "passport";
  const isFetchingDetail = fetcher.state === "loading";

  const hasUnlockedUrls = Boolean(
    doc &&
      doc.pii_locked === false &&
      (doc.front_image_url || doc.back_image_url || doc.portrait_image_url)
  );

  const toggleImageReveal = (key: string) => {
    if (revealedImages[key]) {
      setRevealedImages((prev) => ({
        ...prev,
        [key]: false,
      }));
      return;
    }

    const candidateId = freshCandidate.id;

    if (isPiiUnlocked && piiAccessToken) {
      if (hasUnlockedUrls) {
        setRevealedImages((prev) => ({
          ...prev,
          [key]: true,
        }));
      } else {
        void fetchUnlockedCandidateData(candidateId, piiAccessToken).then((data) => {
          if (data) {
            setRevealedImages((prev) => ({
              ...prev,
              [key]: true,
            }));
          }
        });
      }
      return;
    }

    requestPiiUnlock(async (token) => {
      const data = await fetchUnlockedCandidateData(candidateId, token);
      if (data) {
        setRevealedImages((prev) => ({
          ...prev,
          [key]: true,
        }));
      }
    });
  };

  const hasAnyRevealed = Boolean(
    revealedImages["front"] || revealedImages["back"] || revealedImages["portrait"]
  );

  const toggleAllImages = () => {
    if (hasAnyRevealed) {
      setRevealedImages({});
      return;
    }

    const candidateId = freshCandidate.id;

    if (isPiiUnlocked && piiAccessToken) {
      if (hasUnlockedUrls) {
        setRevealedImages({
          front: true,
          back: true,
          portrait: true,
        });
      } else {
        void fetchUnlockedCandidateData(candidateId, piiAccessToken).then((data) => {
          if (data) {
            setRevealedImages({
              front: true,
              back: true,
              portrait: true,
            });
          }
        });
      }
      return;
    }

    requestPiiUnlock(async (token) => {
      const data = await fetchUnlockedCandidateData(candidateId, token);
      if (data) {
        setRevealedImages({
          front: true,
          back: true,
          portrait: true,
        });
      }
    });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="min-w-0 p-4 pb-3 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Thí sinh #{freshCandidate.id}
            </Badge>
            <span className="text-xs text-muted-foreground/60">•</span>
            {docStatus === "verified" ? (
              <Badge className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Đã duyệt hợp lệ
              </Badge>
            ) : docStatus === "rejected" ? (
              <Badge variant="destructive" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-white dark:bg-foreground" />
                Đã từ chối
              </Badge>
            ) : (
              <Badge className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Chờ phê duyệt
              </Badge>
            )}
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[10px] font-medium border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 select-none ml-auto"
            >
              Bảo mật PII • NĐ 13/2023
            </Badge>
            {isFetchingDetail && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCwIcon className="size-3 animate-spin text-primary" />
                Đang đồng bộ...
              </span>
            )}
          </div>
          <DialogTitle className="min-w-0 truncate text-base font-bold text-foreground">
            {renderFieldOrBadge(freshCandidate.full_name)}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Đối chiếu thông tin giấy tờ tùy thân và xác minh điều kiện dự thi HSK.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 p-4 overflow-y-auto max-h-[65vh] space-y-3.5">
          {/* Cảnh báo lý do từ chối nếu có */}
          {docStatus === "rejected" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-destructive space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <XCircleIcon className="size-4" />
                Lý do từ chối hồ sơ:
              </p>
              <p className="break-words leading-relaxed pl-5.5 text-foreground/90 font-medium">
                {renderFieldOrBadge(doc?.rejection_reason)}
              </p>
            </div>
          )}

          {/* Section 1: Thông tin nhân thân thí sinh */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UsersRoundIcon className="size-3.5 text-primary" />
              Thông tin nhân thân thí sinh
            </h4>
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Họ và tên đầy đủ</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {renderFieldOrBadge(freshCandidate.full_name)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Tên tiếng Trung</p>
                <div className="mt-0.5 min-w-0 break-words text-sm font-semibold text-foreground">
                  {renderFieldOrBadge(freshCandidate.full_name_cn)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Ngày tháng năm sinh</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {formatDateOrBadge(freshCandidate.dob)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Giới tính & Quốc tịch</p>
                <div className="mt-0.5 font-semibold text-foreground flex flex-wrap items-center gap-1.5">
                  <span>{renderFieldOrBadge(formatGender(freshCandidate.gender))}</span>
                  <span>•</span>
                  <span>{renderFieldOrBadge(freshCandidate.nationality)}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Dân tộc</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {renderFieldOrBadge(freshCandidate.ethnicity)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Tôn giáo</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {renderFieldOrBadge(freshCandidate.religion)}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Số điện thoại liên hệ</p>
                <div className="mt-0.5 break-all font-mono font-semibold text-foreground">
                  {renderFieldOrBadge(maskPhoneNumber(freshCandidate.phone))}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Hộp thư điện tử</p>
                <div className="mt-0.5 min-w-0 break-all font-semibold text-foreground">
                  {renderFieldOrBadge(maskEmail(freshCandidate.email))}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Cấp độ đăng ký thi</p>
                <div className="mt-0.5">
                  {freshCandidate.exam_level || freshCandidate.target_exam_level ? (
                    <Badge
                      variant="outline"
                      className="flex h-auto max-w-full min-w-0 items-start whitespace-normal rounded-full px-2 py-0.5 text-left text-[11px] font-medium"
                    >
                      <GraduationCapIcon className="mt-0.5 size-3 shrink-0 mr-1 text-primary" />
                      <span className="min-w-0 break-words">
                        {freshCandidate.exam_level || freshCandidate.target_exam_level}
                      </span>
                    </Badge>
                  ) : (
                    <EmptyFieldBadge />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[11px] font-medium">Kinh nghiệm học tiếng Trung</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {freshCandidate.chinese_study_years != null ? (
                    `${freshCandidate.chinese_study_years} năm`
                  ) : (
                    <EmptyFieldBadge />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Giấy tờ tùy thân */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-2.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileTextIcon className="size-3.5 text-primary" />
              Thông tin giấy tờ tùy thân ({isPassport ? "Hộ chiếu" : "Căn cước công dân"})
            </h4>
            <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <p className="text-muted-foreground text-xs font-medium">Số giấy tờ ({isPassport ? "Passport No." : "Số CCCD"})</p>
                <div className="mt-0.5 break-all font-mono text-sm font-bold text-foreground">
                  {renderFieldOrBadge(maskDocumentNumber(doc?.doc_number))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Ngày cấp</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {formatDateOrBadge(doc?.issue_date)}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs font-medium">Nơi cấp</p>
                <div className="mt-0.5 font-semibold text-foreground">
                  {renderFieldOrBadge(doc?.issue_place)}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs font-medium">Địa chỉ thường trú</p>
                <div className="mt-0.5 font-medium text-foreground">
                  {renderFieldOrBadge(maskAddress(doc?.address_detail))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ảnh đối chiếu CCCD và chân dung có cơ chế bảo vệ PII Click-to-Reveal + PIN 6 số */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-primary" />
                  Ảnh chứng thực đối soát
                </h4>
                {isPiiUnlocked ? (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium border-emerald-500/30 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1"
                  >
                    <ShieldCheckIcon className="size-3" />
                    <span>Mở khóa PIN ({formatCountdown(remainingUnlockSeconds)})</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium border-amber-500/30 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1"
                  >
                    <LockIcon className="size-2.5" />
                    <span>Yêu cầu PIN 6 số</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {isPiiUnlocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => lockPiiNow(true)}
                    className="h-6 px-2 text-[10px] rounded-full text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/40 cursor-pointer gap-1"
                    title="Khóa ngay phiên xem ảnh PII"
                  >
                    <LockIcon className="size-2.5" />
                    <span>Khóa ngay</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openPinSetupDialog}
                  className="h-6 px-2 text-[10px] rounded-full text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                  title="Đổi mã PIN bảo mật PII 6 chữ số"
                >
                  <KeyRoundIcon className="size-2.5" />
                  <span>Đổi PIN</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllImages}
                  disabled={isFetchingUnlockedPii}
                  className="h-6 px-2 text-[11px] rounded-full text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                >
                  {hasAnyRevealed ? (
                    <>
                      <EyeOffIcon className="size-3" />
                      <span>Ẩn tất cả</span>
                    </>
                  ) : (
                    <>
                      <EyeIcon className="size-3" />
                      <span>Hiện tất cả</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mặt trước CCCD/Hộ chiếu */}
              <CandidateSecurePhotoCard
                title="Mặt trước CCCD/Hộ chiếu"
                imageUrl={doc?.front_image_url}
                hasImage={Boolean(doc?.has_front_image ?? doc?.front_image_url)}
                isPiiLocked={!isPiiUnlocked}
                isLoadingImage={isFetchingUnlockedPii}
                alt="Mặt trước CCCD"
                isRevealed={Boolean(revealedImages["front"])}
                onToggleReveal={() => toggleImageReveal("front")}
                onPreview={onPreviewImage}
                emptyText="Chưa có ảnh"
              />

              {/* Mặt sau CCCD */}
              <CandidateSecurePhotoCard
                title="Mặt sau CCCD"
                imageUrl={doc?.back_image_url}
                hasImage={Boolean(doc?.has_back_image ?? doc?.back_image_url)}
                isPiiLocked={!isPiiUnlocked}
                isLoadingImage={isFetchingUnlockedPii}
                alt="Mặt sau CCCD"
                isRevealed={Boolean(revealedImages["back"])}
                onToggleReveal={() => toggleImageReveal("back")}
                onPreview={onPreviewImage}
                emptyText={isPassport ? "Hộ chiếu không có mặt sau" : "Chưa có ảnh"}
              />

              {/* Ảnh thẻ chân dung 3x4 */}
              <CandidateSecurePhotoCard
                title="Ảnh thẻ chân dung 3x4"
                imageUrl={doc?.portrait_image_url}
                hasImage={Boolean(doc?.has_portrait_image ?? doc?.portrait_image_url)}
                isPiiLocked={!isPiiUnlocked}
                isLoadingImage={isFetchingUnlockedPii}
                alt="Ảnh thẻ chân dung"
                isRevealed={Boolean(revealedImages["portrait"])}
                onToggleReveal={() => toggleImageReveal("portrait")}
                onPreview={onPreviewImage}
                emptyText="Chưa có ảnh"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/40 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-full cursor-pointer hover:bg-muted text-xs h-9 w-full sm:w-auto"
          >
            Đóng cửa sổ
          </Button>

          {/* Các nút hành động nghiệp vụ tương thích trạng thái */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {docStatus === "pending" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(freshCandidate)}
                  className="rounded-full cursor-pointer text-xs h-9 text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto font-medium"
                >
                  <XCircleIcon className="size-3.5 mr-1" />
                  Từ chối hồ sơ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(freshCandidate)}
                  className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
                >
                  <CheckCircle2Icon className="size-3.5 mr-1" />
                  Phê duyệt hợp lệ
                </Button>
              </>
            )}

            {docStatus === "verified" && onRevoke && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRevoke(freshCandidate)}
                className="rounded-full cursor-pointer text-xs h-9 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 w-full sm:w-auto font-medium"
              >
                <Undo2Icon className="size-3.5 mr-1" />
                Thu hồi phê duyệt
              </Button>
            )}

            {docStatus === "rejected" && onReapprove && (
              <Button
                type="button"
                size="sm"
                onClick={() => onReapprove(freshCandidate)}
                className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium h-9 w-full sm:w-auto shadow-2xs"
              >
                <CheckCircle2Icon className="size-3.5 mr-1" />
                Phê duyệt lại
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
