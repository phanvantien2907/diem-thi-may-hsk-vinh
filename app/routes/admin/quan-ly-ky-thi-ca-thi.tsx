import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/quan-ly-ky-thi-ca-thi";
import { requireAdminAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";
import type {
  ApiResponse,
  ExamPublicationStatus,
  ExamSession,
  ExamSessionStatus,
  ExamShift,
  ExamType,
} from "~/types/exam";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import { toast } from "~/components/ui/toast";
import {
  CalendarDaysIcon,
  CalendarIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  EyeIcon,
  FileTextIcon,
  FilterIcon,
  GlobeIcon,
  InfoIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  SunIcon,
  SunsetIcon,
  MoonIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  BuildingIcon,
  AlertTriangleIcon,
} from "lucide-react";

const PAGE_SIZE = 10;

// ─── Zod Schema Tạo Ca Thi ──────────────────────────────────────────────────
const createSessionSchema = z
  .object({
    exam_type_id: z.coerce.number().int().min(1, "Vui lòng chọn loại kỳ thi"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng chọn ngày thi hợp lệ"),
    shift: z.enum(["morning", "afternoon"]),
    capacity: z.coerce.number().int().min(1, "Số slot tiếp nhận phải lớn hơn 0"),
    fee: z.coerce.number().int().min(0, "Lệ phí không được là số âm"),
    registration_deadline: z.string().min(1, "Vui lòng chọn thời hạn đăng ký"),
    publication_status: z
      .enum(["published", "draft", "scheduled"])
      .default("published"),
    publish_at: z.string().optional(),
    check_in_at: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publication_status === "scheduled") {
        return !!data.publish_at && data.publish_at.trim().length > 0;
      }
      return true;
    },
    {
      message: "Vui lòng chọn thời điểm công khai khi lên lịch",
      path: ["publish_at"],
    }
  );

type CreateSessionInput = z.input<typeof createSessionSchema>;
type CreateSessionValues = z.output<typeof createSessionSchema>;
type SessionAction = { success?: boolean; message?: string; error?: string };

function getData<T>(json: ApiResponse<T>): T {
  return json.data;
}

// ─── Định dạng ngày giờ chuẩn BẮT BUỘC theo Project Rules (Rule 6) ────────────
// Định dạng chuẩn: dd/MM/yyyy và dd/MM/yyyy HH:mm:ss (hoặc dd/MM/yyyy HH:mm)
function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(
  value: string | null | undefined,
  includeSeconds = false
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (!includeSeconds) {
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function toDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatCurrency(value: number): string {
  if (value === 0) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getShiftDetails(shift: ExamShift) {
  switch (shift) {
    case "morning":
      return {
        label: "Ca Sáng",
        timeRange: "08:30 - 11:30",
        icon: SunIcon,
        className:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      };
    case "afternoon":
      return {
        label: "Ca Chiều",
        timeRange: "13:30 - 16:30",
        icon: SunsetIcon,
        className:
          "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
      };
    case "evening":
      return {
        label: "Ca Tối",
        timeRange: "18:00 - 21:00",
        icon: MoonIcon,
        className:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
      };
  }
}

function getStatusDetails(status: ExamSessionStatus) {
  switch (status) {
    case "open":
      return {
        label: "Đang mở",
        variant: "default" as const,
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        dotClass: "bg-emerald-500",
        pulse: true,
      };
    case "closed":
      return {
        label: "Đã đóng",
        variant: "secondary" as const,
        badgeClass:
          "bg-muted text-muted-foreground border-border dark:bg-muted/60",
        dotClass: "bg-muted-foreground",
        pulse: false,
      };
    case "cancelled":
      return {
        label: "Đã hủy",
        variant: "destructive" as const,
        badgeClass:
          "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
        dotClass: "bg-destructive",
        pulse: false,
      };
  }
}

function getPublicationStatusDetails(
  status?: ExamPublicationStatus | string | null
) {
  switch (status) {
    case "draft":
      return {
        label: "Bản nháp",
        variant: "secondary" as const,
        badgeClass:
          "bg-muted text-muted-foreground border-border dark:bg-muted/60",
      };
    case "scheduled":
      return {
        label: "Lên lịch",
        variant: "outline" as const,
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
      };
    case "published":
    default:
      return {
        label: "Công khai",
        variant: "outline" as const,
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
      };
  }
}

// ─── React Router v7 Loader ─────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAdminAuth(request);
  const url = new URL(request.url);
  const examTypeId = url.searchParams.get("exam_type_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const params = new URLSearchParams();
  if (examTypeId) params.set("exam_type_id", examTypeId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const [sessionsResponse, examTypesResponse] = await Promise.all([
    fetch(
      `${API_BASE_URL}/api/v1/admin/exam-sessions${params.size ? `?${params}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ),
    fetch(`${API_BASE_URL}/api/v1/exam-types`, { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  if (!sessionsResponse.ok || !examTypesResponse.ok) {
    throw new Response("Không thể tải dữ liệu ca thi từ máy chủ.", {
      status: 502,
    });
  }

  const [sessionsJson, examTypesJson] = await Promise.all([
    sessionsResponse.json() as Promise<ApiResponse<ExamSession[]>>,
    examTypesResponse.json() as Promise<ApiResponse<ExamType[]>>,
  ]);

  return {
    user,
    token,
    sessions: getData(sessionsJson) ?? [],
    examTypes: getData(examTypesJson) ?? [],
  };
}

// ─── React Router v7 Action ─────────────────────────────────────────────────
export async function action({ request }: Route.ActionArgs) {
  const { token } = await requireAdminAuth(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let endpoint = "";
  let method = "POST";
  let body: string | undefined;
  if (intent === "create") {
    endpoint = "/api/v1/admin/exam-sessions/batch-create";
    const examTypeId = Number(formData.get("exam_type_id"));
    const date = String(formData.get("date"));
    const shift = String(formData.get("shift"));
    const capacity = Number(formData.get("capacity"));
    const fee = Number(String(formData.get("fee") ?? "0").replace(/\D/g, ""));
    const regDeadlineRaw = String(formData.get("registration_deadline"));
    const publicationStatus = String(
      formData.get("publication_status") || "published"
    );
    const publishAtRaw = formData.get("publish_at")
      ? String(formData.get("publish_at"))
      : "";
    const checkInAtRaw = formData.get("check_in_at")
      ? String(formData.get("check_in_at"))
      : "";

    const sessionPayload: Record<string, unknown> = {
      exam_type_id: examTypeId,
      date,
      shift,
      capacity,
      fee,
      registration_deadline: regDeadlineRaw
        ? new Date(regDeadlineRaw).toISOString()
        : "",
      exam_session_publication_status: publicationStatus,
    };

    if (publicationStatus === "scheduled" && publishAtRaw) {
      sessionPayload.exam_session_publish_at = new Date(publishAtRaw).toISOString();
    }
    if (checkInAtRaw) {
      sessionPayload.exam_session_check_in_at = new Date(checkInAtRaw).toISOString();
    }

    body = JSON.stringify({
      sessions: [sessionPayload],
    });
  } else if (intent === "cancel" && sessionId) {
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/cancel`;
  } else if (intent === "update-publication-status" && sessionId) {
    endpoint = `/api/v1/admin/exam-sessions/${sessionId}/publication-status`;
    method = "PATCH";
    const pubStatus = String(formData.get("publication_status") || "published");
    const pubAt = formData.get("publish_at") ? String(formData.get("publish_at")) : "";
    const sessionPayload: Record<string, string> = {
      exam_session_publication_status: pubStatus,
    };
    if (pubStatus === "scheduled" && pubAt) {
      sessionPayload.exam_session_publish_at = new Date(pubAt).toISOString();
    }
    body = JSON.stringify(sessionPayload);
  } else {
    return { error: "Thao tác không hợp lệ." } satisfies SessionAction;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    ...(body ? { body } : {}),
  });

  const json = (await response.json().catch(() => null)) as
    | ApiResponse<unknown>
    | { message?: string; error?: string }
    | null;

  if (!response.ok) {
    return {
      error:
        (json &&
          "error" in json &&
          typeof json.error === "string" &&
          json.error) ||
        "Thao tác không thành công. Vui lòng thử lại sau.",
    } satisfies SessionAction;
  }

  return {
    success: true,
    message:
      intent === "create"
        ? "Đã tạo ca thi mới thành công."
        : intent === "cancel"
          ? "Đã hủy ca thi thành công."
          : "Cập nhật trạng thái phát hành thành công.",
  } satisfies SessionAction;
}

// ─── Modal Dialog: Tạo Ca Thi Mới ───────────────────────────────────────────
function SessionCreateDialog({
  examTypes,
}: {
  examTypes: ExamType[];
}) {
  const fetcher = useFetcher<SessionAction>();
  const [open, setOpen] = React.useState(false);
  const [displayFee, setDisplayFee] = React.useState("");

  const form = useForm<CreateSessionInput, unknown, CreateSessionValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      shift: "morning",
      capacity: 40,
      fee: 0,
      date: "",
      registration_deadline: "",
      publication_status: "published",
      publish_at: "",
      check_in_at: "",
    },
  });

  const publicationStatus = form.watch("publication_status");

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplayFee("");
      form.setValue("fee", 0, { shouldValidate: true });
      return;
    }
    const num = parseInt(digits, 10);
    const formatted = new Intl.NumberFormat("vi-VN").format(num);
    setDisplayFee(formatted);
    form.setValue("fee", num, { shouldValidate: true });
  };

  const submit = (values: CreateSessionValues) => {
    fetcher.submit(
      {
        ...values,
        fee: String(values.fee),
        intent: "create",
      },
      { method: "post", encType: "application/x-www-form-urlencoded" }
    );
  };

  React.useEffect(() => {
    if (open) {
      const currentFee = form.getValues("fee");
      setDisplayFee(
        currentFee
          ? new Intl.NumberFormat("vi-VN").format(Number(currentFee))
          : ""
      );
    }
  }, [open, form]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Tạo ca thi thành công",
        description: fetcher.data.message,
      });
      setOpen(false);
      form.reset();
      setDisplayFee("");
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể tạo ca thi",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, form]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="rounded-full cursor-pointer hover:bg-primary/90 shadow-2xs font-medium">
            <PlusIcon className="size-4 mr-1.5" />
            Tạo ca thi mới
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-primary border-primary/20 bg-primary/5"
            >
              Tạo mới
            </Badge>
            <span className="text-xs text-muted-foreground">• Phân bổ ca thi</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Khởi tạo Ca thi HSK máy tính
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Điền đầy đủ thông tin kỳ thi, số slot và thiết lập thời gian biểu cho ca thi.
          </DialogDescription>
        </DialogHeader>

        <Form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Loại kỳ thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="exam_type_id"
                  className="text-xs font-semibold text-foreground"
                >
                  Loại kỳ thi <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="exam_type_id"
                  value={
                    form.watch("exam_type_id")
                      ? String(form.watch("exam_type_id"))
                      : ""
                  }
                  onValueChange={(value) =>
                    form.setValue("exam_type_id", Number(value), {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    id="exam_type_id"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn loại kỳ thi HSK">
                      {(val) => {
                        const current = val ?? form.watch("exam_type_id");
                        if (!current) return "Chọn loại kỳ thi HSK";
                        const matched = examTypes.find(
                          (type) => String(type.id) === String(current)
                        );
                        return matched ? matched.name : "Chọn loại kỳ thi HSK";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      {examTypes.map((type) => (
                        <SelectItem
                          key={type.id}
                          value={String(type.id)}
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          <span className="font-medium">{type.name}</span>
                          {type.code ? (
                            <span className="text-muted-foreground text-[11px] ml-1.5">
                              ({type.code})
                            </span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {form.formState.errors.exam_type_id && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.exam_type_id.message}
                  </p>
                )}
              </div>

              {/* Ngày thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="date"
                  className="text-xs font-semibold text-foreground"
                >
                  Ngày thi tổ chức <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={todayStr}
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              {/* Buổi thi */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="shift"
                  className="text-xs font-semibold text-foreground"
                >
                  Buổi thi <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="shift"
                  defaultValue="morning"
                  onValueChange={(value) =>
                    form.setValue("shift", value as "morning" | "afternoon")
                  }
                >
                  <SelectTrigger
                    id="shift"
                    className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn buổi thi">
                      {(val) => {
                        const current = val ?? form.watch("shift");
                        if (current === "morning")
                          return "Buổi sáng (08:30 - 11:30)";
                        if (current === "afternoon")
                          return "Buổi chiều (13:30 - 16:30)";
                        return "Buổi sáng (08:30 - 11:30)";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem
                        value="morning"
                        className="cursor-pointer text-xs sm:text-sm"
                      >
                        Buổi sáng (08:30 - 11:30)
                      </SelectItem>
                      <SelectItem
                        value="afternoon"
                        className="cursor-pointer text-xs sm:text-sm"
                      >
                        Buổi chiều (13:30 - 16:30)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Giờ thí sinh có mặt */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="check_in_at"
                  className="text-xs font-semibold text-foreground"
                >
                  Giờ có mặt
                </Label>
                <Input
                  id="check_in_at"
                  type="datetime-local"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("check_in_at")}
                />
              </div>

              {/* Số slot */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="capacity"
                    className="text-xs font-semibold text-foreground"
                  >
                    Số slot <span className="text-destructive">*</span>
                  </Label>
                </div>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm"
                  {...form.register("capacity")}
                />
                {form.formState.errors.capacity && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.capacity.message}
                  </p>
                )}
              </div>

              {/* Lệ phí */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="fee"
                    className="text-xs font-semibold text-foreground"
                  >
                    Lệ phí thi (VNĐ) <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] font-medium text-primary">
                    {displayFee ? `${displayFee} đ` : "0 đ"}
                  </span>
                </div>
                <input type="hidden" {...form.register("fee")} />
                <Input
                  id="fee"
                  type="text"
                  inputMode="numeric"
                  value={displayFee}
                  onChange={handleFeeChange}
                  placeholder="Ví dụ: 1.330.000"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm font-medium"
                />
                {form.formState.errors.fee && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.fee.message}
                  </p>
                )}
              </div>
            </div>

            {/* Hạn đăng ký */}
            {/* Hạn chót tiếp nhận hồ sơ */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="registration_deadline"
                className="text-xs font-semibold text-foreground"
              >
                Hạn chót tiếp nhận hồ sơ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                className="h-9 rounded-full px-3 text-xs sm:text-sm"
                {...form.register("registration_deadline")}
              />
              <p className="text-[11px] text-muted-foreground">
                Hệ thống sẽ tự động khóa nhận đăng ký mới khi đến thời điểm này.
              </p>
              {form.formState.errors.registration_deadline && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                  <AlertTriangleIcon className="size-3" />
                  {form.formState.errors.registration_deadline.message}
                </p>
              )}
            </div>

            {/* Trạng thái công khai */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="publication_status"
                className="text-xs font-semibold text-foreground"
              >
                Trạng thái hiển thị ca thi <span className="text-destructive">*</span>
              </Label>
              <Select
                name="publication_status"
                value={form.watch("publication_status")}
                onValueChange={(value) =>
                  form.setValue(
                    "publication_status",
                    value as "published" | "draft" | "scheduled",
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger
                  id="publication_status"
                  className="w-full h-9 rounded-full px-3 text-xs sm:text-sm cursor-pointer"
                >
                  <SelectValue placeholder="Chọn trạng thái công khai">
                    {(val) => {
                      const current = val ?? form.watch("publication_status");
                      if (current === "published")
                        return "Công khai ngay";
                      if (current === "draft")
                        return "Bản nháp";
                      if (current === "scheduled")
                        return "Lên lịch công khai";
                      return "Công khai ngay";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    <SelectItem
                      value="published"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Công khai ngay
                    </SelectItem>
                    <SelectItem
                      value="draft"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Bản nháp
                    </SelectItem>
                    <SelectItem
                      value="scheduled"
                      className="cursor-pointer text-xs sm:text-sm"
                    >
                      Lên lịch công khai
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Thời điểm công khai nếu chọn scheduled */}
            {publicationStatus === "scheduled" && (
              <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-sky-200/70 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/60">
                <Label
                  htmlFor="publish_at"
                  className="text-xs font-semibold text-foreground"
                >
                  Thời gian công khai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="publish_at"
                  type="datetime-local"
                  className="h-9 rounded-full px-3 text-xs sm:text-sm bg-background"
                  {...form.register("publish_at")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Hệ thống sẽ tự động chuyển ca thi sang trạng thái công khai cho thí sinh vào thời điểm này.
                </p>
                {form.formState.errors.publish_at && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertTriangleIcon className="size-3" />
                    {form.formState.errors.publish_at.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full cursor-pointer hover:bg-muted text-xs sm:text-sm"
              onClick={() => setOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={fetcher.state !== "idle"}
              className="rounded-full cursor-pointer hover:bg-primary/90 text-xs sm:text-sm"
            >
              {fetcher.state === "submitting" ? (
                <>
                  <RefreshCwIcon className="size-3.5 mr-1.5 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                "Tạo ca thi"
              )}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Dialog: Xem Chi Tiết Ca Thi ──────────────────────────────────────
function SessionDetailDialog({
  session,
  examType,
  open,
  onOpenChange,
  onCancelSession,
  onOpenPublishSchedule,
  onPublishNow,
}: {
  session: ExamSession | null;
  examType?: ExamType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelSession: (session: ExamSession) => void;
  onOpenPublishSchedule?: (session: ExamSession) => void;
  onPublishNow?: (session: ExamSession) => void;
}) {
  if (!session) return null;

  const shiftInfo = getShiftDetails(session.shift);
  const statusInfo = getStatusDetails(session.status);
  const pubStatusInfo = getPublicationStatusDetails(session.exam_session_publication_status);
  const ShiftIcon = shiftInfo.icon;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(String(session.id));
    toast.add({
      type: "info",
      title: "Đã sao chép mã ca thi",
      description: `Mã ca thi #${session.id} đã được lưu vào bộ nhớ tạm.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Mã ca #{session.id}
            </Badge>
            <span className="text-xs text-muted-foreground/60">•</span>
            {session.status === "cancelled" ? (
              <Badge
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
              >
                <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.label}
              </Badge>
            ) : session.exam_session_publication_status === "draft" ? (
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-border inline-flex items-center gap-1.5 bg-muted text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground" />
                Bản nháp
              </Badge>
            ) : session.exam_session_publication_status === "scheduled" ? (
              <Badge
                variant="outline"
                className="rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60"
              >
                <span className="size-1.5 rounded-full bg-sky-500" />
                Lên lịch
              </Badge>
            ) : (
              <Badge
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
              >
                <span
                  className={`size-1.5 rounded-full ${statusInfo.dotClass} ${
                    statusInfo.pulse ? "animate-pulse" : ""
                  }`}
                />
                {statusInfo.label}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {examType?.name ?? `Kỳ thi HSK #${session.exam_type_id}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {examType?.description ??
              "Hệ thống thi trắc nghiệm trên máy tính chuẩn khảo thí quốc tế HSK."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {/* Card thông tin thời gian */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-primary" />
              Lịch thi & Ca thi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Ngày tổ chức thi</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {formatDateOnly(session.date)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Buổi thi & Khung giờ</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium border flex items-center gap-1 ${shiftInfo.className}`}
                  >
                    <ShiftIcon className="size-3" />
                    {shiftInfo.label} ({shiftInfo.timeRange})
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Giờ thí sinh có mặt</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-sky-500" />
                  {session.exam_session_check_in_at
                    ? formatDateTime(session.exam_session_check_in_at, false)
                    : "Theo thông báo ca thi"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Hạn chót tiếp nhận hồ sơ</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-amber-500" />
                  {formatDateTime(session.registration_deadline, false)}
                </p>
              </div>
            </div>
          </div>

          {/* Card thông tin slot, lệ phí & công khai */}
          <div className="rounded-xl border bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="size-3.5 text-primary" />
              Chỉ tiêu & Thông tin vận hành
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Số slot tiếp nhận</p>
                <p className="font-semibold text-foreground mt-1 flex items-center gap-1.5">
                  <UsersIcon className="size-3.5 text-primary" />
                  {session.capacity} thí sinh
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Lệ phí đăng ký</p>
                <p className="font-bold text-foreground text-sm sm:text-base mt-0.5">
                  {formatCurrency(session.fee)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Trạng thái phát hành</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${pubStatusInfo.badgeClass}`}
                  >
                    {pubStatusInfo.label}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-muted-foreground text-xs">Thời gian công khai</p>
                  {(session.exam_session_publication_status === "draft" ||
                    session.exam_session_publication_status === "scheduled") &&
                    onOpenPublishSchedule && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="rounded-full cursor-pointer hover:bg-muted text-[11px] h-5 px-1.5 font-normal text-primary hover:text-primary"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenPublishSchedule(session);
                        }}
                      >
                        <CalendarClockIcon className="size-3 mr-1 text-primary" />
                        Chỉnh sửa
                      </Button>
                    )}
                </div>
                <p className="font-semibold text-foreground text-xs sm:text-sm mt-1">
                  {session.exam_session_publish_at
                    ? formatDateTime(session.exam_session_publish_at, false)
                    : session.exam_session_publication_status === "draft"
                      ? "Chưa lên lịch (Bản nháp)"
                      : "Công khai ngay"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full cursor-pointer hover:bg-muted text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto justify-center"
            onClick={handleCopyId}
          >
            <CopyIcon className="size-3.5 mr-1" />
            Sao chép mã ca
          </Button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full cursor-pointer hover:bg-muted text-xs"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {session.status !== "cancelled" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer text-xs text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onCancelSession(session);
                }}
              >
                <XCircleIcon className="size-3.5 mr-1" />
                Hủy ca thi
              </Button>
            )}
            {session.status !== "cancelled" &&
              session.exam_session_publication_status !== "published" &&
              onPublishNow && (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full cursor-pointer text-xs font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    onPublishNow(session);
                  }}
                >
                  <GlobeIcon className="size-3.5 mr-1" />
                  {session.exam_session_publication_status === "draft"
                    ? "Công khai ca thi"
                    : "Công khai ngay"}
                </Button>
              )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Dialog: Xem Chi Tiết & Chỉnh Sửa Ngày Công Khai ─────────────────
interface PublishScheduleDialogProps {
  session: ExamSession | null;
  examTypes: ExamType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishNow?: (session: ExamSession) => void;
}

const updatePublishScheduleSchema = z
  .object({
    publication_status: z.enum(["draft", "scheduled"]),
    publish_at: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.publication_status === "scheduled") {
        if (!data.publish_at || data.publish_at.trim().length === 0) {
          return false;
        }
        const time = new Date(data.publish_at).getTime();
        return !isNaN(time) && time > Date.now();
      }
      return true;
    },
    {
      message: "Thời gian công khai phải ở tương lai",
      path: ["publish_at"],
    }
  );

type UpdatePublishScheduleInput = z.input<typeof updatePublishScheduleSchema>;
type UpdatePublishScheduleValues = z.output<typeof updatePublishScheduleSchema>;

function PublishScheduleDialog({
  session,
  examTypes,
  open,
  onOpenChange,
  onPublishNow,
}: PublishScheduleDialogProps) {
  const fetcher = useFetcher<SessionAction>();
  const examType = examTypes.find((t) => t.id === session?.exam_type_id);
  const shiftInfo = session ? getShiftDetails(session.shift) : null;

  const form = useForm<
    UpdatePublishScheduleInput,
    unknown,
    UpdatePublishScheduleValues
  >({
    resolver: zodResolver(updatePublishScheduleSchema),
    defaultValues: {
      publication_status: "scheduled",
      publish_at: "",
    },
  });

  const selectedPubStatus = form.watch("publication_status");

  React.useEffect(() => {
    if (open && session) {
      const currentPubStatus =
        session.exam_session_publication_status === "draft" ? "draft" : "scheduled";
      form.reset({
        publication_status: currentPubStatus,
        publish_at: toDateTimeLocalInput(session.exam_session_publish_at),
      });
    }
  }, [open, session, form]);

  React.useEffect(() => {
    if (fetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Cập nhật thành công",
        description: fetcher.data.message || "Đã lưu lịch công khai ca thi.",
      });
      onOpenChange(false);
    } else if (fetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể cập nhật lịch công khai",
        description: fetcher.data.error,
      });
    }
  }, [fetcher.data, onOpenChange]);

  if (!session) return null;

  const onSubmit = (values: UpdatePublishScheduleValues) => {
    fetcher.submit(
      {
        intent: "update-publication-status",
        session_id: String(session.id),
        publication_status: values.publication_status,
        publish_at: values.publish_at || "",
      },
      { method: "post" }
    );
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="p-6 pb-4 pr-12 border-b bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-primary border-primary/20 bg-primary/5"
            >
              Mã ca #{session.id}
            </Badge>
            <span className="text-xs text-muted-foreground/60">•</span>
            <Badge
              variant="outline"
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${session.exam_session_publication_status === "scheduled"
                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60"
                : "bg-muted text-muted-foreground border-border dark:bg-muted/60"
                }`}
            >
              {session.exam_session_publication_status === "scheduled"
                ? "Đã lên lịch"
                : "Bản nháp"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Lịch công khai ca thi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Xem chi tiết ngày công khai và cập nhật lịch phát hành tự động cho ca thi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Tóm tắt ca thi */}
            <div className="rounded-xl border bg-card/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Kỳ thi:</span>
                <span className="font-semibold text-foreground">
                  {examType?.name ?? `Kỳ thi #${session.exam_type_id}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ngày thi & Ca:</span>
                <span className="font-medium text-foreground">
                  {formatDateOnly(session.date)} ({shiftInfo?.label})
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">Lịch hiện tại:</span>
                <span className="font-semibold text-foreground">
                  {session.exam_session_publish_at
                    ? formatDateTime(session.exam_session_publish_at, true)
                    : "Chưa thiết lập (Bản nháp)"}
                </span>
              </div>
            </div>

            {/* Chỉnh sửa trạng thái & thời gian công khai */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="edit_pub_status"
                  className="text-xs font-semibold text-foreground"
                >
                  Trạng thái phát hành <span className="text-destructive">*</span>
                </Label>
                <Select
                  name="publication_status"
                  value={selectedPubStatus}
                  onValueChange={(val) =>
                    form.setValue(
                      "publication_status",
                      val as "draft" | "scheduled",
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger
                    id="edit_pub_status"
                    className="w-full h-9 rounded-full px-3 text-xs cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn trạng thái">
                      {selectedPubStatus === "scheduled"
                        ? "Lên lịch công khai tự động"
                        : "Lưu làm bản nháp (chưa công khai)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectGroup>
                      <SelectItem
                        value="scheduled"
                        className="cursor-pointer text-xs"
                      >
                        Lên lịch công khai tự động
                      </SelectItem>
                      <SelectItem
                        value="draft"
                        className="cursor-pointer text-xs"
                      >
                        Lưu làm bản nháp (chưa công khai)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {selectedPubStatus === "scheduled" && (
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-sky-200/70 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800/60">
                  <Label
                    htmlFor="edit_publish_at"
                    className="text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span>
                      Thời gian công khai tự động{" "}
                      <span className="text-destructive">*</span>
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (Định dạng: Ngày / Giờ)
                    </span>
                  </Label>
                  <Input
                    id="edit_publish_at"
                    type="datetime-local"
                    className="h-9 rounded-full px-3 text-xs bg-background"
                    {...form.register("publish_at")}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống sẽ tự động chuyển ca thi này sang trạng thái công khai vào thời điểm đã đặt.
                  </p>
                  {form.formState.errors.publish_at && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangleIcon className="size-3" />
                      {form.formState.errors.publish_at.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {onPublishNow ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-emerald-50 text-emerald-600 border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 text-xs w-full sm:w-auto"
                onClick={() => {
                  onOpenChange(false);
                  onPublishNow(session);
                }}
              >
                <GlobeIcon className="size-3.5 mr-1.5 text-emerald-600" />
                Công khai ngay
              </Button>
            ) : <div />}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full cursor-pointer hover:bg-muted text-xs"
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCwIcon className="size-3 mr-1.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Meta Function ──────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Kỳ thi & Ca Thi" },
  {
    name: "description",
    content:
      "Quản lý lịch mở đăng ký, điều phối ca thi và phát hành ca thi HSK máy tính.",
  },
];

// ─── Main Route Component ───────────────────────────────────────────────────
export default function QuanLyKyThiCaThiPage() {
  const { sessions, examTypes } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const actionFetcher = useFetcher<SessionAction>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filters state
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const examTypeFilter = searchParams.get("exam_type_id") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const shiftFilter = searchParams.get("shift") ?? "all";
  const pubStatusFilter = searchParams.get("pub_status") ?? "all";

  // Detail & Action Dialogs state
  const [selectedSessionForDetail, setSelectedSessionForDetail] =
    React.useState<ExamSession | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const [sessionToCancel, setSessionToCancel] =
    React.useState<ExamSession | null>(null);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = React.useState(false);

  // Publish confirmation alert state
  const [sessionToPublish, setSessionToPublish] =
    React.useState<ExamSession | null>(null);
  const [isPublishAlertOpen, setIsPublishAlertOpen] = React.useState(false);

  // Publish schedule view & edit dialog state
  const [sessionForPublishSchedule, setSessionForPublishSchedule] =
    React.useState<ExamSession | null>(null);
  const [isPublishScheduleOpen, setIsPublishScheduleOpen] = React.useState(false);

  // Filtered sessions
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((session) => {
      const type = examTypes.find((item) => item.id === session.exam_type_id);
      const haystack = `${session.id} ${type?.name ?? ""} ${type?.code ?? ""}`.toLowerCase();

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase().trim());
      const matchesType =
        examTypeFilter === "all" ||
        String(session.exam_type_id) === examTypeFilter;
      const matchesStatus =
        statusFilter === "all" || session.status === statusFilter;
      const matchesShift =
        shiftFilter === "all" || session.shift === shiftFilter;
      const matchesPubStatus =
        pubStatusFilter === "all" ||
        (session.exam_session_publication_status ?? "published") === pubStatusFilter;

      return matchesQuery && matchesType && matchesStatus && matchesShift && matchesPubStatus;
    });
  }, [sessions, examTypes, query, examTypeFilter, statusFilter, shiftFilter, pubStatusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleSessions = React.useMemo(() => {
    return filteredSessions.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredSessions, currentPage]);

  // Metrics summary (Đang mở chỉ tính ca thi đã phát hành công khai)
  const openCount = sessions.filter(
    (s) =>
      s.status === "open" &&
      (s.exam_session_publication_status ?? "published") === "published"
  ).length;
  const closedCount = sessions.filter((s) => s.status === "closed").length;
  const cancelledCount = sessions.filter((s) => s.status === "cancelled").length;
  const totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0);
  const draftCount = sessions.filter((s) => (s.exam_session_publication_status ?? "published") === "draft").length;
  const scheduledCount = sessions.filter((s) => (s.exam_session_publication_status ?? "published") === "scheduled").length;

  // Helper cập nhật params (tuân thủ Rule 100: reset về trang 1 khi đổi lọc/tìm kiếm)
  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value && value !== "all") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams();
    setSearchParams(next);
  };

  const hasActiveFilters =
    Boolean(query) ||
    examTypeFilter !== "all" ||
    statusFilter !== "all" ||
    shiftFilter !== "all" ||
    pubStatusFilter !== "all";

  // Notifications from actionFetcher
  React.useEffect(() => {
    if (actionFetcher.data?.success) {
      toast.add({
        type: "success",
        title: "Thao tác thành công",
        description: actionFetcher.data.message,
      });
      revalidator.revalidate();
      setSessionToCancel(null);
      setIsCancelAlertOpen(false);
      setSessionToPublish(null);
      setIsPublishAlertOpen(false);
      setSessionForPublishSchedule(null);
      setIsPublishScheduleOpen(false);
    } else if (actionFetcher.data?.error) {
      toast.add({
        type: "error",
        title: "Không thể hoàn tất thao tác",
        description: actionFetcher.data.error,
      });
    }
  }, [actionFetcher.data, revalidator]);

  const confirmCancelSession = () => {
    if (!sessionToCancel) return;
    actionFetcher.submit(
      { intent: "cancel", session_id: String(sessionToCancel.id) },
      { method: "post" }
    );
  };

  const handleOpenPublishConfirm = (session: ExamSession) => {
    setSessionToPublish(session);
    setIsPublishAlertOpen(true);
  };

  const handleOpenPublishSchedule = (session: ExamSession) => {
    setSessionForPublishSchedule(session);
    setIsPublishScheduleOpen(true);
  };

  const confirmPublishSession = () => {
    if (!sessionToPublish) return;
    actionFetcher.submit(
      {
        intent: "update-publication-status",
        session_id: String(sessionToPublish.id),
        publication_status: "published",
      },
      { method: "post" }
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-primary border-primary/20 bg-primary/5"
            >
              Hệ thống thi máy HSK
            </Badge>
            <span className="text-muted-foreground/60 text-xs">•</span>
            <span className="text-xs text-muted-foreground">Đại học Vinh</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Kỳ thi & Ca thi
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Quản lý lịch mở đăng ký, điều phối ca thi và phát hành ca thi HSK máy tính.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            className="rounded-full cursor-pointer hover:bg-muted font-medium text-xs sm:text-sm shadow-2xs"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            <RefreshCwIcon
              className={`size-3.5 mr-1.5 ${revalidator.state === "loading" ? "animate-spin" : ""
                }`}
            />
            {revalidator.state === "loading" ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </Button>

          <SessionCreateDialog examTypes={examTypes} />
        </div>
      </div>

      {/* ── Metric / Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Tổng ca thi */}
        <Card
          onClick={handleResetFilters}
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-primary/40 ${!hasActiveFilters ? "ring-1 ring-primary/30 border-primary/40 bg-primary/5" : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <CalendarDaysIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Tổng ca thi</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {sessions.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Đang mở đăng ký */}
        <Card
          onClick={() =>
            updateParams({
              status: statusFilter === "open" ? null : "open",
              page: null,
            })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-emerald-500/40 ${statusFilter === "open"
            ? "ring-1 ring-emerald-500/40 border-emerald-500/40 bg-emerald-500/5"
            : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Đang mở</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {openCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Bản nháp */}
        <Card
          onClick={() =>
            updateParams({
              pub_status: pubStatusFilter === "draft" ? null : "draft",
              page: null,
            })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-amber-500/40 ${pubStatusFilter === "draft"
            ? "ring-1 ring-amber-500/40 border-amber-500/40 bg-amber-500/5"
            : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <FileTextIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Bản nháp</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {draftCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Lên lịch */}
        <Card
          onClick={() =>
            updateParams({
              pub_status: pubStatusFilter === "scheduled" ? null : "scheduled",
              page: null,
            })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-sky-500/40 ${pubStatusFilter === "scheduled"
            ? "ring-1 ring-sky-500/40 border-sky-500/40 bg-sky-500/5"
            : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <CalendarClockIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Lên lịch</p>
              <p className="text-xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                {scheduledCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Đã đóng / Hủy */}
        <Card
          onClick={() =>
            updateParams({
              status: statusFilter === "closed" ? null : "closed",
              page: null,
            })
          }
          className={`rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all cursor-pointer hover:border-muted-foreground/40 ${statusFilter === "closed"
            ? "ring-1 ring-muted-foreground/40 border-muted-foreground/40 bg-muted/20"
            : ""
            }`}
        >
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <ClockIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Đóng / Hủy</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {closedCount + cancelledCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Tổng số slot thi */}
        <Card className="rounded-2xl border bg-card/70 shadow-2xs hover:shadow-xs transition-all">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <UsersIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">Tổng slot</p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {totalCapacity}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Data Card: Filters & Table ─────────────────────────────────── */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border shadow-2xs">
        <CardHeader className="gap-3.5 border-b bg-card/50 p-4 sm:p-5">
          {/* Top Row: Title, Counter & Publication Status Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Danh sách ca thi HSK
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground"
                >
                  {filteredSessions.length} ca thi
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Hiển thị {filteredSessions.length} kết quả
                {hasActiveFilters && sessions.length !== filteredSessions.length
                  ? ''
                  : ""}
                {" · "}
                {PAGE_SIZE} bản ghi mỗi trang
              </CardDescription>
            </div>

            {/* Quick Publication Status Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => updateParams({ pub_status: null, page: null })}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 ${pubStatusFilter === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Tất cả ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => updateParams({ pub_status: "published", page: null })}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "published"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <GlobeIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                Công khai (
                {
                  sessions.filter(
                    (s) => (s.exam_session_publication_status ?? "published") === "published"
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => updateParams({ pub_status: "draft", page: null })}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "draft"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <FileTextIcon className="size-3 text-amber-600 dark:text-amber-400" />
                Bản nháp ({draftCount})
              </button>
              <button
                type="button"
                onClick={() => updateParams({ pub_status: "scheduled", page: null })}
                className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all font-medium shrink-0 flex items-center gap-1.5 ${pubStatusFilter === "scheduled"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <CalendarClockIcon className="size-3 text-sky-600 dark:text-sky-400" />
                Lên lịch ({scheduledCount})
              </button>
            </div>
          </div>

          {/* Bottom Row: Search & Filters Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) =>
                  updateParams({ q: event.target.value, page: null })
                }
                placeholder="Tìm mã ca thi, loại kỳ thi HSK..."
                className="h-9 rounded-full pl-8.5 pr-8 text-xs placeholder:text-xs bg-background"
                aria-label="Tìm kiếm ca thi"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateParams({ q: null, page: null })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Group */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Lọc Loại kỳ thi */}
              <Select
                value={examTypeFilter}
                onValueChange={(value) =>
                  updateParams({ exam_type_id: value, page: null })
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-48 rounded-full px-3 text-xs cursor-pointer truncate">
                  <SelectValue placeholder="Mọi loại kỳ thi">
                    {(val) => {
                      const current = val ?? examTypeFilter;
                      if (!current || current === "all") return "Mọi loại kỳ thi";
                      const matched = examTypes.find(
                        (type) => String(type.id) === String(current)
                      );
                      return matched ? matched.name : "Mọi loại kỳ thi";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-64">
                  <SelectGroup>
                    <SelectItem value="all" className="cursor-pointer text-xs">
                      Mọi loại kỳ thi
                    </SelectItem>
                    {examTypes.map((type) => (
                      <SelectItem
                        key={type.id}
                        value={String(type.id)}
                        className="cursor-pointer text-xs"
                      >
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Lọc Trạng thái */}
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  updateParams({ status: value, page: null })
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-36 rounded-full px-3 text-xs cursor-pointer">
                  <SelectValue placeholder="Mọi trạng thái">
                    {(val) => {
                      const current = val ?? statusFilter;
                      if (!current || current === "all") return "Mọi trạng thái";
                      if (current === "open") return "Đang mở";
                      if (current === "closed") return "Đã đóng";
                      if (current === "cancelled") return "Đã hủy";
                      return "Mọi trạng thái";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    <SelectItem value="all" className="cursor-pointer text-xs">
                      Mọi trạng thái
                    </SelectItem>
                    <SelectItem value="open" className="cursor-pointer text-xs">
                      Đang mở
                    </SelectItem>
                    <SelectItem value="closed" className="cursor-pointer text-xs">
                      Đã đóng
                    </SelectItem>
                    <SelectItem value="cancelled" className="cursor-pointer text-xs">
                      Đã hủy
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Lọc Buổi thi */}
              <Select
                value={shiftFilter}
                onValueChange={(value) =>
                  updateParams({ shift: value, page: null })
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-36 rounded-full px-3 text-xs cursor-pointer">
                  <SelectValue placeholder="Mọi buổi thi">
                    {(val) => {
                      const current = val ?? shiftFilter;
                      if (!current || current === "all") return "Mọi buổi thi";
                      if (current === "morning") return "Buổi sáng (08:30)";
                      if (current === "afternoon") return "Buổi chiều (13:30)";
                      return "Mọi buổi thi";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectGroup>
                    <SelectItem value="all" className="cursor-pointer text-xs">
                      Mọi buổi thi
                    </SelectItem>
                    <SelectItem value="morning" className="cursor-pointer text-xs">
                      Buổi sáng (08:30)
                    </SelectItem>
                    <SelectItem value="afternoon" className="cursor-pointer text-xs">
                      Buổi chiều (13:30)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Nút Xóa lọc nếu có lọc */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted shrink-0"
                >
                  <RotateCcwIcon className="size-3.5 mr-1" />
                  Đặt lại
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                <TableHead className="w-[85px] py-3 text-xs font-semibold text-muted-foreground pl-5">
                  Mã ca
                </TableHead>
                <TableHead className="min-w-[220px] py-3 text-xs font-semibold text-muted-foreground">
                  Loại kỳ thi
                </TableHead>
                <TableHead className="min-w-[200px] py-3 text-xs font-semibold text-muted-foreground">
                  Lịch thi & Ca thi
                </TableHead>
                <TableHead className="min-w-[110px] py-3 text-xs font-semibold text-muted-foreground">
                  Số slot
                </TableHead>
                <TableHead className="min-w-[120px] py-3 text-xs font-semibold text-muted-foreground">
                  Lệ phí
                </TableHead>
                <TableHead className="min-w-[130px] py-3 text-xs font-semibold text-muted-foreground">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[90px] py-3 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSessions.map((session) => {
                const type = examTypes.find((item) => item.id === session.exam_type_id);
                const shiftInfo = getShiftDetails(session.shift);
                const statusInfo = getStatusDetails(session.status);
                const pubStatusInfo = getPublicationStatusDetails(session.exam_session_publication_status);
                const ShiftIcon = shiftInfo.icon;

                return (
                  <TableRow
                    key={session.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {/* Mã ca */}
                    <TableCell className="pl-5 font-mono text-xs font-medium text-muted-foreground">
                      #{session.id}
                    </TableCell>

                    {/* Loại kỳ thi */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-xs sm:text-sm">
                          {type?.name ?? `Loại thi #${session.exam_type_id}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {type?.code ? (
                            <Badge
                              variant="outline"
                              className="rounded-full px-1.5 py-0 text-[10px] font-medium border-border/80"
                            >
                              {type.code}
                            </Badge>
                          ) : null}
                          {type?.description ? (
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {type.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    {/* Lịch thi & Ca thi */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm text-foreground">
                          <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{formatDateOnly(session.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium border flex items-center gap-1 ${shiftInfo.className}`}
                          >
                            <ShiftIcon className="size-3 shrink-0" />
                            {shiftInfo.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            Hạn: {formatDateTime(session.registration_deadline, false)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Số slot */}
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground">
                        <UsersIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{session.capacity}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          slot
                        </span>
                      </div>
                    </TableCell>

                    {/* Lệ phí */}
                    <TableCell className="font-semibold text-xs sm:text-sm tabular-nums text-foreground">
                      {formatCurrency(session.fee)}
                    </TableCell>

                    {/* Trạng thái */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {session.status === "cancelled" ? (
                          <Badge
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit ${statusInfo.badgeClass}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {statusInfo.label}
                          </Badge>
                        ) : session.exam_session_publication_status === "draft" ? (
                          <Badge
                            variant="secondary"
                            onClick={() => handleOpenPublishSchedule(session)}
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-border inline-flex items-center gap-1.5 w-fit bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                            title="Bản nháp — Nhấp để xem / chỉnh sửa lịch công khai"
                          >
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            Bản nháp
                          </Badge>
                        ) : session.exam_session_publication_status === "scheduled" ? (
                          <Badge
                            variant="outline"
                            onClick={() => handleOpenPublishSchedule(session)}
                            className="rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60 cursor-pointer hover:bg-sky-100/70 transition-colors"
                            title="Lên lịch — Nhấp để xem / chỉnh sửa lịch công khai"
                          >
                            <span className="size-1.5 rounded-full bg-sky-500" />
                            Lên lịch
                          </Badge>
                        ) : (
                          <Badge
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border inline-flex items-center gap-1.5 w-fit ${statusInfo.badgeClass}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${statusInfo.dotClass} ${statusInfo.pulse ? "animate-pulse" : ""
                                }`}
                            />
                            {statusInfo.label}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Thao tác */}
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Xem chi tiết ca thi"
                          onClick={() => {
                            setSelectedSessionForDetail(session);
                            setIsDetailOpen(true);
                          }}
                        >
                          <EyeIcon className="size-3.5" />
                          <span className="sr-only">Xem chi tiết</span>
                        </Button>

                        {(session.exam_session_publication_status === "draft" ||
                          session.exam_session_publication_status === "scheduled") && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full cursor-pointer hover:bg-sky-50 text-sky-600 dark:text-sky-400 hover:text-sky-700"
                              title="Xem & chỉnh sửa lịch công khai"
                              onClick={() => handleOpenPublishSchedule(session)}
                            >
                              <CalendarClockIcon className="size-3.5" />
                              <span className="sr-only">Lịch công khai</span>
                            </Button>
                          )}

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
                                aria-label={`Thao tác ca ${session.id}`}
                              />
                            }
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Ca thi #{session.id}
                            </DropdownMenuLabel>
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() => {
                                  setSelectedSessionForDetail(session);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <EyeIcon className="size-3.5 mr-2" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  navigator.clipboard
                                    ?.writeText(String(session.id))
                                    .then(() =>
                                      toast.add({
                                        type: "info",
                                        title: "Đã sao chép mã ca thi",
                                      })
                                    )
                                }
                              >
                                <CopyIcon className="size-3.5 mr-2" />
                                Sao chép mã ca
                              </DropdownMenuItem>
                            </DropdownMenuGroup>

                            {/* Publication status quick actions */}
                            {session.status !== "cancelled" &&
                              (session.exam_session_publication_status === "draft" ||
                                session.exam_session_publication_status === "scheduled") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Phát hành & Lịch
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => handleOpenPublishSchedule(session)}
                                  >
                                    <CalendarClockIcon className="size-3.5 mr-2 text-sky-600" />
                                    Xem & chỉnh sửa lịch
                                  </DropdownMenuItem>
                                  {session.exam_session_publication_status === "draft" && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs"
                                      onClick={() => handleOpenPublishConfirm(session)}
                                    >
                                      <GlobeIcon className="size-3.5 mr-2 text-emerald-600" />
                                      Công khai ca thi
                                    </DropdownMenuItem>
                                  )}
                                  {session.exam_session_publication_status === "scheduled" && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs"
                                      onClick={() => handleOpenPublishConfirm(session)}
                                    >
                                      <GlobeIcon className="size-3.5 mr-2 text-emerald-600" />
                                      Công khai ngay
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                            {session.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer text-xs text-destructive"
                                  onClick={() => {
                                    setSessionToCancel(session);
                                    setIsCancelAlertOpen(true);
                                  }}
                                >
                                  <XCircleIcon className="size-3.5 mr-2" />
                                  Hủy ca thi
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Empty state */}
              {visibleSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center gap-2">
                      <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-1">
                        <CalendarDaysIcon className="size-6" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        Không tìm thấy ca thi phù hợp
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Không có ca thi nào khớp với từ khóa tìm kiếm hoặc các tiêu chí bộ lọc đã chọn.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="rounded-full cursor-pointer mt-2 hover:bg-muted text-xs"
                        >
                          <RotateCcwIcon className="size-3.5 mr-1.5" />
                          Xóa bộ lọc tìm kiếm
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination (Tuân thủ Project Rules 99-101) ────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-3 border-t bg-card/30 p-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {filteredSessions.length > 0 ? (
              <>
                Hiển thị{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * PAGE_SIZE, filteredSessions.length)}
                </span>{" "}
                trên tổng số{" "}
                <span className="font-semibold text-foreground">
                  {filteredSessions.length}
                </span>{" "}
                ca thi
              </>
            ) : (
              "Không có dữ liệu hiển thị"
            )}
          </p>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={currentPage <= 1}
                    onClick={() => updateParams({ page: String(currentPage - 1) })}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (item) => {
                    // Logic hiển thị trang thông minh
                    const isFirst = item === 1;
                    const isLast = item === totalPages;
                    const isNearCurrent = Math.abs(item - currentPage) <= 1;

                    if (!isFirst && !isLast && !isNearCurrent) {
                      if (item === 2 && currentPage > 3) {
                        return (
                          <PaginationItem key="ellipsis-start">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      if (
                        item === totalPages - 1 &&
                        currentPage < totalPages - 2
                      ) {
                        return (
                          <PaginationItem key="ellipsis-end">
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }

                    return (
                      <PaginationItem key={item}>
                        <PaginationButton
                          isActive={item === currentPage}
                          onClick={() => updateParams({ page: String(item) })}
                        >
                          {item}
                        </PaginationButton>
                      </PaginationItem>
                    );
                  }
                )}

                <PaginationItem>
                  <PaginationNext
                    disabled={currentPage >= totalPages}
                    onClick={() => updateParams({ page: String(currentPage + 1) })}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </Card>

      {/* Thông tin hỗ trợ */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 px-1">
        <InfoIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span>
          Dữ liệu ca thi được đồng bộ trực tiếp từ máy chủ API. Nhấn "Làm mới dữ liệu" để cập nhật tình trạng mới nhất.
        </span>
      </div>

      {/* ── Dialog Xem Chi Tiết Ca Thi ──────────────────────────────────────── */}
      <SessionDetailDialog
        session={selectedSessionForDetail}
        examType={examTypes.find(
          (t) => t.id === selectedSessionForDetail?.exam_type_id
        )}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onCancelSession={(session) => {
          setSessionToCancel(session);
          setIsCancelAlertOpen(true);
        }}
        onOpenPublishSchedule={handleOpenPublishSchedule}
        onPublishNow={handleOpenPublishConfirm}
      />

      {/* ── Dialog Xem Chi Tiết & Chỉnh Sửa Lịch Công Khai ───────────────── */}
      <PublishScheduleDialog
        session={sessionForPublishSchedule}
        examTypes={examTypes}
        open={isPublishScheduleOpen}
        onOpenChange={setIsPublishScheduleOpen}
        onPublishNow={handleOpenPublishConfirm}
      />

      {/* ── AlertDialog: Xác Nhận Công Khai Ca Thi (Bản nháp & Lên lịch) ─────── */}
      <AlertDialog
        open={isPublishAlertOpen}
        onOpenChange={(open) => {
          setIsPublishAlertOpen(open);
          if (!open) setSessionToPublish(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <GlobeIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận công khai ca thi?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>
                Bạn có chắc chắn muốn công khai{" "}
                <span className="font-semibold text-foreground">
                  ca thi #{sessionToPublish?.id}
                </span>
                {sessionToPublish && (
                  <>
                    {" "}
                    (
                    {examTypes.find((t) => t.id === sessionToPublish.exam_type_id)
                      ?.name ?? `Kỳ thi #${sessionToPublish.exam_type_id}`}
                    {" - "}
                    {formatDateOnly(sessionToPublish.date)})
                  </>
                )}{" "}
                ngay bây giờ không?
              </p>
              {sessionToPublish?.exam_session_publication_status === "scheduled" && (
                <p className="text-sky-600 dark:text-sky-400 font-medium">
                  Ca thi này đang được hẹn giờ công khai vào lúc{" "}
                  {formatDateTime(sessionToPublish.exam_session_publish_at, true)}
                  . Việc công khai ngay sẽ lập tức hiển thị ca thi cho thí sinh.
                </p>
              )}
              <p>
                Sau khi công khai, ca thi sẽ xuất hiện trên trang đăng ký của thí sinh và các thí sinh có thể bắt đầu đăng ký thi.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Hủy bỏ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              onClick={confirmPublishSession}
            >
              Công khai ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog: Hủy Ca Thi (Project Rule 3 BẮT BUỘC) ────────────────── */}
      <AlertDialog
        open={isCancelAlertOpen}
        onOpenChange={setIsCancelAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0 mb-1">
              <AlertTriangleIcon className="size-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận hủy ca thi #{sessionToCancel?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn hủy ca thi này không? Ca thi sau khi hủy sẽ đóng toàn bộ tiếp nhận thí sinh và chuyển trạng thái sang "Đã hủy". Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full cursor-pointer hover:bg-muted text-xs">
              Không, giữ lại ca thi
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-full cursor-pointer hover:bg-destructive/90 text-xs font-medium"
              onClick={confirmCancelSession}
            >
              Xác nhận hủy ca thi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
