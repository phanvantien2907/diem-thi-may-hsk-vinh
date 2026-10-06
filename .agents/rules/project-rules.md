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
| Package Manager | **pnpm** (BẮT BUỘC - TUYỆT ĐỐI KHÔNG DÙNG npm/yarn/bun) |

> **QUY TẮC PACKAGE MANAGER**: Dự án **BẮT BUỘC** sử dụng `pnpm` (dùng `pnpm-lock.yaml`). **TUYỆT ĐỐI CẤM** sử dụng `npm`, `yarn`, `bun` hoặc bất kỳ package manager nào khác trong mọi tình huống (cài đặt, chạy script, shadcn dlx,...). Khi chạy lệnh shadcn phải dùng `pnpm dlx shadcn@latest`.
>
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

### 6. Quy chuẩn Định dạng Thời gian (Date & Time Formatting — BẮT BUỘC)
- **Định dạng chuẩn bắt buộc**: `dd/MM/yyyy HH:mm:ss` (ví dụ: `03/10/2026 09:02:02`).
- **Nguyên tắc**: Luôn hiển thị Ngày (2 số) / Tháng (2 số) / Năm (4 số) trước, Giờ:Phút:Giây (2 số mỗi phần tử) sau.
- **TUYỆT ĐỐI KHÔNG**:
  - Không đảo ngược thành `HH:mm:ss dd/MM/yyyy` hay `HH:mm:ss DD/MM/YYYY`.
  - Không dùng định dạng chuẩn Mỹ `MM/dd/yyyy`.
  - Không bỏ padding số 0 (ví dụ viết `3/10/2026 9:2:2` là SAI, bắt buộc phải là `03/10/2026 09:02:02`).
- Trường hợp rút gọn không có giây: dùng `dd/MM/yyyy HH:mm` (vẫn luôn tuân thủ ngày/tháng/năm trước, giờ:phút sau).

### 7. Phân trang & Danh sách dữ liệu (Pagination — BẮT BUỘC)
- **Modal / Dialog lịch sử thao tác**: Mặc định phân trang **10 bản ghi / trang** (`pageSize = 10`), có thanh phân trang hiển thị số trang và các nút điều hướng Trước/Sau.
- **Tương tác**: Reset trang về trang 1 khi người dùng thực hiện tìm kiếm hoặc chuyển đổi tab danh mục lọc.
- **Component**: Sử dụng component `<Pagination>` chuẩn của shadcn/ui (`@/components/ui/pagination`), các nút bấm tròn `rounded-full` kèm `cursor-pointer`, vô hiệu hóa (`disabled`) khi ở trang đầu hoặc trang cuối.

### 8. Quy chuẩn Tiêu đề Trang trong Meta Data (Page Title & Meta Rules — BẮT BUỘC)
- **Nguyên tắc cốt lõi**: Tiêu đề trang (`title` trong hàm `meta` của route) phải **ngắn gọn, trực diện, đúng trọng tâm nội dung trang**.
- **TUYỆT ĐỐI KHÔNG**:
  - Không thêm tiền tố như `Quản lý...` (ví dụ: KHÔNG dùng `Quản lý ca thi`, `Quản lý kỳ thi`, `Quản lý hồ sơ`, `Quản lý giao dịch`).
  - Không thêm hậu tố dài dòng như `- cổng quản trị`, `— Cổng Quản Trị`, `— Vinh University HSK`, v.v.
- **Quy cách chuẩn**:
  - Chỉ ghi ngắn gọn tên đối tượng / tính năng chính.
  - Ví dụ chuẩn: `{ title: "Kỳ thi & Ca Thi" }`, `{ title: "Hồ sơ Đăng ký" }`, `{ title: "Giao dịch & Thanh toán" }`, `{ title: "Bảng điều khiển" }`.
  - Nghiêm cấm: `{ title: "Quản lý ca thi - cổng quản trị" }`, `{ title: "Quản lý Hồ sơ Đăng ký — Cổng Quản Trị" }`, `{ title: "Quản lý Giao dịch & Thanh toán" }`.

---

## Component Conventions

