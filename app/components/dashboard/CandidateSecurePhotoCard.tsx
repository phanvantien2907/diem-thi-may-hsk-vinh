import * as React from "react";
import { EyeIcon, EyeOffIcon, Image as ImageIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export interface CandidateSecurePhotoCardProps {
  title: string;
  imageUrl?: string | null;
  alt: string;
  isRevealed: boolean;
  onToggleReveal: () => void;
  onPreview: (url: string) => void;
  emptyText?: string;
}

export function CandidateSecurePhotoCard({
  title,
  imageUrl,
  alt,
  isRevealed,
  onToggleReveal,
  onPreview,
  emptyText = "Chưa có ảnh",
}: CandidateSecurePhotoCardProps) {
  return (
    <div className="h-52 rounded-xl border bg-background p-2.5 flex flex-col justify-between select-none">
      {/* Header thẻ ảnh */}
      <div className="flex items-center justify-between pb-1.5">
        <span className="text-xs font-medium text-foreground">{title}</span>
        {imageUrl ? (
          <div className="flex items-center gap-1.5">
            {isRevealed ? (
              <>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-500/30"
                >
                  Đã mở
                </Badge>
                <button
                  type="button"
                  onClick={onToggleReveal}
                  className="size-5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                  title="Che mờ lại ảnh"
                >
                  <EyeOffIcon className="size-3" />
                </button>
              </>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
              >
                Đã che PII
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">Trống</span>
        )}
      </div>

      {/* Khung hiển thị ảnh với hiệu ứng mờ & lớp phủ tương tác */}
      <div className="w-full flex-1 rounded-lg overflow-hidden bg-muted/40 border flex items-center justify-center relative group p-1">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={alt}
              className={cn(
                "max-h-full max-w-full object-contain rounded transition-all duration-300",
                !isRevealed && "filter blur-md md:blur-lg scale-105 pointer-events-none"
              )}
            />

            {/* Lớp phủ Click-to-Reveal khi ảnh đang bị làm mờ */}
            {!isRevealed && (
              <button
                type="button"
                onClick={onToggleReveal}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 hover:bg-black/60 backdrop-blur-[2px] transition-all cursor-pointer p-2 text-center group/overlay"
              >
                <div className="size-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white mb-1.5 shadow-sm group-hover/overlay:scale-105 transition-transform">
                  <EyeOffIcon className="size-4" />
                </div>
                <span className="text-[11px] font-semibold text-white drop-shadow">
                  Bấm để xem ảnh
                </span>
                <span className="text-[9px] text-white/70 drop-shadow mt-0.5">
                  Bảo vệ PII • NĐ 13/2023
                </span>
              </button>
            )}

            {/* Lớp hover khi ảnh đã được mở (Phóng to / Ẩn lại) */}
            {isRevealed && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium">
                <button
                  type="button"
                  onClick={() => onPreview(imageUrl)}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <EyeIcon className="size-3.5" />
                  <span>Phóng to</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleReveal}
                  className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                  title="Che mờ lại ảnh"
                >
                  <EyeOffIcon className="size-3.5" />
                  <span>Ẩn</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-muted-foreground">
            <ImageIcon className="size-5 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground text-center">
              {emptyText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

