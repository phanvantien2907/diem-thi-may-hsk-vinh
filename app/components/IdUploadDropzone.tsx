import * as React from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import {
  uploadOCRDocumentFile,
  type OCRStatus,
} from "~/hooks/useOCRScanner";
import { cn } from "~/lib/utils";

export interface IdUploadDropzoneProps {
  /** Trạng thái hiện tại từ `useOCRScanner` */
  status: OCRStatus;
  /** Tiến độ quét (0-100) từ `useOCRScanner` */
  progress: number;
  /** Thông báo lỗi nếu tải lên hoặc trích xuất OCR thất bại */
  error: string | null;
  /** Kích hoạt tức thì (< 50ms) ngay khi thả file trước khi gửi request mạng */
  onOptimisticStart: () => void;
  /** Kích hoạt khi `POST /api/v1/cccd/upload` trả về `202 Accepted` kèm `task_id` */
  onTaskCreated: (taskId: string) => void;
  /** Kích hoạt khi có lỗi kiểm tra tệp hoặc lỗi mạng */
  onError: (message: string) => void;
  /** Callback tùy chọn để truyền File gốc cho luồng lưu trữ Cloudinary của form */
  onFileSelected?: (file: File) => void;
  /** Base API URL (ví dụ: `http://localhost:8080`) */
  apiBaseUrl: string;
  /** Optional JWT Access Token (Null/undefined cho phép chạy ở chế độ Guest-First) */
  token?: string | null;
  /** Vô hiệu hóa tương tác */
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

export const IdUploadDropzone = React.memo(function IdUploadDropzone({
  status,
  progress,
  error,
  onOptimisticStart,
  onTaskCreated,
  onError,
  onFileSelected,
  apiBaseUrl,
  token,
  disabled = false,
}: IdUploadDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isScanning = status === "QUEUED" || status === "PROCESSING";

  React.useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processSelectedFile = React.useCallback(
    async (file: File) => {
      if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
        onError("Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh .JPG hoặc .PNG.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        onError("Kích thước ảnh vượt quá giới hạn 5MB.");
        return;
      }

      // 1. Optimistic UX (< 50ms): Hiển thị preview & khung xương quét ngay lập tức
      const nextPreview = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return nextPreview;
      });
      onOptimisticStart();
      onFileSelected?.(file);

      // 2. Gửi bất đồng bộ lên POST /api/v1/cccd/upload (hỗ trợ cả Guest Mode và Authenticated Mode)
      try {
        const res = await uploadOCRDocumentFile(apiBaseUrl, file, token);
        onTaskCreated(res.task_id);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Lỗi kết nối máy chủ khi tải ảnh CMND/CCCD.";
        onError(msg);
      }
    },
    [apiBaseUrl, onError, onFileSelected, onOptimisticStart, onTaskCreated, token]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled || isScanning) return;

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        void processSelectedFile(droppedFile);
      }
    },
    [disabled, isScanning, processSelectedFile]
  );

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        void processSelectedFile(selectedFile);
      }
      e.target.value = "";
    },
    [processSelectedFile]
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled || isScanning ? -1 : 0}
        onClick={() => !disabled && !isScanning && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isScanning) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isScanning) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed p-4 transition-colors duration-150 cursor-pointer min-h-[148px] flex flex-col justify-center",
          isDragging
            ? "border-primary bg-primary/5"
            : status === "COMPLETED"
              ? "border-emerald-500/60 bg-emerald-500/5"
              : status === "FAILED"
                ? "border-destructive/60 bg-destructive/5"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          (disabled || isScanning) && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          className="sr-only"
          disabled={disabled || isScanning}
        />

        {/* Khung cố định chiều cao đảm bảo Zero Layout Shift (CLS = 0) */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {previewUrl ? (
            <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-black">
              <img
                src={previewUrl}
                alt="Ảnh mặt trước CMND/CCCD"
                className="h-full w-full object-cover"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="h-1 w-full bg-primary animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.9)]" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-24 w-40 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              <UploadCloud className="size-6 mb-1 text-primary" />
              <span className="text-[11px] font-medium">Quét mặt trước</span>
            </div>
          )}

          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary shrink-0" />
                <p className="text-sm font-semibold text-foreground truncate">
                  Quét tự động CMND (9 số) / CCCD (12 số)
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  isScanning && "bg-primary/15 text-primary",
                  status === "COMPLETED" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  status === "FAILED" && "bg-destructive/15 text-destructive",
                  status === "IDLE" && "bg-muted text-muted-foreground"
                )}
              >
                {status === "IDLE" && "Sẵn sàng quét"}
                {status === "QUEUED" && "Đang xếp hàng..."}
                {status === "PROCESSING" && "Đang bóc tách OCR..."}
                {status === "COMPLETED" && "Đã điền tự động"}
                {status === "FAILED" && "Lỗi trích xuất"}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Thả ảnh mặt trước (.JPG, .PNG ≤ 5MB) để tự động điền Số CMND/CCCD, Họ tên, Ngày sinh và Địa chỉ qua WebSocket.
            </p>

            {/* Vùng hiển thị thanh tiến trình / trạng thái cố định chiều cao */}
            <div className="mt-2.5 h-6 flex flex-col justify-center">
              {isScanning ? (
                <div className="w-full space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(progress, 15)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                    <span>Đang trích xuất văn bản trên thẻ...</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              ) : status === "COMPLETED" ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Đã điền tự động vào biểu mẫu. Vui lòng kiểm tra lại thông tin trước khi lưu.</span>
                </p>
              ) : status === "FAILED" && error ? (
                <p
                  className="flex items-center gap-1.5 text-xs font-medium text-destructive truncate"
                  title={error}
                >
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span className="truncate">{error}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/80">
                  Kéo thả ảnh mặt trước CMND/CCCD vào đây hoặc nhấn để chọn tệp từ máy tính
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
