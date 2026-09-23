import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";

import {
  candidateProfileSchema,
  type CandidateProfileFormValues,
} from "~/lib/schemas/candidate";
import type { CandidateResponseDTO } from "~/types/candidate";

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
import { FormCombobox } from "~/components/ui/form-combobox";
import { ETHNICITIES } from "~/lib/constants/ethnicities";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProfileFormProps {
  /** Dữ liệu hồ sơ hiện có (null = chưa có hồ sơ, cần tạo mới) */
  profile: CandidateResponseDTO | null;
  /** Họ tên lấy từ thông tin đăng nhập/tài khoản (fallback khi profile chưa có) */
  defaultFullName?: string;
  /** Ngày sinh lấy từ thông tin đăng nhập/tài khoản hoặc CCCD (fallback khi profile chưa có) */
  defaultDob?: string;
  /** Giới tính suy luận từ CCCD (fallback khi profile chưa có) */
  defaultGender?: "male" | "female";
  /** Callback khi submit form thành công */
  onSubmit: (data: CandidateProfileFormValues, isNew: boolean) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateForInput(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  // Handle both "2000-05-15" and "2000-05-15T00:00:00Z" formats
  return isoDate.slice(0, 10);
}

const GENDER_OPTIONS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const;

const GENDER_LABEL_MAP: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ProfileForm = React.memo(function ProfileForm({
  profile,
  defaultFullName = "",
  defaultDob = "",
  defaultGender,
  onSubmit,
}: ProfileFormProps) {
  const isNew = profile === null;

  const initialFullName = profile?.full_name || defaultFullName;
  const initialDob = formatDateForInput(profile?.dob) || defaultDob;
  const initialGender = profile?.gender ?? defaultGender ?? undefined;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CandidateProfileFormValues>({
    resolver: zodResolver(candidateProfileSchema),
    defaultValues: {
      full_name: initialFullName,
      full_name_cn: profile?.full_name_cn ?? "",
      dob: initialDob,
      gender: initialGender,
      ethnicity: profile?.ethnicity ?? "",
      religion: profile?.religion ?? "",
      nationality: profile?.nationality ?? "Việt Nam",
      chinese_study_years: profile?.chinese_study_years ?? undefined,
    },
  });

  // Tự động đồng bộ khi dữ liệu profile hoặc thông tin tài khoản thay đổi
  React.useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || defaultFullName,
        full_name_cn: profile.full_name_cn ?? "",
        dob: formatDateForInput(profile.dob) || defaultDob,
        gender: profile.gender ?? defaultGender ?? undefined,
        ethnicity: profile.ethnicity ?? "",
        religion: profile.religion ?? "",
        nationality: profile.nationality ?? "Việt Nam",
        chinese_study_years: profile.chinese_study_years ?? undefined,
      });
    } else {
      reset((prev) => ({
        ...prev,
        full_name: prev.full_name || defaultFullName,
        dob: prev.dob || defaultDob,
        gender: prev.gender ?? defaultGender ?? undefined,
      }));
    }
  }, [profile, defaultFullName, defaultDob, defaultGender, reset]);

  async function handleFormSubmit(data: CandidateProfileFormValues) {
    await onSubmit(data, isNew);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Thông tin cá nhân</CardTitle>
        <CardDescription>
          {isNew
            ? "Điền đầy đủ thông tin cá nhân để tạo hồ sơ thí sinh."
            : "Cập nhật thông tin cá nhân của bạn."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {/* Họ và tên — span 2 col on tablet+ */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="full_name">
                Họ và tên <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                placeholder="Nguyễn Văn A"
                aria-invalid={!!errors.full_name}
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Họ tên tiếng Trung */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name_cn">Họ tên tiếng Trung (中文名字)</Label>
              <Input
                id="full_name_cn"
                placeholder="阮文A"
                {...register("full_name_cn")}
              />
              {errors.full_name_cn && (
                <p className="text-xs text-destructive">
                  {errors.full_name_cn.message}
                </p>
              )}
            </div>

            {/* Ngày sinh */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dob">
                Ngày sinh <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dob"
                type="date"
                aria-invalid={!!errors.dob}
                {...register("dob")}
              />
              {errors.dob && (
                <p className="text-xs text-destructive">
                  {errors.dob.message}
                </p>
              )}
            </div>

            {/* Giới tính */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Giới tính <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    items={GENDER_OPTIONS}
                  >
                    <SelectTrigger
                      className="w-full cursor-pointer"
                      aria-invalid={!!errors.gender}
                    >
                      <SelectValue placeholder="Chọn giới tính">
                        {(val) =>
                          val ? GENDER_LABEL_MAP[String(val)] ?? String(val) : "Chọn giới tính"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && (
                <p className="text-xs text-destructive">
                  {errors.gender.message}
                </p>
              )}
            </div>

            {/* Dân tộc */}
            <div className="flex flex-col gap-1.5">
              <Label>Dân tộc</Label>
              <Controller
                name="ethnicity"
                control={control}
                render={({ field }) => (
                  <FormCombobox
                    options={ETHNICITIES}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Chọn dân tộc"
                    searchPlaceholder="Tìm dân tộc..."
                    emptyMessage="Không tìm thấy dân tộc."
                    aria-invalid={!!errors.ethnicity}
                  />
                )}
              />
              {errors.ethnicity && (
                <p className="text-xs text-destructive">
                  {errors.ethnicity.message}
                </p>
              )}
            </div>

            {/* Tôn giáo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="religion">Tôn giáo</Label>
              <Input
                id="religion"
                placeholder="Không"
                {...register("religion")}
              />
              {errors.religion && (
                <p className="text-xs text-destructive">
                  {errors.religion.message}
                </p>
              )}
            </div>

            {/* Quốc tịch */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nationality">Quốc tịch</Label>
              <Input
                id="nationality"
                placeholder="Việt Nam"
                {...register("nationality")}
              />
              {errors.nationality && (
                <p className="text-xs text-destructive">
                  {errors.nationality.message}
                </p>
              )}
            </div>

            {/* Số năm học tiếng Trung */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="chinese_study_years">
                Số năm học tiếng Trung
              </Label>
              <Input
                id="chinese_study_years"
                type="number"
                min={0}
                placeholder="0"
                {...register("chinese_study_years", { valueAsNumber: true })}
              />
              {errors.chinese_study_years && (
                <p className="text-xs text-destructive">
                  {errors.chinese_study_years.message}
                </p>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
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
              {isNew ? "Tạo hồ sơ" : "Lưu thông tin"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});