### Cấu trúc file
```
app/
├── components/
│   ├── ui/           # shadcn/ui components (auto-generated, KHÔNG tự sửa)
│   ├── layout/       # Header, Sidebar, Footer, layout wrappers (AdminSidebar, AppSidebar,...)
│   ├── shared/       # Các component dùng chung nhiều nơi
│   ├── candidate/    # Components hồ sơ thí sinh (ProfileForm, DocumentForm,...)
│   ├── registration/ # Components đăng ký thi (ExamSessionSelector, RegistrationHistory,...)
│   ├── dashboard/    # Components dashboard quản trị (biểu đồ, bảng ngoại lệ giao dịch,...)
│   └── [feature]/    # Components theo feature khác
├── routes/           # React Router route modules
│   ├── (auth)/       # Routes xác thực công khai (dang-nhap, dang-ky,...)
│   ├── admin/        # [BẮT BUỘC] TẤT CẢ routes & layout quản trị viên (layout.tsx, trang-quan-tri.tsx,...)
│   └── _app.*        # Routes thí sinh thuộc layout _app.tsx (dang-ky-thi, thong-tin-thi-sinh,...)
├── lib/              # Utils, helpers, API clients, schemas
├── hooks/            # Custom React hooks
├── types/            # TypeScript types/interfaces (auth.ts, exam.ts, candidate.ts, admin.ts)
└── styles/           # Global CSS
```

### Naming Conventions
- Components: `PascalCase` — `ExamCard.tsx`, `RegistrationForm.tsx`, `AdminSidebar.tsx`
- Hooks: `camelCase` với prefix `use` — `useExamList.ts`
- Utils/helpers: `camelCase` — `formatDate.ts`
- Route files: theo convention React Router v7 — `app/routes/admin/trang-quan-tri.tsx`, `app/routes/_app.dang-ky-thi.tsx`
- Types: `PascalCase` với suffix rõ ràng — `ExamSession`, `StudentProfile`, `AdminMetric`

---

## Quy tắc Phân chia Router & File: Admin vs Thí sinh (BẮT BUỘC)

### 1. Phân chia Route Modules
- **Với Admin (Quản trị viên):**
  - **TẤT CẢ** các route dành cho quản trị viên **BẮT BUỘC PHẢI NẰM TRONG THƯ MỤC `app/routes/admin/`**.
  - **TUYỆT ĐỐI KHÔNG** tạo file `_admin.*.tsx` ở root `app/routes/` nữa.
  - Layout chung của trang quản trị: `app/routes/admin/layout.tsx`.
  - Các route con: `app/routes/admin/trang-quan-tri.tsx`, `app/routes/admin/quan-ly-ky-thi-ca-thi.tsx`, `app/routes/admin/quan-ly-ho-so-dang-ky.tsx`, `app/routes/admin/quan-ly-giao-dich-thanh-toan.tsx`,...
  - Khai báo trong `app/routes.ts`:
    ```ts
    layout("routes/admin/layout.tsx", [
      route("trang-quan-tri", "routes/admin/trang-quan-tri.tsx"),
      route("quan-ly-ky-thi-ca-thi", "routes/admin/quan-ly-ky-thi-ca-thi.tsx"),
      route("quan-ly-ho-so-dang-ky", "routes/admin/quan-ly-ho-so-dang-ky.tsx"),
      route("quan-ly-giao-dich-thanh-toan", "routes/admin/quan-ly-giao-dich-thanh-toan.tsx"),
    ])
    ```
  - Type imports trong các route admin: luôn import từ `./+types/<route-filename>` (ví dụ: `import type { Route } from "./+types/trang-quan-tri"`).

- **Với Thí sinh (Candidate / User thông thường):**
  - Các route đăng ký, tra cứu, xem hồ sơ của thí sinh nằm trực tiếp dưới `app/routes/` với tiền tố `_app.` (thuộc layout `app/routes/_app.tsx`).
  - Ví dụ: `_app.thong-tin-thi-sinh.tsx`, `_app.dang-ky-thi.tsx`, `_app.ket-qua-thi.tsx`, `_app.van-chuyen-chung-chi.tsx`.
  - Routes xác thực (Auth): nằm trong thư mục `app/routes/(auth)/` (ví dụ: `(auth)/dang-nhap.tsx`, `(auth)/dang-ky.tsx`).

