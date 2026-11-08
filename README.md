# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

## ⚡️ Guest-First OCR Registration Flow (CMND 9 số & CCCD 12 số)

Hệ thống hỗ trợ luồng **Guest-First OCR Registration** cho phép thí sinh chưa đăng nhập (Guest) truy cập trực tiếp vào trang **Thông tin thí sinh** (`/thong-tin-thi-sinh`) hoặc **Đăng ký tài khoản** (`/dang-ky`), tải ảnh mặt trước CMND (9 chữ số) / CCCD (12 chữ số) để tự động bóc tách dữ liệu qua WebSocket và tạo tài khoản + hồ sơ thí sinh đồng thời trong một bước duy nhất.

### 1. Kiến trúc luồng xử lý (End-to-End Workflow)
1. **Guest Access (Không chặn xác thực trước):**
   - `getOptionalAuth(request)` trong `app/lib/auth.server.ts` cho phép người dùng chưa có cookie JWT truy cập trực tiếp `/thong-tin-thi-sinh` (với trạng thái `isGuest = true`) hoặc `/dang-ky` mà không bị chuyển hướng cưỡng bức về `/dang-nhap`.
2. **Primary Call-To-Action (`IdUploadDropzone`):**
   - Khung **Quét tự động CMND / CCCD** (`app/components/IdUploadDropzone.tsx`) được đặt ở vị trí đầu tiên trên trang `/thong-tin-thi-sinh` và `/dang-ky`, luôn mở khóa cho cả Guest (`token = null`) và người dùng đã đăng nhập.
3. **Real-Time WebSocket OCR (`useOCRScanner`):**
   - Hook `useOCRScanner` (`app/hooks/useOCRScanner.ts`) sử dụng `useSyncExternalStore` (`OCRScannerStore`) để cập nhật tiến trình quét (`UPLOADING` → `QUEUED` → `PROCESSING` → `COMPLETED`) trong `< 50ms` mà không gây re-render toàn trang.
   - Tải ảnh qua `POST /api/v1/cccd/upload` (nhận `202 Accepted` kèm `task_id`) và lắng nghe sự kiện `ocr_completed` qua WebSocket `/api/v1/ws`.
   - Khi nhận `ocr_completed`, dữ liệu (`id_number` 9 hoặc 12 chữ số, `full_name`, `dob`, `address`) được tự động điền trực tiếp vào các ô input qua `React Hook Form` `setValue(...)`.
4. **Unified Account & Profile Creation ("Tạo hồ sơ & Tài khoản"):**
   - Khi Guest nhấn **"Tạo hồ sơ & Tài khoản"** trên `/thong-tin-thi-sinh`, hệ thống thực thi chuỗi tuần tự:
     1. `POST /api/v1/auth/register` (tạo tài khoản với `full_name`, `cccd` 9/12 số, `phone`, `email`, `password`).
     2. `POST /api/v1/auth/login` (lấy `access_token` phiên làm việc).
     3. `POST /api/v1/me/candidate-profile` (lưu ngay hồ sơ thí sinh với thông tin đã quét OCR).

### 2. Kiểm thử (Testing với `pnpm`)
```bash
pnpm test
```

---

Built with ❤️ using React Router.
