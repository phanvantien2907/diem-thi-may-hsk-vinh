---
name: hsk-design-system
description: >
  Design system conventions cho Vinh University HSK Registration System.
  Kích hoạt skill này khi cần: tạo component mới, hỏi về button style, dialog/modal/alert,
  color tokens, font, hoặc bất kỳ quyết định UI/UX nào trong dự án.
---

# HSK Design System — Vinh University

## Quick Reference Card

| Yếu tố        | Quy tắc                                      | Ví dụ / Note                                     |
| ------------- | -------------------------------------------- | ------------------------------------------------ |
| **Font**      | Be Vietnam Pro (Google Fonts)                | weight: 300, 400, 500, 600, 700                  |
| **Colors**    | shadcn/ui default tokens ONLY                | `--primary`, `--background`, `--muted`, v.v.     |
| **Button**    | `rounded-full` bắt buộc                      | `<Button className="rounded-full">`              |
| **Dialog**    | shadcn AlertDialog/Dialog, không custom      | Giữ nguyên default style                         |
| **Toast**     | shadcn Sonner/Toast, không custom            | Giữ nguyên default style                         |
| **Template**  | shadcn/ui default theme                      | Không override theme global                      |
| **Responsive**| Cực nhỏ (320px) -> Cực lớn (4K)              | Không tràn màn hình, không đè vỡ layout           |

---

## 1. Font Setup

Thêm vào `app/root.tsx` trong `<Links>` hoặc `<head>`:

```tsx
// app/root.tsx
export function links() {
  return [
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "anonymous",
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
    },
  ];
}
```

Trong `app/app.css` hoặc global CSS:

```css
:root {
  font-family: 'Be Vietnam Pro', sans-serif;
}

body {
  font-family: 'Be Vietnam Pro', sans-serif;
}
```

---

## 2. Color System

**KHÔNG tự định nghĩa màu.** Dùng 100% CSS variables của shadcn/ui:

```tsx
// ✅ Đúng — dùng token shadcn
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground" />
<div className="bg-muted text-muted-foreground" />
<div className="bg-destructive text-destructive-foreground" />

// ❌ Sai — tự định nghĩa màu
<div className="bg-red-500" />
<div style={{ color: '#1a2b3c' }} />
```

Danh sách token chuẩn của shadcn/ui:
- `--background` / `--foreground`
- `--card` / `--card-foreground`
- `--popover` / `--popover-foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--destructive` / `--destructive-foreground`
- `--border`, `--input`, `--ring`

---

## 3. Button — rounded-full bắt buộc

Tất cả button trong dự án phải dùng `rounded-full`:

```tsx
import { Button } from "@/components/ui/button"

// ✅ Chuẩn
<Button className="rounded-full">Đăng ký thi</Button>
<Button variant="outline" className="rounded-full">Hủy</Button>
<Button variant="destructive" className="rounded-full">Xóa</Button>
<Button variant="ghost" size="sm" className="rounded-full">Chi tiết</Button>

// ❌ Sai — không bo tròn
<Button>Đăng ký thi</Button>
```

> **Tip**: Có thể patch `button.tsx` của shadcn để thêm `rounded-full` vào `base` class một lần duy nhất thay vì thêm vào từng nơi.

---

## 4. Dialog đăng xuất / Thông báo xác nhận

Dùng `AlertDialog` của shadcn — KHÔNG tự viết modal, KHÔNG thêm class custom:

```tsx
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
} from "@/components/ui/alert-dialog"

// Dialog đăng xuất chuẩn
export function LogoutDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="rounded-full">
          Đăng xuất
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận đăng xuất</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction>Đăng xuất</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 5. Dialog thông thường (Info/Form)

Dùng `Dialog` của shadcn — KHÔNG thêm style custom:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ExamDetailDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">Xem chi tiết</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thông tin ca thi</DialogTitle>
          <DialogDescription>Chi tiết ca thi HSK cấp độ 4</DialogDescription>
        </DialogHeader>
        {/* Nội dung */}
        <DialogFooter>
          <Button className="rounded-full">Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 6. Toast / Thông báo

Dùng Sonner (shadcn/ui tích hợp sẵn) — KHÔNG custom:

```tsx
import { toast } from "sonner"

// Thông báo thành công
toast.success("Đăng ký thi thành công!")

// Thông báo lỗi
toast.error("Có lỗi xảy ra, vui lòng thử lại.")

// Thông báo thông tin
toast.info("Ca thi sẽ bắt đầu vào lúc 8:00 AM.")
```

---

## 7. Responsive Design System (Cực nhỏ 320px -> Cực lớn 4K)

Mọi màn hình và component khi code phải đảm bảo hiển thị hoàn hảo trên mọi kích thước màn hình.

### Nguyên tắc cốt lõi:
1. **Không tràn màn hình (Zero Horizontal Scroll)**:
   - Thân trang (`body` / layout wrapper chính) không bao giờ bị cuộn ngang.
   - Luôn dùng `min-w-0` trên flex items và grid children để text dài không làm bung layout.
   - Text dài dùng `break-words` hoặc `truncate`.
   - Bảng dữ liệu (Table) hoặc biểu đồ lớn phải bọc trong container `overflow-x-auto w-full`.

2. **Không thừa / co giãn quá mức trên màn hình cực lớn (2K, 4K)**:
   - Dùng container bọc với `max-w-7xl` hoặc `max-w-screen-2xl` kết hợp `mx-auto`:
     ```tsx
     <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       {/* Nội dung trang */}
     </div>
     ```

3. **Không ghi đè, che lấp tương tác (No Overlaps & Unwanted Overrides)**:
   - Tránh dùng `absolute` để định vị layout tổng thể; chỉ dùng `absolute` cho badges, icons phụ trợ.
   - Khi ở mobile, Sidebar hoặc menu điều hướng phải ẩn vào `Sheet` (Drawer mobile) thay vì chiếm chỗ hoặc đè lên nội dung.

4. **Mobile-First Breakpoint Matrix**:

```tsx
// Grid mẫu tự co giãn chuẩn:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
  {/* Cards */}
</div>

// Form / Search bar responsive:
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
  <input className="w-full sm:flex-1" />
  <Button className="rounded-full w-full sm:w-auto">Tìm kiếm</Button>
</div>
```

---

## 8. Checklist khi tạo Component / Screen mới

- [ ] Import từ `@/components/ui/...` (shadcn)
- [ ] Button có `className="rounded-full"`
- [ ] KHÔNG dùng màu hardcode — dùng token shadcn
- [ ] Font Be Vietnam Pro được kế thừa từ global CSS (không cần set lại)
- [ ] Dialog/Alert dùng shadcn, KHÔNG custom style
- [ ] **Responsive đầy đủ**: Đã test hiển thị từ mobile nhỏ (320px - 375px) đến 2K/4K
- [ ] **Không tràn ngang**: Không xuất hiện thanh cuộn ngang toàn trang (không vỡ màn hình)
- [ ] **Không đè chữ / overlap**: Không bị vỡ chữ, đè icon hay che khuất nút bấm khi co nhỏ
- [ ] TypeScript type đầy đủ — không dùng `any`
- [ ] Comment tiếng Việt cho logic nghiệp vụ