### 2. Phân chia Components & Types
- **Admin components**:
  - Đặt trong `app/components/dashboard/` hoặc các file chuyên trách quản trị tại `app/components/layout/` có tiền tố `Admin*` (ví dụ: `AdminSidebar.tsx`, `AdminAuditLogDialog.tsx`, `ExceptionTransactionsTable.tsx`).
  - Types dữ liệu quản trị: đặt tại `app/types/admin.ts`.
- **Thí sinh components**:
  - Đặt trong `app/components/candidate/`, `app/components/registration/`, `app/components/exam/`.
  - Sidebar thí sinh: `app/components/layout/AppSidebar.tsx`.

### 3. Nguyên tắc Góc nhìn Thí sinh cho Admin (Admin Preview Mode)
- Khi tài khoản có role `admin` chuyển sang góc nhìn thí sinh (các route `_app.*`):
  - **Bắt buộc hoạt động ở chế độ Preview (Chỉ đọc / Read-only)**.
  - Layout `_app.tsx` hiển thị banner cảnh báo Admin Preview với nút quay lại Trang quản trị.
  - Vô hiệu hóa (`disabled`) toàn bộ thao tác nộp đơn đăng ký ca thi, gọi cổng thanh toán PayOS, tạo đơn vận chuyển hoặc chỉnh sửa/lưu thông tin thí sinh để tránh làm sai lệch dữ liệu thực của hệ thống.

### Import Aliases
- Luôn dùng `@/` alias (đã config trong `tsconfig.json`).
- Ví dụ: `import { Button } from "@/components/ui/button"`.

---

## React Router v7 — Framework Mode Rules

- **Loaders** dùng để fetch data phía server trước khi render route.
- **Actions** dùng để xử lý form submission (POST, PUT, DELETE).
- **Không dùng** `useEffect` + `fetch` để load data nếu có thể dùng loader.
- **Meta function**: Tiêu đề trang (`title`) phải tuân thủ chuẩn ngắn gọn, trực diện (xem mục 8 trong Design System Rules), không kèm tiền tố "Quản lý" hay hậu tố rườm rà.
- Type safety: dùng types từ `./+types/[route-name]` cho mỗi route module.
- Đọc skill `react-router` khi cần xử lý bất kỳ vấn đề nào liên quan đến routing.

---

## Coding Standards

- **Package Manager**: **BẮT BUỘC sử dụng `pnpm`**. TUYỆT ĐỐI KHÔNG được sử dụng `npm`, `yarn`, `bun` hay bất kỳ package manager nào khác trong toàn bộ dự án.
- **TypeScript strict mode** — luôn khai báo type, không dùng `any`.
- Ưu tiên `async/await` hơn `.then()/.catch()`.
- Xử lý lỗi đầy đủ trong loaders và actions.
- Comment bằng **tiếng Việt** cho logic nghiệp vụ, tiếng Anh cho code thuần kỹ thuật.

---

## Forms & Validation

- **BẮT BUỘC** sử dụng `react-hook-form` kết hợp với `@hookform/resolvers/zod` cho tất cả các form trong dự án (ví dụ: đăng nhập, đăng ký, cập nhật hồ sơ, đổi mật khẩu,...).
- TUYỆT ĐỐI KHÔNG dùng `React.useState` để tự quản lý state của từng field trong form.
- Tham khảo cách triển khai chuẩn trong các file như `app/routes/_app.tai-khoan-cua-toi.tsx` hoặc `app/routes/(auth)/dang-nhap.tsx`.
- Schema validation phải được định nghĩa bằng Zod và đặt tại `app/lib/schemas/`.

---

## Nghiệp vụ chính (HSK Registration System)

Domain: Đăng ký thi máy HSK (汉语水平考试 - Chinese Proficiency Test)
- Học sinh đăng ký dự thi các cấp độ HSK (HSK 1-6) và HSKK.
- Hệ thống quản lý ca thi, phòng thi, và danh sách thí sinh.
- Có phân quyền: Admin, Giám thị, Thí sinh.
- Hiển thị điểm thi sau khi công bố kết quả.
