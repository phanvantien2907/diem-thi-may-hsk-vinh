---
description: Hướng dẫn áp dụng pattern Streaming Data & Suspense (React Router v7 + React 19) để chống API waterfall và tối ưu UX.
---

# React Router v7 & React 19 Data Streaming Pattern

Khi xây dựng các trang yêu cầu tải dữ liệu từ API trong project (đặc biệt là các Form có dữ liệu phụ thuộc như Tỉnh/Thành), **BẮT BUỘC** ưu tiên áp dụng pattern **Streaming with Suspense** để ngăn chặn tình trạng thắt cổ chai (client-side waterfall) và tối ưu tốc độ load.

## Nguyên tắc cốt lõi

1. **Đưa toàn bộ Data Fetching lên Loader:**
   Tuyệt đối **không** dùng `useEffect` để fetch data ban đầu lúc mount (ví dụ: lấy danh sách select options, categories, locations). Toàn bộ API calls phải đưa vào `loader` của Route.

2. **Gọi API song song (Concurrent Fetching):**
   Nếu các API không phụ thuộc nhau, hãy gọi chúng đồng thời thay vì dùng `await` tuần tự.

3. **Trả về Promise (Streaming):**
   Trong `loader`, trả thẳng biến `Promise` của API call xuống `loaderData` thay vì `await`. Việc này giúp React Router gửi ngay giao diện (HTML) xuống trình duyệt trong khi dữ liệu vẫn đang tiếp tục được tải ngầm (Streaming).

4. **Sử dụng `React.use()` và `<Suspense>`:**
   - Tại component cha (Page Component): Bọc phần thân trang bằng `<React.Suspense fallback={<PageSkeleton />}>`.
   - Tạo một Wrapper Component con để nhận các Promise.
   - Tại Wrapper Component: Dùng `React.use(promise)` (React 19) để giải nén dữ liệu. Nếu dữ liệu chưa tải xong, component sẽ tự động Suspend và hiển thị Skeleton.

5. **Chống Re-render bằng `React.memo()`:**
   Bọc các Form hoặc UI Component nặng (như Dropzone, Table) bằng `React.memo()` để tránh chúng bị re-render không cần thiết khi người dùng tương tác với các component khác (như gõ chữ).

## Cấu trúc Code mẫu (Boilerplate)

```tsx
import * as React from "react";
import type { Route } from "./+types/my-route";

// 1. Loader (Server-side Streaming)
export async function loader({ request }: Route.LoaderArgs) {
  // Await các thông tin chặn quyền truy cập (Auth)
  const { token } = await requireAuth(request);
  
  // KHÔNG AWAIT: Trả thẳng Promise để stream dữ liệu
  const profilePromise = fetch('/api/profile').then(res => res.json());
  
  // Nếu API 2 phụ thuộc API 1, dùng .then() để chain promise
  const settingsPromise = profilePromise.then(profile => 
    fetch(`/api/settings/${profile.id}`).then(res => res.json())
  );

  return { profilePromise, settingsPromise };
}

// 2. Page Component (Suspense Boundary)
export default function MyPage({ loaderData }: Route.ComponentProps) {
  const { profilePromise, settingsPromise } = loaderData;

  return (
    <div className="page-container">
      {/* Khung sườn tĩnh hiện ngay lập tức */}
      <h1>Thông tin cá nhân</h1>
      
      {/* Suspense bắt tín hiệu từ React.use() bên trong */}
      <React.Suspense fallback={<PageSkeleton />}>
        <DataWrapper 
          profilePromise={profilePromise} 
          settingsPromise={settingsPromise} 
        />
      </React.Suspense>
    </div>
  );
}

// 3. Wrapper Component (Unwrap Promises)
function DataWrapper({ profilePromise, settingsPromise }) {
  // React 19: React.use() sẽ suspend component cho đến khi promise resolve
  const profile = React.use(profilePromise);
  const settings = React.use(settingsPromise);

  // Từ dòng này trở đi, profile và settings đã có data hoàn chỉnh
  return <HeavyForm profile={profile} settings={settings} />;
}

// 4. Component hiển thị / Form (Memoized)
export const HeavyForm = React.memo(function HeavyForm({ profile, settings }) {
  // Logic xử lý form, hooks, events...
  return (
    <form>
      <input defaultValue={profile.name} />
    </form>
  );
});

// 5. Loading Skeleton
function PageSkeleton() {
  return <div className="animate-pulse bg-gray-200 h-96 w-full rounded-md" />;
}
```
