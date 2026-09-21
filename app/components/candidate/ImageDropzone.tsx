/**
 * ImageDropzone — Component upload ảnh kéo-thả / click
 *
 * Features:
 * - Click hoặc drag-and-drop
 * - Preview ảnh sau khi chọn
 * - Validate client-side: JPEG/PNG/WebP, max 5MB
 * - Trạng thái: idle / dragover / uploading / done
 */
import * as React from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { validateImageFile } from "~/lib/cloudinary";

interface ImageDropzoneProps {
  /** Label hiển thị phía trên */
  label: string;
  /** URL ảnh hiện tại (nếu đã upload) */
  value?: string;
  /** Callback khi user chọn file hợp lệ */
  onFileSelect: (file: File) => void;
  /** Callback khi user xóa ảnh */
  onClear: () => void;
  /** Đang upload */
  uploading?: boolean;
  /** Thông báo lỗi */
  error?: string;
  /** Tỉ lệ khung ảnh */
  aspectRatio?: "portrait" | "landscape";
  /** Disabled state */
  disabled?: boolean;
}

export function ImageDropzone({
  label,
  value,
  onFileSelect,
  onClear,
  uploading = false,
  error,
  aspectRatio = "landscape",
  disabled = false,
}: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const displayError = error || localError;

  function handleFile(file: File) {
    setLocalError(null);
    const validationError = validateImageFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  }

  const aspectClass =
    aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-video";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label}`}
        aria-disabled={disabled || uploading}
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          aspectClass,
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50",
          (disabled || uploading) && "pointer-events-none opacity-60",
          displayError && "border-destructive/50"
        )}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleChange}
          disabled={disabled || uploading}
          tabIndex={-1}
        />

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {/* Preview image */}
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Clear button */}
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground/90"
                aria-label={`Xóa ${label}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-xs">Chọn ảnh</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <p className="text-xs text-destructive">{displayError}</p>
      )}
    </div>
  );
}
