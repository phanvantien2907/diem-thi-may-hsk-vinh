/**
 * AppCommandMenu — Hộp thoại tìm kiếm và điều hướng nhanh (Command Palette)
 *
 * Hỗ trợ phím tắt:
 * - macOS: Command + K (⌘K)
 * - Windows / Linux: Ctrl + K
 *
 * Cho phép tìm kiếm và chuyển trang nhanh chóng, tra cứu cấp độ HSK,
 * và thực hiện các hành động trực tiếp.
 */
import * as React from "react";
import { useNavigate } from "react-router";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "~/components/ui/command";
import {
  UserCircleIcon,
  BookOpenCheckIcon,
  SearchIcon,
  PackageIcon,
  UserIcon,
  GraduationCapIcon,
  CreditCardIcon,
  FileTextIcon,
  ReceiptTextIcon,
  LogOutIcon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react";

interface AppCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => void;
}

export function AppCommandMenu({
  open,
  onOpenChange,
  onLogout,
}: AppCommandMenuProps) {
  const navigate = useNavigate();

  // Nhận diện hệ điều hành (macOS vs Windows / Linux)
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent || navigator.platform || "";
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(userAgent));
    }
  }, []);

  // Lắng nghe tổ hợp phím Command+K (macOS) hoặc Ctrl+K (Windows/Linux)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tìm kiếm lệnh và trang"
      description="Tìm kiếm nhanh trang, cấp độ thi HSK hoặc hành động"
    >
      <CommandInput placeholder="Tìm kiếm trang, ca thi HSK, hành động..." />

      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

        {/* ── Nhóm: Trang chính hệ thống ── */}
        <CommandGroup heading="Trang hệ thống">
          <CommandItem
            value="Thông tin thí sinh thong tin thi sinh ho so profile cccd"
            onSelect={() => handleSelect(() => navigate("/thong-tin-thi-sinh"))}
          >
            <UserCircleIcon className="size-4 text-primary" />
            <span>Thông tin thí sinh</span>
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Đăng ký thi máy HSK dang ky thi may ca thi slot phong thi"
            onSelect={() => handleSelect(() => navigate("/dang-ky-thi"))}
          >
            <BookOpenCheckIcon className="size-4 text-primary" />
            <span>Đăng ký thi máy HSK</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Tra cứu kết quả thi tra cuu ket qua diem thi certificate"
            onSelect={() => handleSelect(() => navigate("/ket-qua-thi"))}
          >
            <SearchIcon className="size-4 text-primary" />
            <span>Tra cứu kết quả thi</span>
            <CommandShortcut>G K</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Vận chuyển chứng chỉ van chuyen chung chi giao hang ship address"
            onSelect={() => handleSelect(() => navigate("/van-chuyen-chung-chi"))}
          >
            <PackageIcon className="size-4 text-primary" />
            <span>Vận chuyển chứng chỉ</span>
            <CommandShortcut>G V</CommandShortcut>
          </CommandItem>

          <CommandItem
            value="Tài khoản & Hồ sơ của tôi tai khoan ho so user account"
            onSelect={() => handleSelect(() => navigate("/tai-khoan-cua-toi"))}
          >
            <UserIcon className="size-4 text-primary" />
            <span>Tài khoản & Hồ sơ của tôi</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── Nhóm: Ca thi & Cấp độ HSK ── */}
        <CommandGroup heading="Cấp độ thi HSK">
          {[
            { label: "HSK Cấp độ 3", level: "3", keywords: "hsk 3 hsk3 cap 3 trung cap" },
            { label: "HSK Cấp độ 4", level: "4", keywords: "hsk 4 hsk4 cap 4 trung cap" },
            { label: "HSK Cấp độ 5", level: "5", keywords: "hsk 5 hsk5 cap 5 cao cap" },
            { label: "HSK Cấp độ 6", level: "6", keywords: "hsk 6 hsk6 cap 6 cao cap" },
          ].map((item) => (
            <CommandItem
              key={item.label}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => handleSelect(() => navigate(`/dang-ky-thi?level=${item.level}`))}
            >
              <GraduationCapIcon className="size-4 text-amber-500" />
              <span>Đăng ký {item.label}</span>
              <SparklesIcon className="size-3.5 text-muted-foreground ml-auto opacity-40" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* ── Nhóm: Thao tác & Tiện ích ── */}
        <CommandGroup heading="Thao tác & Tiện ích">
          <CommandItem
            value="Xem chi tiết thanh toán payment receipt transaction invoice"
            onSelect={() => handleSelect(() => navigate("/dang-ky-thi"))}
          >
            <ReceiptTextIcon className="size-4 text-emerald-500" />
            <span>Xem chi tiết thanh toán</span>
          </CommandItem>

          <CommandItem
            value="Thanh toán lệ phí thi thanh toan le phi payment payos"
            onSelect={() => handleSelect(() => navigate("/payment"))}
          >
            <CreditCardIcon className="size-4 text-blue-500" />
            <span>Thanh toán lệ phí thi</span>
          </CommandItem>

          {onLogout && (
            <CommandItem
              value="Đăng xuất khỏi hệ thống dang xuat logout exit"
              onSelect={() => handleSelect(onLogout)}
              className="text-destructive data-selected:bg-destructive/10 data-selected:text-destructive"
            >
              <LogOutIcon className="size-4" />
              <span>Đăng xuất tài khoản</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>

      {/* ── Footer: Hướng dẫn phím tắt ── */}
      <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
              ↑
            </kbd>
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
              ↓
            </kbd>
            <span>Di chuyển</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
              ↵
            </kbd>
            <span>Chọn</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
              ESC
            </kbd>
            <span>Đóng</span>
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 font-medium">
          <span>Phím tắt:</span>
          <kbd className="rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs">
            {isMac ? "⌘ K" : "Ctrl + K"}
          </kbd>
        </div>
      </div>
    </CommandDialog>
  );
}
