# Vinh University HSK Computer-based Test Registration System — Project Rules

## Tổng quan dự án

Đây là hệ thống đăng ký thi máy HSK tại Trường Đại học Vinh.
Tên đầy đủ: **Vinh University HSK Computer-based Test Registration System**

---

## Tech Stack (BẮT BUỘC tuân thủ)

| Hạng mục        | Công nghệ                         |
| --------------- | --------------------------------- |
| Framework       | React Router v7 (Framework Mode)  |
| Language        | TypeScript (strict)               |
| Styling         | TailwindCSS v4                    |
| UI Components   | shadcn/ui (Base UI + Tailwind v4) |
| Template/Theme  | shadcn/ui default theme           |

> **QUAN TRỌNG**: Luôn đọc skill `react-router` trước khi thao tác với routing, loaders, actions, forms, fetchers. Dự án đang dùng **Framework Mode** (có `app/routes.ts`, `react-router.config.ts`, `@react-router/dev`).

---

## Design System Rules

### 1. Color System
- **Sử dụng 100% default color tokens của shadcn/ui** — KHÔNG tự định nghĩa màu mới.
- Biến CSS đã được shadcn/ui thiết lập: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, v.v.
- Không override màu trong component trừ khi có lý do cực kỳ đặc biệt và phải comment rõ lý do.

### 2. Button
- **Tất cả button phải bo tròn** — luôn dùng `rounded-full` hoặc biến thể `size="rounded"` của shadcn.
- **Tương tác (Interaction):** Bắt buộc phải có class `cursor-pointer` để hiển thị bàn tay khi di chuột vào (tránh trường hợp base UI không có sẵn). Phải có hiệu ứng hover mượt mà (vd: `hover:opacity-90` hoặc `hover:bg-primary/90`).
- Sử dụng `<Button>` từ shadcn/ui (`@/components/ui/button`).
- Ví dụ chuẩn:
  ```tsx
  <Button className="rounded-full cursor-pointer hover:bg-primary/90">Đăng ký</Button>
  ```

### 3. Dialog, Alert, Toast, Confirm
- Sử dụng **100% component mặc định của shadcn/ui**: `<Dialog>`, `<AlertDialog>`, `<Toast>`, `<Toaster>`.
- KHÔNG custom thêm style, class, hay animation vào các component này.
- Giữ nguyên border-radius mặc định của shadcn (đã bo tròn theo theme).
- **Quy chuẩn AlertDialog (Ví dụ: Đăng xuất, Xóa):** 
  - Phải dùng `<AlertDialog>` của shadcn để chặn tương tác nền.
  - Các nút hành động bên trong (`<AlertDialogCancel>`, `<AlertDialogAction>`) phải tuân thủ chuẩn Button: `rounded-full`, `cursor-pointer`, hover mượt.
  - Nút xác nhận hành động nguy hiểm (như Đăng xuất) phải dùng `variant="destructive"`.
- **Quy tắc chuyển trang sau hành động quan trọng (ví dụ: Đăng ký thành công):** 
  - PHẢI hiển thị Toast thông báo thành công.
  - PHẢI chờ một khoảng thời gian (delay 3 - 5 giây bằng `setTimeout`) trước khi dùng `navigate` (client-side) để chuyển trang, giúp người dùng kịp đọc thông báo. Không dùng `redirect` trực tiếp từ server action nếu cần hiển thị Toast.

