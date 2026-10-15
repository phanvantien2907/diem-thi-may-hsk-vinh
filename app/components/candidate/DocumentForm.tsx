import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  Check,
  CheckCircle2,
  X,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Save,
} from "lucide-react";

import {
  candidateDocumentSchema,
  type CandidateDocumentFormValues,
} from "~/lib/schemas/candidate";
import type {
  DocumentResponseDTO,
  Province,
  Ward,
  CloudinarySignatureDTO,
  ValidatePortraitResponseDTO,
} from "~/types/candidate";
import {
  validateImageFile,
  uploadToCloudinary,
} from "~/lib/cloudinary";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { FormCombobox, type ComboboxOption } from "~/components/ui/form-combobox";
import { ImageDropzone } from "~/components/candidate/ImageDropzone";
import { toast } from "~/components/ui/toast";

// ─── Props ────────────────────────────────────────────────────────────────────
interface DocumentFormProps {
  /** Giấy tờ hiện có (null = chưa upload) */
  document: DocumentResponseDTO | null;
  /** Danh sách Tỉnh/Thành phố từ server loader */
  provinces: Province[];
  /** Danh sách Xã/Phường ban đầu từ server loader */
  initialWards: Ward[];
  /** Token JWT để gọi API lấy upload signature */
  token: string;
  /** API base URL */
  apiBaseUrl: string;
  /** Callback khi submit form thành công */
  onSubmit: (data: CandidateDocumentFormValues) => Promise<void>;
  /** Callback kiểm tra tính hợp lệ của ảnh chân dung (Pre-validation API 3.7) */
  onValidatePortrait?: (portraitUrl: string) => Promise<ValidatePortraitResponseDTO>;
  /** Disabled khi chưa có profile */
  disabled?: boolean;
  /** Số CCCD tự động điền từ tài khoản */
  userCccd?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateForInput(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  return isoDate.slice(0, 10);
}

const DOC_TYPE_OPTIONS = [
  { value: "cccd", label: "Căn cước công dân" },
  { value: "passport", label: "Hộ chiếu" },
] as const;

const DOC_TYPE_LABEL_MAP: Record<string, string> = {
  cccd: "Căn cước công dân",
  passport: "Hộ chiếu",
};

// ─── Component ────────────────────────────────────────────────────────────────
export const DocumentForm = React.memo(function DocumentForm({
  document,
  provinces,
  initialWards,
  token,
  apiBaseUrl,
  onSubmit,
  onValidatePortrait,
  disabled = false,
  userCccd,
}: DocumentFormProps) {
  // Province/Ward state
  const [wards, setWards] = React.useState<Ward[]>(initialWards);
  const [selectedProvinceId, setSelectedProvinceId] = React.useState<string>(
    document?.province_id ? String(document.province_id) : ""
  );
  const [loadingWards, setLoadingWards] = React.useState(false);

  // Upload state per image
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({});
  const [uploadingStage, setUploadingStage] = React.useState<string | undefined>();
  const [isPortraitValidated, setIsPortraitValidated] = React.useState(
    document?.verification_status === "verified"
  );

  // Pending files chờ upload lên Cloudinary khi nhấn nút "Lưu giấy tờ"
  const [pendingFiles, setPendingFiles] = React.useState<{
    portrait_image_url?: File;
    front_image_url?: File;
    back_image_url?: File;
  }>({});

  // Local object URLs để hiển thị preview ngay lập tức
  const [previewUrls, setPreviewUrls] = React.useState<{
    portrait_image_url?: string;
    front_image_url?: string;
    back_image_url?: string;
  }>({});
  const previewUrlsRef = React.useRef(previewUrls);
  previewUrlsRef.current = previewUrls;

  // Dọn dẹp blob URLs khi unmount
  React.useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const [isSaving, setIsSaving] = React.useState(false);
  const [submitStage, setSubmitStage] = React.useState<string | undefined>();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Cloudinary signature cache
  const signatureRef = React.useRef<CloudinarySignatureDTO | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CandidateDocumentFormValues>({
    resolver: zodResolver(candidateDocumentSchema),
    defaultValues: {
      doc_type: document?.doc_type ?? "cccd",
      doc_number: document?.doc_number || userCccd || "",
      issue_date: formatDateForInput(document?.issue_date),
      issue_place: document?.issue_place ?? "",
      front_image_url: document?.front_image_url ?? "",
      back_image_url: document?.back_image_url ?? "",
      portrait_image_url: document?.portrait_image_url ?? "",
      ward_id: document?.ward_id ?? undefined,
      address_detail: document?.address_detail ?? "",
    },
  });

  React.useEffect(() => {
    if (document) {
      reset({
        doc_type: document.doc_type ?? "cccd",
        doc_number: document.doc_number || userCccd || "",
        issue_date: formatDateForInput(document.issue_date),
        issue_place: document.issue_place ?? "",
        front_image_url: document.front_image_url ?? "",
        back_image_url: document.back_image_url ?? "",
        portrait_image_url: document.portrait_image_url ?? "",
        ward_id: document.ward_id ?? undefined,
        address_detail: document.address_detail ?? "",
      });
      setIsPortraitValidated(document.verification_status === "verified");
      if (document.province_id) {
        setSelectedProvinceId(String(document.province_id));
      }
    }
  }, [document, reset, userCccd]);

  // Auto-fill doc_number from user CCCD if empty
  React.useEffect(() => {
    if (!document?.doc_number && userCccd) {
      setValue("doc_number", userCccd, { shouldValidate: false });
    }
  }, [document?.doc_number, userCccd, setValue]);

  const portraitUrl = watch("portrait_image_url");
  const frontUrl = watch("front_image_url");
  const backUrl = watch("back_image_url");

  // ─── Load wards when province changes ───────────────────────────────────────
  React.useEffect(() => {
    if (!selectedProvinceId) {
      setWards([]);
      return;
    }

    // Reuse initial wards if the selected province is the same as the initial document's province
    if (document?.province_id && selectedProvinceId === String(document.province_id)) {
      setWards(initialWards);
      return;
    }

    setLoadingWards(true);
    fetch(`${apiBaseUrl}/api/v1/locations/provinces/${selectedProvinceId}/wards`)
      .then((res) => res.json())
      .then((result: { data: Ward[] }) => {
        setWards(result.data ?? []);
      })
      .catch(console.error)
      .finally(() => setLoadingWards(false));
  }, [selectedProvinceId, apiBaseUrl, document?.province_id, initialWards]);

  // ─── Chọn file cục bộ (chưa gửi lên Cloudinary) ─────────────────────────────
  function handleFileSelect(
    file: File,
    fieldName: "portrait_image_url" | "front_image_url" | "back_image_url"
  ) {
    const error = validateImageFile(file);
    if (error) {
      toast.add({
        type: "error",
        title: "Lỗi file",
        description: error,
      });
      return;
    }

    // Thu hồi blob URL cũ nếu có
    const currentPreview = previewUrls[fieldName];
    if (currentPreview && currentPreview.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrls((prev) => ({ ...prev, [fieldName]: preview }));
    setPendingFiles((prev) => ({ ...prev, [fieldName]: file }));
    setValue(fieldName, preview, { shouldValidate: true });

    if (fieldName === "portrait_image_url") {
      setIsPortraitValidated(false);
      setSubmitError(null);
    }
  }

  // ─── Xóa ảnh đã chọn ────────────────────────────────────────────────────────
  function handleImageClear(
    fieldName: "portrait_image_url" | "front_image_url" | "back_image_url"
  ) {
    const currentPreview = previewUrls[fieldName];
    if (currentPreview && currentPreview.startsWith("blob:")) {
      URL.revokeObjectURL(currentPreview);
    }
    setPreviewUrls((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setValue(fieldName, "", { shouldValidate: true });

    if (fieldName === "portrait_image_url") {
      setIsPortraitValidated(false);
      setSubmitError(null);
    }
  }

  // ─── Form submit handler: upload ảnh lên Cloudinary + kiểm định + lưu ──────
  async function handleFormSubmit(data: CandidateDocumentFormValues) {
    setSubmitError(null);
    setIsSaving(true);

    try {
      // 1. Kiểm tra xem có file nào đang chờ tải lên Cloudinary không
      const hasFilesToUpload = Boolean(
        pendingFiles.portrait_image_url ||
        pendingFiles.front_image_url ||
        pendingFiles.back_image_url
      );

      let signature = signatureRef.current;
      if (hasFilesToUpload && !signature) {
        setSubmitStage("Đang khởi tạo kết nối lưu trữ ảnh...");
        const response = await fetch(
          `${apiBaseUrl}/api/v1/me/candidate-profile/upload-signature`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Không thể lấy chữ ký upload lên máy chủ.");
        const result = (await response.json()) as { data: CloudinarySignatureDTO };
        signature = result.data;
        signatureRef.current = signature;
      }

      const finalData: CandidateDocumentFormValues = { ...data };

      // 2. Upload ảnh mặt trước CCCD nếu có file mới
      if (pendingFiles.front_image_url && signature) {
        setUploading((prev) => ({ ...prev, front_image_url: true }));
        setSubmitStage("Đang tải ảnh CCCD mặt trước lên Cloudinary...");
        const frontUrl = await uploadToCloudinary(pendingFiles.front_image_url, signature);
        finalData.front_image_url = frontUrl;
        setValue("front_image_url", frontUrl);
        setUploading((prev) => ({ ...prev, front_image_url: false }));
      }

      // 3. Upload ảnh mặt sau CCCD nếu có file mới
      if (pendingFiles.back_image_url && signature) {
        setUploading((prev) => ({ ...prev, back_image_url: true }));
        setSubmitStage("Đang tải ảnh CCCD mặt sau lên Cloudinary...");
        const backUrl = await uploadToCloudinary(pendingFiles.back_image_url, signature);
        finalData.back_image_url = backUrl;
        setValue("back_image_url", backUrl);
        setUploading((prev) => ({ ...prev, back_image_url: false }));
      }

      // 4. Upload ảnh chân dung và tiền kiểm định AI Vision theo API 3.7
      if (pendingFiles.portrait_image_url && signature) {
        setUploading((prev) => ({ ...prev, portrait_image_url: true }));
        setUploadingStage("Đang tải ảnh chân dung lên Cloudinary...");
        setSubmitStage("Đang tải ảnh chân dung lên Cloudinary...");

        const uploadedPortraitUrl = await uploadToCloudinary(
          pendingFiles.portrait_image_url,
          signature
        );

        setUploadingStage("AI đang kiểm định ảnh 3×4...");
        setSubmitStage("AI đang kiểm định ảnh 3×4 (nền trắng, không kính)...");

        const valData = onValidatePortrait
          ? await onValidatePortrait(uploadedPortraitUrl)
          : await (async () => {
              const valRes = await fetch(
                `${apiBaseUrl}/api/v1/me/candidate-profile/validate-portrait`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ portrait_image_url: uploadedPortraitUrl }),
                }
              );
              const valJson = await valRes.json().catch(() => null);
              if (!valRes.ok || !valJson?.data) {
                throw new Error(valJson?.msg || "Không thể kiểm tra ảnh chân dung qua AI.");
              }
              return valJson.data as ValidatePortraitResponseDTO;
            })();

        if (!valData.valid) {
          // Xóa ảnh chân dung và file chờ theo hướng dẫn API docs
          handleImageClear("portrait_image_url");

          const reason =
            valData.rejection_reason ||
            (valData.reasons && valData.reasons.length > 0
              ? `Ảnh chân dung không hợp lệ: ${valData.reasons.join(" ")}`
              : "Ảnh không đáp ứng tiêu chuẩn thi HSK (phải phông nền trắng, không đeo kính, rõ nét).");

          setSubmitError(reason);
          toast.add({
            type: "error",
            title: "Ảnh chân dung không hợp lệ",
            description: reason,
          });

          // Dừng ngay, không tiếp tục gửi lên backend lưu
          return;
        }

        // Hợp lệ: Cập nhật URL Cloudinary vào payload và form
        finalData.portrait_image_url = uploadedPortraitUrl;
        setValue("portrait_image_url", uploadedPortraitUrl);
        setIsPortraitValidated(true);
        setUploading((prev) => ({ ...prev, portrait_image_url: false }));
      }

      // 5. Gửi dữ liệu giấy tờ lên Backend (POST /api/v1/me/candidate-profile/documents)
      setSubmitStage("Đang lưu thông tin giấy tờ tùy thân...");
      await onSubmit(finalData);

      // Thu dọn pending files và blob URLs sau khi lưu thành công
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      setPendingFiles({});
      setPreviewUrls({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi lưu giấy tờ.";
      setSubmitError(message);
    } finally {
      setIsSaving(false);
      setSubmitStage(undefined);
      setUploading({});
      setUploadingStage(undefined);
    }
  }

  const provinceOptions: ComboboxOption[] = React.useMemo(
    () => provinces.map((p) => ({ value: String(p.id), label: p.name })),
    [provinces]
  );

  const wardOptions: ComboboxOption[] = React.useMemo(
    () => wards.map((w) => ({ value: String(w.id), label: w.name })),
    [wards]
  );

  return (
    <Card className={disabled ? "pointer-events-none opacity-50" : ""}>
      <CardHeader>
        <CardTitle>2. Giấy tờ tùy thân</CardTitle>
        <CardDescription>
          Tải lên ảnh CCCD/Hộ chiếu và ảnh chân dung 3×4 cm để hoàn thiện hồ sơ đăng ký thi HSK.
        </CardDescription>
      </CardHeader>

      {/* ── Thông báo trạng thái kiểm định hồ sơ hiện tại ──────────────────── */}
      {submitError ? (
        <div className="mx-6 mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-3">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1 flex-1">
            <p className="font-semibold text-sm">Ảnh chân dung không đạt yêu cầu kiểm định</p>
            <p className="leading-relaxed text-destructive/90">{submitError}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Vui lòng xem kỹ ảnh mẫu đạt chuẩn bên dưới, chọn ảnh chân dung khác (nền trắng, không đeo kính) và bấm &quot;Lưu giấy tờ&quot; lại.
            </p>
          </div>
        </div>
      ) : document?.verification_status === "rejected" ? (
        <div className="mx-6 mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-3">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1 flex-1">
            <p className="font-semibold text-sm">Ảnh chân dung hiện tại chưa đạt chuẩn</p>
            <p className="leading-relaxed text-destructive/90">
              {document.rejection_reason || "Ảnh chân dung chưa đáp ứng yêu cầu của hệ thống."}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Vui lòng tải lại ảnh chân dung đạt chuẩn (nền trắng, không đeo kính) theo hướng dẫn bên dưới và bấm &quot;Lưu giấy tờ&quot; để xác thực lại.
            </p>
          </div>
        </div>
      ) : document?.verification_status === "verified" ||
        document?.verification_status === "pending" ? (
        <div className="mx-6 mb-5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs flex items-start sm:items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-sm text-foreground">
              Giấy tờ &amp; ảnh chân dung đã được cập nhật
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed break-words">
              Thông tin giấy tờ của bạn đã được lưu thành công. Bạn vẫn có thể tải lại ảnh mới nếu cần cập nhật.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Quy chuẩn & Demo ảnh chân dung đối sánh (Side-by-Side UI/UX) ─────── */}
      <div className="mx-6 mb-6 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Camera className="size-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Quy chuẩn ảnh thẻ chân dung (3×4 cm)
              </h4>
              <p className="text-xs text-muted-foreground">
                Hệ thống tự động kiểm tra ảnh ngay khi bạn tải lên, ảnh đạt chuẩn sẽ được lưu ngay.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="self-start sm:self-auto rounded-full text-[11px] font-normal border-primary/20 text-primary bg-primary/5"
          >
            Kiểm tra tự động
          </Badge>
        </div>

        {/* Demo comparative cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Hợp lệ */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 transition-all">
            <div className="relative shrink-0 overflow-hidden rounded-xl border-2 border-primary/30 shadow-xs aspect-[3/4] w-24 sm:w-28 bg-background">
              <img
                src="/avata_hople.jpg"
                alt="Ảnh chân dung mẫu hợp lệ"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1.5 right-1.5">
                <Badge className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0 font-medium shadow-xs gap-0.5">
                  <CheckCircle2 className="size-2.5" /> Chuẩn
                </Badge>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Badge className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 gap-1">
                  <CheckCircle2 className="size-3" />
                  Hợp lệ
                </Badge>
                <span className="text-xs font-medium text-foreground">Tiêu chuẩn bắt buộc</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Phông nền trắng trơn, đồng màu, độ tương phản tốt</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Không đeo kính (kể cả kính cận), không đội mũ, không che mặt</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Mặt nhìn thẳng, đầu ngay ngắn, rõ nét, đủ ánh sáng</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card 2: Không hợp lệ */}
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 transition-all">
            <div className="relative shrink-0 overflow-hidden rounded-xl border-2 border-destructive/30 shadow-xs aspect-[3/4] w-24 sm:w-28 bg-background">
              <img
                src="/avata_kohople.jpg"
                alt="Ảnh chân dung mẫu không hợp lệ"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-1.5 right-1.5">
                <Badge variant="destructive" className="rounded-full text-[10px] px-1.5 py-0 font-medium shadow-xs gap-0.5">
                  <XCircle className="size-2.5" /> Sai
                </Badge>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Badge variant="destructive" className="rounded-full text-xs font-semibold px-2.5 py-0.5 gap-1">
                  <XCircle className="size-3" />
                  Không hợp lệ
                </Badge>
                <span className="text-xs font-medium text-foreground">Hệ thống sẽ từ chối</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-1.5">
                  <X className="size-3.5 text-destructive shrink-0 mt-0.5" />
                  <span>Nền màu (xanh, đỏ, xám), phong cảnh, ảnh đời thường</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <X className="size-3.5 text-destructive shrink-0 mt-0.5" />
                  <span>Đeo kính mắt, kính râm, tóc hoặc phụ kiện che mặt</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <X className="size-3.5 text-destructive shrink-0 mt-0.5" />
                  <span>Ảnh selfie, nghiêng đầu quá 20°, bị mờ hoặc thiếu sáng</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* ── Document info fields ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {/* Loại giấy tờ */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Loại giấy tờ <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="doc_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={DOC_TYPE_OPTIONS}
                  >
                    <SelectTrigger
                      className="w-full cursor-pointer"
                      aria-invalid={!!errors.doc_type}
                    >
                      <SelectValue placeholder="Chọn loại giấy tờ">
                        {(val) =>
                          val ? DOC_TYPE_LABEL_MAP[String(val)] ?? String(val) : "Chọn loại giấy tờ"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.doc_type && (
                <p className="text-xs text-destructive">
                  {errors.doc_type.message}
                </p>
              )}
            </div>

            {/* Số giấy tờ */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc_number">
                Số giấy tờ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc_number"
                placeholder="012345678901"
                aria-invalid={!!errors.doc_number}
                {...register("doc_number")}
              />
              {errors.doc_number && (
                <p className="text-xs text-destructive">
                  {errors.doc_number.message}
                </p>
              )}
            </div>

            {/* Ngày cấp */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue_date">
                Ngày cấp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="issue_date"
                type="date"
                aria-invalid={!!errors.issue_date}
                {...register("issue_date")}
              />
              {errors.issue_date && (
                <p className="text-xs text-destructive">
                  {errors.issue_date.message}
                </p>
              )}
            </div>

            {/* Nơi cấp — full width on tablet */}
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
              <Label htmlFor="issue_place">
                Nơi cấp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="issue_place"
                placeholder="Cục Cảnh sát QLHC về TTXH"
                aria-invalid={!!errors.issue_place}
                {...register("issue_place")}
              />
              {errors.issue_place && (
                <p className="text-xs text-destructive">
                  {errors.issue_place.message}
                </p>
              )}
            </div>
          </div>

          {/* ── Image upload zones ────────────────────────────────────────── */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-foreground">
              Ảnh giấy tờ & chân dung{" "}
              <span className="text-destructive">*</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ImageDropzone
                label="Ảnh chân dung (3×4 cm)"
                value={previewUrls.portrait_image_url || portraitUrl || undefined}
                onFileSelect={(file) =>
                  handleFileSelect(file, "portrait_image_url")
                }
                onClear={() =>
                  handleImageClear("portrait_image_url")
                }
                uploading={uploading.portrait_image_url}
                uploadingText={uploading.portrait_image_url ? uploadingStage : undefined}
                isValidated={isPortraitValidated && Boolean(previewUrls.portrait_image_url || portraitUrl)}
                disabled={disabled || isSaving}
                error={
                  errors.portrait_image_url?.message ||
                  (submitError &&
                  (submitError.toLowerCase().includes("chân dung") ||
                    submitError.toLowerCase().includes("ảnh") ||
                    submitError.toLowerCase().includes("khuôn mặt") ||
                    submitError.toLowerCase().includes("kính") ||
                    submitError.toLowerCase().includes("nền"))
                    ? submitError
                    : undefined)
                }
                aspectRatio="portrait"
              />
              <ImageDropzone
                label="Ảnh mặt trước CCCD"
                value={previewUrls.front_image_url || frontUrl || undefined}
                onFileSelect={(file) =>
                  handleFileSelect(file, "front_image_url")
                }
                onClear={() =>
                  handleImageClear("front_image_url")
                }
                uploading={uploading.front_image_url}
                uploadingText="Đang tải ảnh CCCD lên Cloudinary..."
                disabled={disabled || isSaving}
                error={errors.front_image_url?.message}
                aspectRatio="landscape"
              />
              <ImageDropzone
                label="Ảnh mặt sau CCCD"
                value={previewUrls.back_image_url || backUrl || undefined}
                onFileSelect={(file) =>
                  handleFileSelect(file, "back_image_url")
                }
                onClear={() =>
                  handleImageClear("back_image_url")
                }
                uploading={uploading.back_image_url}
                uploadingText="Đang tải ảnh CCCD lên Cloudinary..."
                disabled={disabled || isSaving}
                error={errors.back_image_url?.message}
                aspectRatio="landscape"
              />
            </div>
          </div>

          {/* ── Address fields ────────────────────────────────────────────── */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-foreground">
              Địa chỉ thường trú
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
              {/* Tỉnh/TP */}
              <div className="flex flex-col gap-1.5">
                <Label>Tỉnh / Thành phố</Label>
                <FormCombobox
                  options={provinceOptions}
                  value={selectedProvinceId}
                  onValueChange={(val) => {
                    setSelectedProvinceId(val);
                    setValue("ward_id", undefined);
                  }}
                  placeholder="Chọn tỉnh/thành phố"
                  searchPlaceholder="Tìm tỉnh/thành phố..."
                  emptyMessage="Không tìm thấy tỉnh/thành phố."
                  disabled={disabled}
                />
              </div>

              {/* Xã/Phường */}
              <div className="flex flex-col gap-1.5">
                <Label>Xã / Phường</Label>
                <Controller
                  name="ward_id"
                  control={control}
                  render={({ field }) => (
                    <FormCombobox
                      options={wardOptions}
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) =>
                        field.onChange(val ? Number(val) : undefined)
                      }
                      placeholder={
                        !selectedProvinceId
                          ? "Chọn tỉnh/thành trước"
                          : loadingWards
                            ? "Đang tải..."
                            : "Chọn xã/phường"
                      }
                      searchPlaceholder="Tìm xã/phường..."
                      emptyMessage={
                        loadingWards
                          ? "Đang tải danh sách..."
                          : "Không tìm thấy xã/phường."
                      }
                      disabled={disabled || !selectedProvinceId || loadingWards}
                      aria-invalid={!!errors.ward_id}
                    />
                  )}
                />
                {errors.ward_id && (
                  <p className="text-xs text-destructive">
                    {errors.ward_id.message}
                  </p>
                )}
              </div>

              {/* Địa chỉ chi tiết */}
              <div className="flex flex-col gap-1.5 lg:col-span-1 md:col-span-2">
                <Label htmlFor="address_detail">Địa chỉ chi tiết</Label>
                <Input
                  id="address_detail"
                  placeholder="Số nhà, đường, tổ/xóm..."
                  {...register("address_detail")}
                />
                {errors.address_detail && (
                  <p className="text-xs text-destructive">
                    {errors.address_detail.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || isSaving || disabled}
              className="rounded-full cursor-pointer hover:bg-primary/90"
            >
              {isSubmitting || isSaving ? (
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
              ) : (
                <Save data-icon="inline-start" aria-hidden="true" />
              )}
              {submitStage || "Lưu giấy tờ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});
