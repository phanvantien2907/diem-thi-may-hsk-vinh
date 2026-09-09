/**
 * LogoutDialog — Dialog xác nhận đăng xuất
 *
 * Flow (Option A):
 * 1. Mở AlertDialog khi trigger được kích hoạt
 * 2. Khi xác nhận: fetch("/logout") để server xóa HttpOnly cookies
 * 3. Hiển thị toast thành công
 * 4. Navigate ngay đến /dang-nhap
 */
"use client";
import * as React from "react";
import { useNavigate } from "react-router";
import { toast } from "~/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/dang-xuat", { method: "GET" });
    } catch {
      // Bỏ qua lỗi network — vẫn tiến hành đăng xuất client-side
    } finally {
      // Hiển thị toast thành công
      toast.add({
        type: "success",
        title: "Đã đăng xuất thành công",
        description: "Hẹn gặp lại bạn!",
      });
      navigate("/dang-nhap");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận đăng xuất ?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn đăng xuất khỏi hệ thống HSK Đại học Vinh?
            Bạn sẽ cần đăng nhập lại để tiếp tục.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {/* Nút Hủy */}
          <AlertDialogCancel className="rounded-full cursor-pointer">
            Hủy
          </AlertDialogCancel>

          {/* Nút Đăng xuất — variant destructive */}
          <AlertDialogAction
            variant="destructive"
            className="rounded-full cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              "Đang đăng xuất..."
            ) : (
              <>
                Đăng xuất
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