### 4. Typography & Font
- Font chữ chính: **Be Vietnam Pro** (Google Fonts).
- Import trong `app/root.tsx` hoặc `app/styles/global.css`:
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  ```
- CSS:
  ```css
  :root {
    font-family: 'Be Vietnam Pro', sans-serif;
  }
  ```
- KHÔNG dùng font khác trừ khi thiết kế đặc biệt (ví dụ: font chữ Hán cho nội dung HSK).

### 5. Responsive Design (BẮT BUỘC cho mọi screen/component)
- **Hỗ trợ toàn diện từ cực nhỏ (320px) đến cực lớn (4K/Ultra-wide)**:
  - Mobile nhỏ: `320px` - `375px` (iPhone SE, Galaxy Fold gấp).
  - Mobile chuẩn: `390px` - `430px`.
  - Tablet: `768px` - `1024px` (`md:`, `lg:`).
  - Laptop / Desktop: `1280px` - `1440px` (`xl:`).
  - Màn hình cực lớn: `1920px+`, `2K`, `4K` (`2xl:`).
- **Chống tràn màn hình (Zero Horizontal Overflow)**:
  - Tuyệt đối không để xuất hiện thanh cuộn ngang toàn trang ngoài ý muốn.
  - Sử dụng `min-w-0`, `w-full`, `max-w-full`, `break-words` cho flex/grid items để text hoặc nội dung dài không đẩy vỡ khung.
  - Các bảng biểu dữ liệu (Data Table): luôn bọc trong container có `overflow-x-auto` cục bộ.
- **Không thừa / co giãn quá mức trên màn hình lớn**:
  - Luôn sử dụng container có giới hạn chiều rộng hợp lý (`container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl`) để giao diện không bị loãng, giãn cách vô lý trên màn hình lớn/cực lớn.
- **Không ghi đè, đè lớp (No Overlapping/Conflict)**:
  - Hạn chế lạm dụng `position: absolute` cố định tọa độ gây đè chữ khi thu nhỏ màn hình.
  - Quản lý z-index chuẩn mực, thanh điều hướng (Navbar/Sidebar) trên mobile phải chuyển sang Drawer/Sheet/Menu collapsible mượt mà, không che khuất tương tác chính.
- **Mobile-first Layout**:
  - Dùng `flex-col sm:flex-row`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
  - Tránh gán cứng chiều rộng pixel (e.g. `w-[500px]`), thay bằng `w-full max-w-lg`.

---

## Component Conventions

### Cấu trúc file
```
app/
├── components/
│   ├── ui/           # shadcn/ui components (auto-generated, KHÔNG tự sửa)
│   ├── layout/       # Header, Sidebar, Footer, layout wrappers
│   ├── shared/       # Các component dùng chung nhiều nơi
│   └── [feature]/    # Components theo feature (e.g., exam/, registration/)
├── routes/           # React Router route modules
├── lib/              # Utils, helpers, API clients
├── hooks/            # Custom React hooks
├── types/            # TypeScript types/interfaces
└── styles/           # Global CSS
```

### Naming Conventions
- Components: `PascalCase` — `ExamCard.tsx`, `RegistrationForm.tsx`
- Hooks: `camelCase` với prefix `use` — `useExamList.ts`
- Utils/helpers: `camelCase` — `formatDate.ts`
- Route files: theo convention React Router v7 — `app/routes/dashboard.tsx`
- Types: `PascalCase` với suffix rõ ràng — `ExamSession`, `StudentProfile`

### Import Aliases
- Luôn dùng `@/` alias (đã config trong `tsconfig.json`).
- Ví dụ: `import { Button } from "@/components/ui/button"`.

---

## React Router v7 — Framework Mode Rules

- **Loaders** dùng để fetch data phía server trước khi render route.
- **Actions** dùng để xử lý form submission (POST, PUT, DELETE).
- **Không dùng** `useEffect` + `fetch` để load data nếu có thể dùng loader.
- Type safety: dùng types từ `./+types/[route-name]` cho mỗi route module.
- Đọc skill `react-router` khi cần xử lý bất kỳ vấn đề nào liên quan đến routing.

---

## Coding Standards

- **TypeScript strict mode** — luôn khai báo type, không dùng `any`.
- Ưu tiên `async/await` hơn `.then()/.catch()`.
- Xử lý lỗi đầy đủ trong loaders và actions.
- Comment bằng **tiếng Việt** cho logic nghiệp vụ, tiếng Anh cho code thuần kỹ thuật.
- Dùng `pnpm` làm package manager (dự án đang dùng `pnpm-lock.yaml`).

---

## Nghiệp vụ chính (HSK Registration System)

Domain: Đăng ký thi máy HSK (汉语水平考试 - Chinese Proficiency Test)
- Học sinh đăng ký dự thi các cấp độ HSK (HSK 1-6) và HSKK.
- Hệ thống quản lý ca thi, phòng thi, và danh sách thí sinh.
- Có phân quyền: Admin, Giám thị, Thí sinh.
- Hiển thị điểm thi sau khi công bố kết quả.
