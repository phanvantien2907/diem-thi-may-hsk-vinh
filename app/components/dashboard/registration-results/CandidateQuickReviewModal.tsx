import * as React from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  RotateCcwIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "~/components/ui/toast";
import type { AdminCandidateResponseDTO } from "~/types/admin";

interface CandidateQuickReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: number | null;
  onActionComplete?: () => void;
}

export function CandidateQuickReviewModal({
  open,
  onOpenChange,
  candidateId,
  onActionComplete,
}: CandidateQuickReviewModalProps) {
  const [candidate, setCandidate] = React.useState<AdminCandidateResponseDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activePhoto, setActivePhoto] = React.useState<string | null>(null);

  // Sub-dialog states for strict confirmation
  const [confirmAction, setConfirmAction] = React.useState<"approve" | "reject" | "revoke" | "reopen" | null>(null);
  const [actionReason, setActionReason] = React.useState("");

  const loadCandidateDetail = React.useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/internal/admin/candidates/${candidateId}`);
      if (!res.ok) throw new Error("Không thể tải thông tin hồ sơ thí sinh.");
      const json = await res.json();
      setCandidate(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tải hồ sơ";
      toast.add({
        type: "error",
        title: "Tải hồ sơ thất bại",
        description: msg,
      });
      setCandidate(null);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  React.useEffect(() => {
    if (open && candidateId) {
      loadCandidateDetail();
      setActionReason("");
      setConfirmAction(null);
    } else {
      setCandidate(null);
    }
  }, [open, candidateId, loadCandidateDetail]);

  const handleClose = () => {
    // If modal is closed, release soft lock asynchronously (fire & forget)
    if (candidateId) {
      fetch(`/api/v1/admin/candidates/${candidateId}/lock`, { method: "DELETE" }).catch(() => {});
    }
    onOpenChange(false);
  };

  const executeAction = async () => {
    if (!candidateId || !confirmAction) return;

    if ((confirmAction === "reject" || confirmAction === "revoke" || confirmAction === "reopen") && actionReason.trim().length < 3) {
      toast.add({
        type: "error",
        title: "Thiếu lý do",
        description: "Vui lòng nhập lý do tối thiểu 3 ký tự.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let endpoint = "";
      let body: Record<string, unknown> | undefined;

      if (confirmAction === "approve") {
        endpoint = `/api/v1/admin/candidates/${candidateId}/approve`;
      } else if (confirmAction === "reject") {
        endpoint = `/api/v1/admin/candidates/${candidateId}/reject`;
        body = { reason: actionReason.trim() };
      } else if (confirmAction === "revoke") {
        endpoint = `/api/v1/admin/candidates/${candidateId}/revoke-approval`;
        body = { reason: actionReason.trim(), paid_resolution: "block" };
      } else if (confirmAction === "reopen") {
        endpoint = `/api/v1/admin/candidates/${candidateId}/reopen-review`;
        body = { reason: actionReason.trim() };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Thao tác thất bại.");
      }

      toast.add({
        type: "success",
        title: "Thành công",
        description:
          confirmAction === "approve"
            ? "Đã phê duyệt hồ sơ giấy tờ thí sinh."
            : confirmAction === "reject"
            ? "Đã từ chối giấy tờ thí sinh."
            : confirmAction === "revoke"
            ? "Đã thu hồi phê duyệt giấy tờ."
            : "Đã mở lại xét duyệt hồ sơ.",
      });

      setConfirmAction(null);
      setActionReason("");
      await loadCandidateDetail();
      onActionComplete?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi.";
      toast.add({
        type: "error",
        title: "Thao tác thất bại",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const doc = candidate?.latest_document;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                <ShieldCheckIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  Xét duyệt Hồ sơ Thí sinh (Soft-lock 5 phút & Proof-of-View)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Truy cập xem ảnh giấy tờ gốc tuân thủ Nghị định 13/2023/NĐ-CP (ghi log <code>VIEW_PII</code>).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2Icon className="size-6 animate-spin text-primary" />
                <span>Đang tải thông tin chi tiết và cấp quyền xem PII...</span>
              </div>
            ) : !candidate ? (
              <div className="py-16 text-center text-muted-foreground text-xs">
                Không tìm thấy dữ liệu hồ sơ thí sinh.
              </div>
            ) : (
              <>
                {/* Thông tin cá nhân */}
                <div className="bg-muted/40 border rounded-lg p-3 text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Họ và tên:</span>
                    <span className="font-semibold text-foreground text-sm">
                      {candidate.full_name}
                      {candidate.full_name_cn ? ` (${candidate.full_name_cn})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Ngày sinh & Giới tính:</span>
                    <span className="font-medium text-foreground">
                      {candidate.dob ? new Date(candidate.dob).toLocaleDateString("vi-VN") : "—"} (
                      {candidate.gender === "male" ? "Nam" : candidate.gender === "female" ? "Nữ" : "Khác"})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Trạng thái giấy tờ:</span>
                    <Badge
                      variant={
                        doc?.verification_status === "verified"
                          ? "default"
                          : doc?.verification_status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="mt-0.5 text-xs"
                    >
                      {doc?.verification_status === "verified"
                        ? "Đã duyệt hợp lệ"
                        : doc?.verification_status === "rejected"
                        ? "Đã từ chối"
                        : "Chờ phê duyệt"}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Số điện thoại:</span>
                    <span className="font-mono font-medium text-foreground">{candidate.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email liên hệ:</span>
                    <span className="font-medium text-foreground">{candidate.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Cấp độ đăng ký:</span>
                    <span className="font-medium text-foreground">{candidate.exam_level || candidate.target_exam_level || "—"}</span>
                  </div>

                  {doc && (
                    <>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Loại & Số giấy tờ:</span>
                        <span className="font-mono font-semibold text-foreground">
                          {doc.doc_type?.toUpperCase()}: {doc.doc_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Ngày cấp & Nơi cấp:</span>
                        <span className="text-foreground">
                          {doc.issue_date ? new Date(doc.issue_date).toLocaleDateString("vi-VN") : "—"} • {doc.issue_place || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Địa chỉ:</span>
                        <span className="text-foreground truncate block">{doc.address_detail || "—"}</span>
                      </div>
                    </>
                  )}
                </div>

                {doc?.rejection_reason && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    <strong>Lý do từ chối trước đó:</strong> {doc.rejection_reason}
                  </div>
                )}

                {/* Khung ảnh giấy tờ */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-primary" />
                    <span>Hình ảnh hồ sơ dự thi (Kiểm tra kỹ trước khi duyệt)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Ảnh chân dung 3x4 */}
                    <div className="border rounded-lg p-2.5 bg-card flex flex-col items-center gap-2 text-center">
                      <span className="text-[11px] font-medium text-muted-foreground">Ảnh chân dung 3x4</span>
                      <div className="w-full aspect-[3/4] max-w-[140px] bg-muted/30 rounded-md overflow-hidden border flex items-center justify-center relative group">
                        {doc?.portrait_image_url ? (
                          <>
                            <img
                              src={doc.portrait_image_url}
                              alt="Ảnh chân dung"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setActivePhoto(doc.portrait_image_url!)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs cursor-pointer gap-1"
                            >
                              <EyeIcon className="size-4" />
                              <span>Phóng to</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa có ảnh</span>
                        )}
                      </div>
                    </div>

                    {/* Mặt trước CCCD/Hộ chiếu */}
                    <div className="border rounded-lg p-2.5 bg-card flex flex-col items-center gap-2 text-center">
                      <span className="text-[11px] font-medium text-muted-foreground">Mặt trước CCCD / Hộ chiếu</span>
                      <div className="w-full aspect-[16/10] bg-muted/30 rounded-md overflow-hidden border flex items-center justify-center relative group">
                        {doc?.front_image_url ? (
                          <>
                            <img
                              src={doc.front_image_url}
                              alt="Mặt trước"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setActivePhoto(doc.front_image_url!)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs cursor-pointer gap-1"
                            >
                              <EyeIcon className="size-4" />
                              <span>Phóng to</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Chưa có ảnh</span>
                        )}
                      </div>
                    </div>

                    {/* Mặt sau CCCD */}
                    <div className="border rounded-lg p-2.5 bg-card flex flex-col items-center gap-2 text-center">
                      <span className="text-[11px] font-medium text-muted-foreground">Mặt sau CCCD</span>
                      <div className="w-full aspect-[16/10] bg-muted/30 rounded-md overflow-hidden border flex items-center justify-center relative group">
                        {doc?.back_image_url ? (
                          <>
                            <img
                              src={doc.back_image_url}
                              alt="Mặt sau"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setActivePhoto(doc.back_image_url!)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs cursor-pointer gap-1"
                            >
                              <EyeIcon className="size-4" />
                              <span>Phóng to</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {doc?.doc_type === "passport" ? "Không yêu cầu (Hộ chiếu)" : "Chưa có ảnh"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between items-stretch sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="rounded-full cursor-pointer hover:bg-muted"
              onClick={handleClose}
            >
              Đóng
            </Button>

            {candidate && doc && (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {doc.verification_status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-full cursor-pointer hover:bg-destructive/90 gap-1 text-xs h-8"
                      onClick={() => {
                        setConfirmAction("reject");
                        setActionReason("");
                      }}
                    >
                      <XCircleIcon className="size-3.5" />
                      <span>Từ chối hồ sơ</span>
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full cursor-pointer hover:bg-primary/90 gap-1 text-xs h-8"
                      onClick={() => {
                        setConfirmAction("approve");
                        setActionReason("");
                      }}
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      <span>Phê duyệt giấy tờ</span>
                    </Button>
                  </>
                )}

                {doc.verification_status === "verified" && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-full cursor-pointer hover:bg-destructive/90 gap-1 text-xs h-8"
                    onClick={() => {
                      setConfirmAction("revoke");
                      setActionReason("");
                    }}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span>Thu hồi phê duyệt</span>
                  </Button>
                )}

                {doc.verification_status === "rejected" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full cursor-pointer hover:bg-secondary/90 gap-1 text-xs h-8"
                    onClick={() => {
                      setConfirmAction("reopen");
                      setActionReason("");
                    }}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span>Mở lại xét duyệt</span>
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox phóng to ảnh */}
      {activePhoto && (
        <Dialog open={Boolean(activePhoto)} onOpenChange={() => setActivePhoto(null)}>
          <DialogContent className="max-w-2xl p-2 bg-black/90 border-0 flex flex-col items-center justify-center">
            <img
              src={activePhoto}
              alt="Phóng to"
              className="max-h-[80vh] w-auto object-contain rounded"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer mt-2 text-white bg-white/20 hover:bg-white/30 border-0"
              onClick={() => setActivePhoto(null)}
            >
              Đóng xem ảnh
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Safeguard AlertDialog */}
      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(val) => !val && setConfirmAction(null)}
      >
        <AlertDialogContent className="data-[size=default]:max-w-md w-[calc(100vw-2rem)] sm:w-full">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-full ${
                  confirmAction === "approve"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {confirmAction === "approve" ? (
                  <CheckCircle2Icon className="size-5" />
                ) : (
                  <AlertTriangleIcon className="size-5" />
                )}
              </div>
              <AlertDialogTitle className="text-base sm:text-lg">
                {confirmAction === "approve"
                  ? "Xác nhận Phê duyệt Hồ sơ"
                  : confirmAction === "reject"
                  ? "Xác nhận Từ chối Giấy tờ"
                  : confirmAction === "revoke"
                  ? "Xác nhận Thu hồi Phê duyệt"
                  : "Xác nhận Mở lại Xét duyệt"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-foreground/80 pt-1 space-y-2">
              {confirmAction === "approve" ? (
                <p>
                  Bạn xác nhận rằng ảnh chân dung 3x4 và CCCD/Hộ chiếu của thí sinh{" "}
                  <strong>{candidate?.full_name}</strong> hoàn toàn rõ nét, hợp lệ và trùng khớp với thông tin cá nhân.
                </p>
              ) : confirmAction === "revoke" ? (
                <p>
                  Hành động này sẽ hủy phê duyệt của thí sinh <strong>{candidate?.full_name}</strong> và chuyển hồ sơ về trạng thái từ chối. Nếu thí sinh có đơn thi chưa thanh toán, các ghế giữ sẽ được tự động giải phóng.
                </p>
              ) : confirmAction === "reject" ? (
                <p>
                  Thí sinh sẽ nhận được thông báo từ chối hồ sơ kèm lý do bên dưới và bị khóa luồng đăng ký ca thi cho đến khi nộp lại giấy tờ đạt chuẩn.
                </p>
              ) : (
                <p>
                  Hồ sơ bị từ chối sẽ được chuyển về lại trạng thái <code>pending</code> (chờ duyệt) để Ban kiểm định đánh giá lại.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction !== "approve" && (
            <div className="space-y-1.5 py-1">
              <Label htmlFor="action-reason" className="text-xs font-medium">
                Lý do thao tác <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="action-reason"
                rows={3}
                placeholder="Nhập lý do cụ thể..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="text-xs resize-none"
                disabled={isSubmitting}
              />
            </div>
          )}

          <AlertDialogFooter className="mx-0 mb-0 pt-2 gap-2 sm:gap-0">
            <AlertDialogCancel
              type="button"
              className="rounded-full cursor-pointer hover:bg-muted"
              disabled={isSubmitting}
              onClick={() => setConfirmAction(null)}
            >
              Hủy bỏ
            </AlertDialogCancel>
            <Button
              type="button"
              variant={confirmAction === "approve" ? "default" : "destructive"}
              className="rounded-full cursor-pointer hover:opacity-90 gap-1.5"
              disabled={
                isSubmitting ||
                (confirmAction !== "approve" && actionReason.trim().length < 3)
              }
              onClick={executeAction}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận thực hiện</span>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

