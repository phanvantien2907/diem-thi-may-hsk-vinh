/**
 * DocumentForm — Card "Giấy tờ tùy thân"
 *
 * Fields: doc_type, doc_number, issue_date, issue_place,
 *         front_image_url, back_image_url, portrait_image_url,
 *         province (UI-only), ward_id, address_detail
 *
 * Upload flow: Cloudinary (signature → upload → URL)
 * Address: cascade dropdown (Tỉnh → Xã/Phường)
 */
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";

import {
  candidateDocumentSchema,
  type CandidateDocumentFormValues,
} from "~/lib/schemas/candidate";
import type {
  DocumentResponseDTO,
  Province,
  Ward,
  CloudinarySignatureDTO,
} from "~/types/candidate";
import {
  validateImageFile,
  uploadToCloudinary,
} from "~/lib/cloudinary";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  /** Token JWT để gọi API lấy upload signature */
  token: string;
  /** API base URL */
  apiBaseUrl: string;
  /** Callback khi submit form thành công */
  onSubmit: (data: CandidateDocumentFormValues) => Promise<void>;
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
  { value: "cccd", label: "Căn cước công dân (CCCD)" },
  { value: "passport", label: "Hộ chiếu (Passport)" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────
export function DocumentForm({
  document,
  token,
  apiBaseUrl,
  onSubmit,
  disabled = false,
  userCccd,
}: DocumentFormProps) {
  // Province/Ward state
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [wards, setWards] = React.useState<Ward[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = React.useState<string>("");
  const [loadingWards, setLoadingWards] = React.useState(false);

  // Upload state per image
  const [uploading, setUploading] = React.useState<Record<string, boolean>>({});

  // Cloudinary signature cache
  const signatureRef = React.useRef<CloudinarySignatureDTO | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
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
      ward_id: undefined,
      address_detail: "",
    },
  });

  // Auto-fill doc_number from user CCCD if empty
  React.useEffect(() => {
    if (!document?.doc_number && userCccd) {
      setValue("doc_number", userCccd, { shouldValidate: false });
    }
  }, [document?.doc_number, userCccd, setValue]);

  const portraitUrl = watch("portrait_image_url");
  const frontUrl = watch("front_image_url");
  const backUrl = watch("back_image_url");

  // ─── Load provinces on mount ────────────────────────────────────────────────
  React.useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/locations/provinces`)
      .then((res) => res.json())
      .then((result: { data: Province[] }) => {
        setProvinces(result.data ?? []);
      })
      .catch(console.error);
  }, [apiBaseUrl]);

  // ─── Load wards when province changes ───────────────────────────────────────
  React.useEffect(() => {
    if (!selectedProvinceId) {
      setWards([]);
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
  }, [selectedProvinceId, apiBaseUrl]);

  // ─── Upload handler ─────────────────────────────────────────────────────────
  async function handleImageUpload(
    file: File,
    fieldName: "portrait_image_url" | "front_image_url" | "back_image_url"
  ) {
    // Validate first
    const error = validateImageFile(file);
    if (error) {
      toast.add({
        type: "error",
        title: "Lỗi file",
        description: error,
      });
      return;
    }

    setUploading((prev) => ({ ...prev, [fieldName]: true }));

    try {
      // Get signature (cache for reuse within session)
      if (!signatureRef.current) {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/me/candidate-profile/upload-signature`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Không thể lấy chữ ký upload");
        const result = (await response.json()) as { data: CloudinarySignatureDTO };
        signatureRef.current = result.data;
      }

      const url = await uploadToCloudinary(file, signatureRef.current);
      setValue(fieldName, url, { shouldValidate: true });
      toast.add({
        type: "success",
        title: "Upload thành công",
        description: "Ảnh đã được tải lên.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload thất bại";
      toast.add({
        type: "error",
        title: "Upload thất bại",
        description: message,
      });
      // Invalidate cached signature on error (may be expired)
      signatureRef.current = null;
    } finally {
      setUploading((prev) => ({ ...prev, [fieldName]: false }));
    }
  }

  async function handleFormSubmit(data: CandidateDocumentFormValues) {
    await onSubmit(data);
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
          Upload ảnh CCCD/Hộ chiếu và ảnh chân dung 3×4 để hoàn thiện hồ sơ.
        </CardDescription>
      </CardHeader>

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
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!errors.doc_type}
                    >
                      <SelectValue placeholder="Chọn loại giấy tờ" />
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
                label="Ảnh chân dung (3×4)"
                value={portraitUrl || undefined}
                onFileSelect={(file) =>
                  handleImageUpload(file, "portrait_image_url")
                }
                onClear={() =>
                  setValue("portrait_image_url", "", { shouldValidate: true })
                }
                uploading={uploading.portrait_image_url}
                error={errors.portrait_image_url?.message}
                aspectRatio="portrait"
              />
              <ImageDropzone
                label="Ảnh mặt trước CCCD"
                value={frontUrl || undefined}
                onFileSelect={(file) =>
                  handleImageUpload(file, "front_image_url")
                }
                onClear={() =>
                  setValue("front_image_url", "", { shouldValidate: true })
                }
                uploading={uploading.front_image_url}
                error={errors.front_image_url?.message}
                aspectRatio="landscape"
              />
              <ImageDropzone
                label="Ảnh mặt sau CCCD"
                value={backUrl || undefined}
                onFileSelect={(file) =>
                  handleImageUpload(file, "back_image_url")
                }
                onClear={() =>
                  setValue("back_image_url", "", { shouldValidate: true })
                }
                uploading={uploading.back_image_url}
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
              disabled={isSubmitting || disabled}
              className="rounded-full cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2
                  className="animate-spin"
                  data-icon="inline-start"
                  aria-hidden="true"
                />
              ) : (
                <Save data-icon="inline-start" aria-hidden="true" />
              )}
              Lưu giấy tờ
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
