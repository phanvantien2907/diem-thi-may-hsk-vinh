# 📘 API Documentation — HSK Vinh University Registration System

> **Base URL:** `http://<host>:<port>/api/v1`
> **Content-Type:** `application/json`
> **Ngôn ngữ lỗi:** Tiếng Việt (tất cả thông báo lỗi trả về bằng Tiếng Việt)
> **Phiên bản:** v1.1.0
> **Cập nhật lần cuối:** 2026-10-04

---

## Mục Lục

- [1. Quy ước chung](#1-quy-ước-chung)
- [2. Module Auth (Xác thực)](#2-module-auth-xác-thực)
- [3. Module Candidate (Hồ sơ thí sinh)](#3-module-candidate-hồ-sơ-thí-sinh)
- [4. Module Exam (Kỳ thi)](#4-module-exam-kỳ-thi)
- [5. Module Registration (Đăng ký thi)](#5-module-registration-đăng-ký-thi)
- [6. Module Payment (Thanh toán)](#6-module-payment-thanh-toán)
- [7. Module Result (Kết quả thi)](#7-module-result-kết-quả-thi)
- [8. Module Certificate (Chứng chỉ)](#8-module-certificate-chứng-chỉ)
- [9. Module Notification (Thông báo)](#9-module-notification-thông-báo)
- [10. Module Location (Địa điểm)](#10-module-location-địa-điểm)
- [11. Module Audit (Nhật ký hệ thống)](#11-module-audit-nhật-ký-hệ-thống)
- [12. Bảng Enum tham chiếu](#12-bảng-enum-tham-chiếu)
- [13. State Machines (Luồng trạng thái)](#13-state-machines-luồng-trạng-thái)
- [14. WebSocket Real-time Events](#14-websocket-real-time-events)
- [15. Module Dashboard (Bảng điều khiển quản trị)](#15-module-dashboard-bảng-điều-khiển-quản-trị)

---

## 1. Quy ước chung

### 1.1. Response Envelope (Bao bọc phản hồi)

**Tất cả** các endpoint đều tuân theo cùng một cấu trúc response.

#### ✅ Thành công (HTTP 2xx)

```json
{
  "success": true,
  "data": <payload>,
  "error": null,
  "meta": null
}
```

Với **phân trang** (pagination):

```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

#### ❌ Lỗi (HTTP 4xx, 5xx)

```json
{
  "statusCode": 400,
  "timestamp": "2026-09-07T10:30:00+07:00",
  "path": "/api/v1/auth/register",
  "msg": "Dữ liệu yêu cầu không hợp lệ"
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `statusCode` | `integer` | HTTP status code |
| `timestamp` | `string` | Thời điểm lỗi, format ISO 8601 (`YYYY-MM-DDTHH:mm:ss+07:00`) |
| `path` | `string` | Đường dẫn API đã gọi |
| `msg` | `string` | Thông báo lỗi (bằng Tiếng Việt) |

### 1.2. Xác thực (Authentication)

- **Cơ chế:** JWT (JSON Web Token), HMAC-SHA256
- **Access Token TTL:** 24 giờ
- **Refresh Token TTL:** 168 giờ (7 ngày)
- **Header:** `Authorization: Bearer <access_token>`

**Token Claims:**

| Claim | Kiểu | Mô tả |
|---|---|---|
| `sub` | `int64` | Account ID |
| `user_id` | `int64` | Account ID |
| `user_role` | `string` | Role code (`admin`, `candidate`) |
| `exp` | `int64` | Thời điểm hết hạn (Unix timestamp) |
| `iat` | `int64` | Thời điểm phát hành (Unix timestamp) |

### 1.3. Các loại xác thực route

| Ký hiệu | Mô tả | Header cần gửi |
|---|---|---|
| 🔓 Public | Không cần token | Không |
| 🔐 JWT | Cần Access Token | `Authorization: Bearer <token>` |
| 🔐 JWT + Admin | Cần Access Token + role = `admin` | `Authorization: Bearer <token>` |

### 1.4. Quy ước chung về dữ liệu

| Quy ước | Mô tả | Ví dụ |
|---|---|---|
| **Tên field JSON** | `snake_case`, viết **thường** toàn bộ | `full_name`, `exam_session_id`, `created_at` |
| **ID** | Kiểu `integer` (int64) | `1`, `42`, `1001` |
| **Ngày (date only)** | Format `YYYY-MM-DD` | `"2026-12-25"` |
| **Ngày giờ (datetime)** | ISO 8601 / RFC 3339 | `"2026-09-07T10:30:00+07:00"` |
| **Boolean** | `true` / `false` | `true` |
| **Nullable fields** | Trả về `null` khi không có giá trị, hoặc không xuất hiện trong JSON (khi dùng `omitempty`) | `"phone": null` hoặc thiếu field `phone` |
| **Path param** | Luôn là `integer`, parse bằng `:id` hoặc `:registration_id` | `/me/registrations/42/cancel` |

### 1.5. Quy tắc mật khẩu (Password Policy)

Khi tạo hoặc thay đổi mật khẩu, **bắt buộc** tuân theo:

| Quy tắc | Mô tả |
|---|---|
| Tối thiểu 8 ký tự | `min=8` |
| Tối đa 72 ký tự | `max=72` (giới hạn bcrypt) |
| Chứa cả chữ và số | Phải có ít nhất 1 chữ cái + 1 số |
| Ít nhất 1 chữ hoa | `A-Z` |
| Ít nhất 1 ký tự đặc biệt | `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, v.v. |

**Ví dụ hợp lệ:** `Abc@1234`, `MyPass!99`
**Ví dụ KHÔNG hợp lệ:** `12345678` (thiếu chữ), `abcdefgh` (thiếu số), `Abcdefg1` (thiếu ký tự đặc biệt)

### 1.6. Rate Limiting

- **Giới hạn:** 10 requests/giây, burst tối đa 20 (per IP)
- **Khi vượt quá:** HTTP `429 Too Many Requests`

```json
{
  "statusCode": 429,
  "timestamp": "2026-09-07T10:30:00+07:00",
  "path": "/api/v1/...",
  "msg": "Quá nhiều yêu cầu, vui lòng thử lại sau"
}
```

### 1.7. Mã HTTP phổ biến

| Code | Ý nghĩa | Khi nào xảy ra |
|---|---|---|
| `200` | OK | Request thành công |
| `201` | Created | Tạo mới tài nguyên thành công |
| `400` | Bad Request | Dữ liệu gửi lên không hợp lệ / thiếu trường bắt buộc |
| `401` | Unauthorized | Thiếu token / token hết hạn / sai thông tin đăng nhập |
| `403` | Forbidden | Không có quyền (ví dụ: candidate truy cập admin route) |
| `404` | Not Found | Không tìm thấy tài nguyên |
| `409` | Conflict | Xung đột dữ liệu (tài khoản đã tồn tại, ghế đã có người giữ, v.v.) |
| `429` | Too Many Requests | Vượt quá giới hạn rate limit |
| `500` | Internal Server Error | Lỗi hệ thống nội bộ |

---

## 2. Module Auth (Xác thực)

### 2.1. Đăng ký tài khoản

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/register` |
| **Auth** | 🔓 Public |
| **Use-case** | Thí sinh tạo tài khoản mới để sử dụng hệ thống |

**Request Body:**

```json
{
  "cccd": "012345678901",
  "phone": "0901234567",
  "full_name": "Nguyễn Văn A",
  "email": "nguyenvana@email.com",
  "password": "Abc@1234"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `cccd` | `string` | ✅ | Đúng 12 ký tự, chỉ chứa số | Số CCCD (Căn cước công dân) |
| `phone` | `string` | ✅ | Tối đa 20 ký tự | Số điện thoại |
| `full_name` | `string` | ✅ | Tối đa 150 ký tự | Họ và tên đầy đủ |
| `email` | `string` | ✅ | Email hợp lệ, tối đa 150 ký tự | Địa chỉ email |
| `password` | `string` | ✅ | Min 8, max 72, phải có chữ + số + chữ hoa + ký tự đặc biệt | Mật khẩu (xem [1.5](#15-quy-tắc-mật-khẩu-password-policy)) |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "account": {
      "id": 1,
      "username": "012345678901",
      "full_name": "Nguyễn Văn A",
      "email": "nguyenvana@email.com",
      "phone": "0901234567",
      "status": "active",
      "role_id": 2,
      "created_at": "2026-09-07T10:30:00+07:00",
      "updated_at": "2026-09-07T10:30:00+07:00"
    },
    "message": "Tài khoản đã được tạo thành công."
  },
  "error": null,
  "meta": null
}
```

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | JSON body sai format |
| `400` | Chi tiết lỗi validation | Thiếu/sai field (ví dụ: CCCD không đủ 12 số) |
| `409` | `"tài khoản đã tồn tại"` | CCCD hoặc email đã được đăng ký |

---

### 2.2. Đăng nhập

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/login` |
| **Auth** | 🔓 Public |
| **Use-case** | Xác thực người dùng, nhận Access + Refresh Token |

**Request Body:**

```json
{
  "identifier": "012345678901",
  "password": "Abc@1234"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `identifier` | `string` | ✅ | Không rỗng | CCCD (12 số) hoặc Email |
| `password` | `string` | ✅ | Không rỗng | Mật khẩu |

> **Lưu ý:** Server tự phát hiện `identifier` là CCCD hay Email dựa trên format.

**Request Headers (tự động gửi):**

| Header | Mô tả |
|---|---|
| `User-Agent` | Thông tin thiết bị (được lưu lại cho quản lý phiên) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "must_change_password": false
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `access_token` | `string` | JWT access token (24h). Payload chứa `user_id` và `user_role` |
| `refresh_token` | `string` | JWT refresh token (7 ngày) |
| `expires_in` | `integer` | Thời gian sống của access token (giây) |
| `must_change_password` | `boolean` | `true` nếu là nhân viên lần đầu đăng nhập cần đổi mật khẩu tạm |

> **⚠️ Khi `must_change_password = true`:** Front-end phải redirect sang trang đổi mật khẩu bắt buộc (gọi API [2.4](#24-đổi-mật-khẩu-bắt-buộc-nhân-viên)).
>
> **🧭 Xử lý phân quyền (RBAC) trên Frontend:**
> Token JWT `access_token` chứa trường `user_role` (`admin`, `candidate`, `proctor`, `reviewer`). Frontend có thể dùng thư viện `jwt-decode` để giải mã token ngay phía client để lấy role, từ đó **điều hướng (redirect) user về đúng giao diện tương ứng**:
> - `admin`: Chuyển sang layout Dashboard Quản trị (quản lý ca thi, thí sinh, tài chính...).
> - `candidate`: Chuyển sang layout Thí sinh (xem thông tin cá nhân, đăng ký thi...).
> - `proctor` / `reviewer`: Chuyển sang layout Giám thị / Giám khảo.

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | JSON body sai format |
| `401` | `"thông tin đăng nhập không chính xác"` | Sai mật khẩu HOẶC tài khoản không tồn tại (không phân biệt 2 trường hợp — bảo mật) |

---

### 2.3. Làm mới Token

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/refresh` |
| **Auth** | 🔓 Public |
| **Use-case** | Lấy access token mới khi token cũ hết hạn |

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `refresh_token` | `string` | ✅ | Không rỗng | Refresh token nhận từ đăng nhập |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  },
  "error": null,
  "meta": null
}
```

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | JSON body sai format |
| `401` | `"Token không hợp lệ hoặc đã hết hạn"` | Refresh token hết hạn hoặc bị thu hồi |

---

### 2.4. Đổi mật khẩu bắt buộc (Nhân viên)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/force-password-change` |
| **Auth** | 🔓 Public |
| **Use-case** | Nhân viên đổi mật khẩu tạm khi đăng nhập lần đầu |

**Request Body:**

```json
{
  "temp_token": "eyJhbGciOiJIUzI1NiIs...",
  "new_password": "NewPass@2026"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `temp_token` | `string` | ✅ | Không rỗng | Token tạm nhận từ lần đăng nhập đầu tiên |
| `new_password` | `string` | ✅ | Min 8, max 72 | Mật khẩu mới |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đổi mật khẩu thành công, vui lòng đăng nhập lại"
  },
  "error": null,
  "meta": null
}
```

---

### 2.5. Đăng xuất (1 phiên)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/logout` |
| **Auth** | 🔐 JWT |
| **Use-case** | Đăng xuất khỏi thiết bị hiện tại |

**Request Body:**

```json
{
  "session_id": 15
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `session_id` | `integer` | ✅ | Min 1 | ID phiên đăng nhập (lấy từ GET /me/sessions) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đăng xuất thành công"
  },
  "error": null,
  "meta": null
}
```

---

### 2.6. Đăng xuất tất cả thiết bị

| | |
|---|---|
| **Endpoint** | `POST /api/v1/auth/logout-all` |
| **Auth** | 🔐 JWT |
| **Use-case** | Đăng xuất khỏi tất cả thiết bị (xóa toàn bộ session) |

**Request Body:** Không cần (trống)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã đăng xuất khỏi tất cả thiết bị"
  },
  "error": null,
  "meta": null
}
```

---

### 2.7. Lấy thông tin tài khoản (Me)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me` |
| **Auth** | 🔐 JWT |
| **Use-case** | Lấy profile tài khoản đang đăng nhập |

**Request:** Không cần body/query.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "012345678901",
    "full_name": "Nguyễn Văn A",
    "email": "nguyenvana@email.com",
    "phone": "0901234567",
    "status": "active",
    "role_id": 2,
    "created_at": "2026-09-07T10:30:00+07:00",
    "updated_at": "2026-09-07T10:30:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (AccountResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID tài khoản |
| `username` | `string` | ❌ | Username (= CCCD) |
| `full_name` | `string` | ❌ | Họ tên |
| `email` | `string` | ❌ | Email |
| `phone` | `string` | ✅ | Số điện thoại (có thể `null` hoặc thiếu) |
| `status` | `string` | ❌ | Trạng thái: `active`, `locked`, `pending` |
| `role_id` | `integer` | ❌ | ID của role |
| `created_at` | `datetime` | ❌ | Ngày tạo |
| `updated_at` | `datetime` | ❌ | Ngày cập nhật |

---

### 2.8. Cập nhật thông tin tài khoản

| | |
|---|---|
| **Endpoint** | `PUT /api/v1/me` |
| **Auth** | 🔐 JWT |
| **Use-case** | Cập nhật họ tên, email, số điện thoại của tài khoản đang đăng nhập |

**Request Body (các trường đều tùy chọn, chỉ gửi các trường cần cập nhật):**

```json
{
  "full_name": "Nguyen Van A",
  "email": "newemail@example.com",
  "phone": "0987654321"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `full_name` | `string` | ❌ | Tối đa 100 ký tự | Họ tên mới |
| `email` | `string` | ❌ | Email hợp lệ, tối đa 150 ký tự | Email mới |
| `phone` | `string` | ❌ | Tối đa 20 ký tự | SĐT mới |

**Response (200 OK):** Trả về `AccountResponseDTO` (xem [2.7](#27-lấy-thông-tin-tài-khoản-me)).

---

### 2.9. Xóa tài khoản (Soft-delete)

| | |
|---|---|
| **Endpoint** | `DELETE /api/v1/me` |
| **Auth** | 🔐 JWT |
| **Use-case** | Người dùng tự vô hiệu hóa tài khoản |

**Request:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã xóa tài khoản"
  },
  "error": null,
  "meta": null
}
```

---

### 2.10. Đổi mật khẩu

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/me/password` |
| **Auth** | 🔐 JWT |
| **Use-case** | Người dùng đang đăng nhập đổi mật khẩu |

**Request Body:**

```json
{
  "old_password": "Abc@1234",
  "new_password": "NewPass@2026"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `old_password` | `string` | ✅ | Không rỗng | Mật khẩu hiện tại |
| `new_password` | `string` | ✅ | Min 8, max 72 | Mật khẩu mới (xem [1.5](#15-quy-tắc-mật-khẩu-password-policy)) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đổi mật khẩu thành công"
  },
  "error": null,
  "meta": null
}
```

---

### 2.11. Danh sách phiên đăng nhập

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/sessions` |
| **Auth** | 🔐 JWT |
| **Use-case** | Xem danh sách các thiết bị đang đăng nhập |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "device_info": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "ip_address": "192.168.1.100",
      "created_at": "2026-09-07T08:00:00+07:00",
      "expires_at": "2026-09-14T08:00:00+07:00"
    }
  ],
  "error": null,
  "meta": null
}
```

**Response fields (SessionResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID phiên đăng nhập |
| `device_info` | `string` | ✅ | Thông tin thiết bị/trình duyệt |
| `ip_address` | `string` | ✅ | Địa chỉ IP |
| `created_at` | `datetime` | ❌ | Thời điểm đăng nhập |
| `expires_at` | `datetime` | ❌ | Thời điểm hết hạn phiên |

---

### 2.12. Xóa phiên đăng nhập cụ thể

| | |
|---|---|
| **Endpoint** | `DELETE /api/v1/me/sessions/:id` |
| **Auth** | 🔐 JWT |
| **Use-case** | Đăng xuất khỏi một thiết bị cụ thể |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID phiên đăng nhập |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã đăng xuất khỏi thiết bị"
  },
  "error": null,
  "meta": null
}
```

---

### 2.13. [Admin] Xóa tài khoản

| | |
|---|---|
| **Endpoint** | `DELETE /api/v1/admin/delete-account/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin vô hiệu hóa tài khoản của người dùng |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID tài khoản cần xóa |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã xóa tài khoản"
  },
  "error": null,
  "meta": null
}
```

---

### 2.14. [Admin] Tạo tài khoản nhân viên

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/staff-accounts` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin tạo tài khoản cho nhân viên/cán bộ. Hệ thống trả về mật khẩu tạm |

**Request Body:**

```json
{
  "cccd": "034567890123",
  "full_name": "Trần Thị B",
  "email": "tranthib@dhv.edu.vn",
  "phone": "0912345678",
  "role_code": "admin"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `cccd` | `string` | ✅ | Đúng 12 ký tự, chỉ chứa số | Số CCCD |
| `full_name` | `string` | ✅ | Tối đa 150 ký tự | Họ và tên |
| `email` | `string` | ✅ | Email hợp lệ, tối đa 150 ký tự | Email |
| `phone` | `string` | ❌ | Tối đa 20 ký tự | Số điện thoại |
| `role_code` | `string` | ✅ | Không rỗng | Mã vai trò: `admin` hoặc `candidate` |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "account": { ... },
    "temp_password": "xK9#mP2q",
    "message": "Tài khoản nhân viên đã được tạo. Nhân viên phải đổi mật khẩu khi đăng nhập lần đầu."
  },
  "error": null,
  "meta": null
}
```

> **⚠️ Quan trọng:** `temp_password` chỉ xuất hiện **MỘT LẦN DUY NHẤT** trong response. Admin phải ghi lại và gửi cho nhân viên.

---

## 3. Module Candidate (Hồ sơ thí sinh)

> Tất cả endpoint hồ sơ, giấy tờ, upload, tra cứu và phê duyệt thí sinh đều thuộc cùng module/tag `Candidate`; không tách riêng nhóm admin hay upload thành module khác.

### 3.1. Tạo hồ sơ thí sinh

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/candidate-profile` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh tạo hồ sơ cá nhân (sau khi đã đăng ký tài khoản) |

**Request Body:**

```json
{
  "full_name": "Nguyễn Văn A",
  "full_name_cn": "阮文A",
  "dob": "2000-05-15",
  "gender": "male",
  "ethnicity": "Kinh",
  "religion": "Không",
  "nationality": "Việt Nam",
  "chinese_study_years": 3
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `full_name` | `string` | ✅ | Tối đa 150 ký tự | Họ tên đầy đủ |
| `full_name_cn` | `string` | ❌ | Tối đa 150 ký tự | Họ tên tiếng Trung |
| `dob` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày sinh |
| `gender` | `string` | ✅ | `male`, `female`, `other` | Giới tính |
| `ethnicity` | `string` | ❌ | Tối đa 50 ký tự | Dân tộc |
| `religion` | `string` | ❌ | Tối đa 50 ký tự | Tôn giáo |
| `nationality` | `string` | ❌ | Tối đa 50 ký tự | Quốc tịch |
| `chinese_study_years` | `integer` | ❌ | Min 0 | Số năm học tiếng Trung |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "account_id": 1,
    "full_name": "Nguyễn Văn A",
    "full_name_cn": "阮文A",
    "dob": "2000-05-15T00:00:00Z",
    "gender": "male",
    "ethnicity": "Kinh",
    "religion": "Không",
    "nationality": "Việt Nam",
    "chinese_study_years": 3
  },
  "error": null,
  "meta": null
}
```

**Response fields (CandidateResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID hồ sơ thí sinh |
| `account_id` | `integer` | ❌ | ID tài khoản liên kết |
| `full_name` | `string` | ❌ | Họ tên |
| `full_name_cn` | `string` | ✅ | Họ tên tiếng Trung |
| `dob` | `datetime` | ❌ | Ngày sinh |
| `gender` | `string` | ❌ | Giới tính |
| `ethnicity` | `string` | ✅ | Dân tộc |
| `religion` | `string` | ✅ | Tôn giáo |
| `birthplace` | `string` | ✅ | Nơi sinh |
| `nationality` | `string` | ❌ | Quốc tịch |
| `mother_tongue` | `string` | ✅ | Tiếng mẹ đẻ |
| `chinese_study_years` | `integer` | ✅ | Số năm học tiếng Trung |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `409` | `"Hồ sơ thí sinh đã tồn tại"` | Tài khoản này đã có hồ sơ thí sinh |

---

### 3.2. Xem hồ sơ thí sinh (của tôi)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/candidate-profile` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xem hồ sơ cá nhân |

**Response (200 OK):** Trả về `CandidateResponseDTO` (xem [3.1](#31-tạo-hồ-sơ-thí-sinh)).

---

### 3.3. Cập nhật hồ sơ thí sinh

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/me/candidate-profile` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh cập nhật một phần hồ sơ (chỉ gửi các field cần sửa) |

**Request Body (partial update):**

```json
{
  "full_name": "Nguyễn Văn B",
  "full_name_cn": "阮文B",
  "chinese_study_years": 4
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `full_name` | `string` | ❌ | Tối đa 150 ký tự | Họ tên |
| `full_name_cn` | `string` | ❌ | Tối đa 150 ký tự | Họ tên tiếng Trung |
| `ethnicity` | `string` | ❌ | Tối đa 50 ký tự | Dân tộc |
| `religion` | `string` | ❌ | Tối đa 50 ký tự | Tôn giáo |
| `nationality` | `string` | ❌ | Tối đa 50 ký tự | Quốc tịch |
| `chinese_study_years` | `integer` | ❌ | Min 0 | Số năm học tiếng Trung |

`full_name_cn` được lưu vào `candidates.candidate_full_name_cn` và trả lại trong
response dưới dạng `full_name_cn`. Tên field phải dùng đúng snake_case như trên.
Nếu không gửi field này trong PATCH thì giá trị cũ được giữ nguyên; nếu chưa có
dữ liệu, response trả về `null`.

Giá trị đúng cần gửi là chuỗi tên tiếng Trung, ví dụ `"full_name_cn": "潘文进"`.
Backend cũng tự loại bỏ một lớp dấu ngoặc kép dư thừa nếu client gửi nhầm
`"full_name_cn": "\"潘文进\""`, để dữ liệu lưu trong database vẫn là `潘文进`.

**Hướng dẫn tích hợp Front-end:** `full_name_cn` phải được gửi dưới dạng chuỗi
Unicode UTF-8 bình thường. Không gọi `JSON.stringify()` riêng cho giá trị này;
hãy truyền object trực tiếp cho `fetch`/Axios và để thư viện serialize request body.
Font `PingFang SC` chỉ là font hiển thị khi quản trị viên xem dữ liệu trong
DataGrip/macOS, không phải một phần của dữ liệu database và không cần cài đặt
font này ở Front-end.

> **⚠️ Lưu ý:** Không thể sửa hồ sơ khi đang có đăng ký thi `confirmed`. Sẽ trả lỗi `409`.

---

### 3.4. Upload giấy tờ tùy thân

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/candidate-profile/documents` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh upload ảnh CCCD/Passport |

> **Luồng upload ảnh:** Front-end lấy chữ ký từ [3.5](#35-lấy-chữ-ký-upload), upload trực tiếp lên Cloudinary, rồi gửi URL ảnh về endpoint này.

**Request Body:**

```json
{
  "doc_type": "cccd",
  "doc_number": "012345678901",
  "issue_date": "2021-06-15",
  "issue_place": "Cục Cảnh sát QLHC về TTXH",
  "front_image_url": "https://res.cloudinary.com/.../front.jpg",
  "back_image_url": "https://res.cloudinary.com/.../back.jpg",
  "portrait_image_url": "https://res.cloudinary.com/.../portrait.jpg",
  "ward_id": 5,
  "address_detail": "123 Đường ABC, Phường XYZ"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `doc_type` | `string` | ✅ | `cccd` hoặc `passport` | Loại giấy tờ |
| `doc_number` | `string` | ✅ | Tối đa 30 ký tự | Số giấy tờ |
| `issue_date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày cấp |
| `issue_place` | `string` | ✅ | Tối đa 150 ký tự | Nơi cấp |
| `front_image_url` | `string` | ✅ | URL hợp lệ | URL ảnh mặt trước |
| `back_image_url` | `string` | ❌ | URL hợp lệ | URL ảnh mặt sau |
| `portrait_image_url` | `string` | ✅ | URL hợp lệ | URL ảnh chân dung |
| `ward_id` | `integer` | ❌ | Min 1 | ID xã/phường |
| `address_detail` | `string` | ❌ | Tối đa 255 ký tự | Địa chỉ chi tiết |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "candidate_id": 1,
    "doc_type": "cccd",
    "doc_number": "012345678901",
    "issue_date": "2021-06-15T00:00:00Z",
    "issue_place": "Cục Cảnh sát QLHC về TTXH",
    "front_image_url": "https://res.cloudinary.com/.../front.jpg",
    "back_image_url": "https://res.cloudinary.com/.../back.jpg",
    "portrait_image_url": "https://res.cloudinary.com/.../portrait.jpg",
    "verification_status": "pending"
  },
  "error": null,
  "meta": null
}
```

**Response fields (DocumentResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID giấy tờ |
| `candidate_id` | `integer` | ❌ | ID thí sinh |
| `doc_type` | `string` | ❌ | `cccd` hoặc `passport` |
| `doc_number` | `string` | ❌ | Số giấy tờ |
| `issue_date` | `datetime` | ❌ | Ngày cấp |
| `issue_place` | `string` | ❌ | Nơi cấp |
| `front_image_url` | `string` | ❌ | URL ảnh mặt trước |
| `back_image_url` | `string` | ✅ | URL ảnh mặt sau |
| `portrait_image_url` | `string` | ❌ | URL ảnh chân dung |
| `verification_status` | `string` | ❌ | `pending`, `verified`, `rejected` |
| `rejection_reason` | `string` | ✅ | Lý do từ chối (chỉ khi `rejected`) |
| `ward_id` | `integer` | ✅ | ID của Xã/Phường |
| `province_id` | `integer` | ✅ | ID của Tỉnh/Thành phố |
| `address_detail` | `string` | ✅ | Địa chỉ chi tiết |

---

### 3.5. Lấy danh sách giấy tờ tùy thân

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/candidate-profile/documents` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xem toàn bộ giấy tờ tùy thân đã nộp |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "candidate_id": 1,
      "doc_type": "cccd",
      "doc_number": "012345678901",
      "issue_date": "2021-06-15T00:00:00Z",
      "issue_place": "Cục Cảnh sát QLHC về TTXH",
      "front_image_url": "https://res.cloudinary.com/.../front.jpg",
      "back_image_url": "https://res.cloudinary.com/.../back.jpg",
      "portrait_image_url": "https://res.cloudinary.com/.../portrait.jpg",
      "verification_status": "verified",
      "ward_id": 123,
      "province_id": 4,
      "address_detail": "Số 123 Đường ABC"
    },
    {
      "id": 1,
      "candidate_id": 1,
      "doc_type": "passport",
      "doc_number": "B12345678",
      "issue_date": "2020-03-10T00:00:00Z",
      "issue_place": "Cục Xuất nhập cảnh",
      "front_image_url": "https://res.cloudinary.com/.../pp_front.jpg",
      "portrait_image_url": "https://res.cloudinary.com/.../pp_portrait.jpg",
      "verification_status": "pending",
      "ward_id": 456,
      "province_id": 5,
      "address_detail": "Thôn XYZ"
    }
  ],
  "error": null,
  "meta": null
}
```

> Trả về mảng `DocumentResponseDTO` (cùng cấu trúc đã mô tả ở [3.4](#34-upload-giấy-tờ-tùy-thân)). Sắp xếp theo thời gian tạo giảm dần (mới nhất trước).

---

### 3.6. Lấy chữ ký Upload (Cloudinary)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/candidate-profile/upload-signature` |
| **Auth** | 🔐 JWT |
| **Use-case** | Lấy thông tin để upload ảnh trực tiếp lên Cloudinary |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "signature": "abc123...",
    "timestamp": 1694000000,
    "api_key": "1234567890",
    "cloud_name": "your_cloud",
    "folder": "candidates/documents"
  },
  "error": null,
  "meta": null
}
```

---

### 3.7. [Admin] Danh sách thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem danh sách thí sinh, lọc theo trạng thái giấy tờ |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `status` | `string` | ❌ | `all`, `pending`, `verified`, `rejected` | Lọc theo trạng thái xác minh; bỏ trống hoặc `all` là tất cả |
| `level` | `string` | ❌ | Tối đa 100 ký tự | Lọc theo cấp độ HSK của kỳ thi đã đăng ký |
| `search` | `string` | ❌ | Tối đa 100 ký tự | Tìm theo họ tên hoặc số CCCD |
| `exam_date` | `date` | ❌ | `YYYY-MM-DD` | Lọc theo ngày thi |
| `page` | `integer` | ❌ | Min 1, mặc định 1 | Trang hiện tại |
| `limit` | `integer` | ❌ | Min 1, max 100, mặc định 20 | Số bản ghi/trang |

**Ví dụ:** `GET /api/v1/admin/candidates?status=pending&level=HSK%203&search=Nguyen&page=1&limit=20`

`exam_date` có thể dùng để chỉ lấy thí sinh thuộc một ngày thi cụ thể:
`GET /api/v1/admin/candidates?exam_date=2026-11-27&page=1&limit=20`

**Response (200 OK):** Mảng `AdminCandidateResponseDTO` + `meta` phân trang.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account_id": 1,
      "full_name": "Nguyễn Văn A",
      "full_name_cn": "阮文A",
      "dob": "2000-05-15T00:00:00Z",
      "gender": "male",
      "ethnicity": "Kinh",
      "religion": "Không",
      "nationality": "Việt Nam",
      "birthplace": null,
      "mother_tongue": null,
      "chinese_study_years": 3,
      "phone": "0901234567",
      "email": "nguyenvana@email.com",
      "exam_level": "HSK 4",
      "target_exam_level": "HSK 4",
      "latest_document": {
        "id": 1,
        "candidate_id": 1,
        "doc_type": "cccd",
        "doc_number": "012345678901",
        "issue_date": "2021-06-15T00:00:00Z",
        "issue_place": "Cục Cảnh sát QLHC về TTXH",
        "front_image_url": "...",
        "back_image_url": null,
        "portrait_image_url": "...",
        "verification_status": "pending",
        "rejection_reason": null,
        "ward_id": null,
        "province_id": null,
        "address_detail": "Số 123 Đường ABC"
      }
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 50,
    "total_pages": 3
  }
}
```

---

### 3.8. [Admin] Thống kê hồ sơ thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates/metrics` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Lấy tổng số hồ sơ và số lượng theo trạng thái giấy tờ mới nhất |

```json
{
  "success": true,
  "data": {
    "total": 120,
    "pending": 45,
    "verified": 60,
    "rejected": 15
  },
  "error": null,
  "meta": null
}
```

### 3.9. [Admin] Xuất danh sách hồ sơ thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates/export` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Tải danh sách hồ sơ đã lọc dưới dạng tệp PDF |

API bắt buộc nhận `exam_date=YYYY-MM-DD` để xác định đúng đợt thi; đồng thời nhận các query params `status`, `level` và `search` giống API danh sách. `status` nhận `all` (tất cả, mặc định khi bỏ trống), `pending` (chờ duyệt), `verified` (đã duyệt) hoặc `rejected` (từ chối). Response bắt buộc trả về `Content-Type: application/pdf` và `Content-Disposition` với tên file theo trạng thái và ngày thi.

PDF sử dụng font Noto Serif SC Unicode được nhúng trực tiếp vào file (kiểu serif tương tự Times New Roman, hỗ trợ cả tiếng Việt và chữ Hán), không phụ thuộc font hệ thống hoặc container. Toàn bộ nội dung được truyền dưới dạng UTF-8; các tên tiếng Trung như `潘文进` phải hiển thị đúng.

Tên file được tạo theo quy tắc: tất cả `ds_thi_sinh_{dd-mm-yyyy}.pdf`; chờ duyệt `ds_ho_so_thi_sinh_cho_duyet_{dd-mm-yyyy}.pdf`; đã duyệt `ds_ho_so_thi_sinh_da_duyet_{dd-mm-yyyy}.pdf`; từ chối `ds_ho_so_thi_sinh_tu_choi_{dd-mm-yyyy}.pdf`.

PDF gồm các cột: `STT`, `Họ và tên`, `Ngày sinh`, `Số CCCD`, `Cấp thi`, `Ngày đăng ký` (`dd/mm/yyyy hh:mm`) và `Ghi chú`. Cấp thi sử dụng nguyên tên kỳ thi theo dữ liệu gốc; các kỳ HSK 1–2 không được đưa vào danh sách export. Nội dung dài trong ô được rút gọn bằng dấu `...` để không chồng lấn cột. Với hồ sơ `rejected`, cột `Ghi chú` hiển thị `Từ chối: {candidate_document_rejection_reason}`; nếu không có lý do thì hiển thị `-`. Tiêu đề thể hiện ngày thi theo định dạng `dd/mm/yyyy`, cùng tên đơn vị và phần tiêu ngữ theo thể thức văn bản hành chính.

**Ví dụ tải file:**

```http
GET /api/v1/admin/candidates/export?exam_date=2026-11-27&status=verified
Authorization: Bearer <admin_jwt>
```

Các lựa chọn xuất theo trạng thái:

```http
# Tất cả hồ sơ (bỏ status hoặc dùng status=all)
GET /api/v1/admin/candidates/export?exam_date=2026-11-27
GET /api/v1/admin/candidates/export?exam_date=2026-11-27&status=all

# Hồ sơ chờ duyệt
GET /api/v1/admin/candidates/export?exam_date=2026-11-27&status=pending

# Hồ sơ đã duyệt
GET /api/v1/admin/candidates/export?exam_date=2026-11-27&status=verified

# Hồ sơ từ chối, kèm lý do từ chối trong cột Ghi chú
GET /api/v1/admin/candidates/export?exam_date=2026-11-27&status=rejected
```

Khi `status=rejected`, PDF chỉ gồm các hồ sơ có trạng thái giấy tờ mới nhất là
`rejected`. Cột `Ghi chú` có dạng `Từ chối: {rejection_reason}`; nếu không có
lý do từ chối thì hiển thị `-`. Khi bỏ qua `status` hoặc dùng `status=all`, PDF
bao gồm cả hồ sơ chưa có giấy tờ mới nhất và các hồ sơ có trạng thái
`pending`, `verified`, `rejected`.

**Lỗi thường gặp:**

- Thiếu `exam_date`: HTTP `400`.
- `exam_date` không đúng định dạng `YYYY-MM-DD`: HTTP `400`.
- Không có quyền admin: HTTP `401` hoặc `403`.

### 3.10. [Admin] Xem chi tiết thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem chi tiết hồ sơ một thí sinh |

**Path Params:** `id` — ID thí sinh (`integer`)

**Response (200 OK):** Trả về `AdminCandidateResponseDTO`.

Response chi tiết sử dụng cùng đầy đủ contract với API danh sách (thông tin hồ sơ,
tài khoản, cấp thi và `latest_document`). Các trường chưa có dữ liệu được trả về
explicitly với giá trị `null`, không bị loại bỏ khỏi JSON. `exam_level` và
`target_exam_level` hiện được lấy từ cấp của lần đăng ký thi gần nhất; hệ thống
chưa có cột mục tiêu riêng. Trường `full_name_cn` chứa họ tên tiếng Trung của
thí sinh và trả về `null` nếu chưa được cập nhật.

---

### 3.9. [Admin] Duyệt giấy tờ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/candidates/:id/approve` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin phê duyệt giấy tờ thí sinh |

**Path Params:** `id` — ID thí sinh (`integer`)

**Request Body:** Không cần.

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Hồ sơ đã được duyệt" },
  "error": null,
  "meta": null
}
```

---

### 3.10. [Admin] Từ chối giấy tờ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/candidates/:id/reject` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin từ chối giấy tờ thí sinh (kèm lý do) |

**Path Params:** `id` — ID thí sinh (`integer`)

**Request Body:**

```json
{
  "reason": "Ảnh CCCD bị mờ, không đọc được thông tin"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `reason` | `string` | ✅ | Tối đa 500 ký tự | Lý do từ chối |

---

### 3.11. [Admin] Danh sách hồ sơ trùng

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates/duplicates` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Phát hiện các thí sinh dùng chung số giấy tờ |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "doc_number": "012345678901",
      "doc_type": "cccd",
      "candidate_ids": [1, 5, 12],
      "count": 3
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 3.12. [Admin] Danh sách điểm danh phòng thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/exam-sessions/:id/roster` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xuất danh sách thí sinh trong phòng thi |

**Path Params:** `id` — ID ca thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "seat_number": 1,
      "candidate_id": 42,
      "full_name": "Nguyễn Văn A",
      "dob": "2000-05-15T00:00:00Z",
      "gender": "male",
      "nationality": "Việt Nam",
      "doc_number": "012345678901",
      "doc_type": "cccd",
      "portrait_image_url": "https://..."
    }
  ],
  "error": null,
  "meta": null
}
```

---

## 4. Module Exam (Kỳ thi)

### 4.1. Danh sách loại kỳ thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-types` |
| **Auth** | 🔓 Public |
| **Use-case** | Lấy danh sách các loại chứng chỉ/kỳ thi (HSK 1, HSK 2, ...) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "HSK1",
      "name": "HSK Cấp 1",
      "description": "Chứng chỉ năng lực tiếng Trung cấp 1"
    }
  ],
  "error": null,
  "meta": null
}
```

**Response fields (ExamTypeResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID loại thi |
| `code` | `string` | ❌ | Mã loại thi |
| `name` | `string` | ❌ | Tên loại thi |
| `description` | `string` | ✅ | Mô tả |

---

### 4.2. Danh sách ca thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-sessions` |
| **Auth** | 🔓 Public |
| **Use-case** | Xem các ca thi đang mở đăng ký, có thể lọc |

**Query Params (tất cả tùy chọn):**

| Param | Kiểu | Validate | Mô tả |
|---|---|---|---|
| `province_id` | `integer` | — | Lọc theo tỉnh/thành phố |
| `exam_type_id` | `integer` | — | Lọc theo loại thi |
| `from` | `string` | Format: `YYYY-MM-DD` | Ngày bắt đầu |
| `to` | `string` | Format: `YYYY-MM-DD` | Ngày kết thúc |

**Ví dụ:** `GET /api/v1/exam-sessions?exam_type_id=1&from=2026-10-01&to=2026-12-31`

### 4.2.1. [Admin] Danh sách toàn bộ ca thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/exam-sessions` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem toàn bộ ca thi, bao gồm `published`, `draft`, `scheduled` và `cancelled` |

Endpoint này chỉ dành cho tài khoản Admin. API public bên trên chỉ trả về ca `published`
đã đến thời điểm `exam_session_publish_at`; Admin API không áp dụng bộ lọc phát hành đó.

**Query Params (tất cả tùy chọn):** `exam_type_id`, `from`, `to`.

**Response (200 OK):** Mảng `ExamSessionResponseDTO`, giữ nguyên các field:
`exam_session_publication_status`, `exam_session_publish_at`,
`exam_session_check_in_at`.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "exam_type_id": 1,
      "date": "2026-10-15T00:00:00Z",
      "shift": "morning",
      "capacity": 40,
      "fee": 500000,
      "registration_deadline": "2026-10-10T23:59:59+07:00",
      "status": "open",
      "exam_session_publication_status": "published",
      "exam_session_publish_at": null,
      "exam_session_check_in_at": "2026-10-15T07:30:00+07:00"
    }
  ],
  "error": null,
  "meta": null
}
```

**Response fields (ExamSessionResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID ca thi |
| `exam_type_id` | `integer` | ❌ | ID loại thi |
| `date` | `datetime` | ❌ | Ngày thi |
| `shift` | `string` | ❌ | Ca thi: `morning`, `afternoon`, `evening` |
| `capacity` | `integer` | ❌ | Sức chứa tối đa |
| `fee` | `integer` | ❌ | Lệ phí thi (đơn vị: VNĐ) |
| `registration_deadline` | `datetime` | ❌ | Hạn đăng ký |
| `status` | `string` | ❌ | `open`, `closed`, `cancelled` |
| `exam_session_publication_status` | `string` | ❌ | `published`, `draft`, `scheduled` |
| `exam_session_publish_at` | `datetime` | ✅ | Thời điểm công khai; bắt buộc ở trạng thái `scheduled` |
| `exam_session_check_in_at` | `datetime` | ✅ | Giờ có mặt của thí sinh |

---

### 4.3. Chi tiết ca thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-sessions/:id` |
| **Auth** | 🔓 Public |
| **Use-case** | Xem chi tiết một ca thi cụ thể |

**Path Params:** `id` — ID ca thi (`integer`)

**Response (200 OK):** Trả về `ExamSessionResponseDTO` (xem [4.2](#42-danh-sách-ca-thi)).

---

### 4.4. Sơ đồ ghế ngồi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-sessions/:id/seats` |
| **Auth** | 🔓 Public |
| **Use-case** | Xem danh sách ghế và trạng thái của một ca thi |

**Path Params:** `id` — ID ca thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "session_id": 1,
      "number": 1,
      "status": "available",
      "held_until": null
    },
    {
      "id": 2,
      "session_id": 1,
      "number": 2,
      "status": "held",
      "held_until": "2026-09-07T10:45:00+07:00"
    }
  ],
  "error": null,
  "meta": null
}
```

**Response fields (ExamSeatResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID ghế |
| `session_id` | `integer` | ❌ | ID ca thi |
| `number` | `integer` | ❌ | Số ghế |
| `status` | `string` | ❌ | `available`, `held`, `booked` |
| `held_until` | `datetime` | ✅ | Thời điểm hết hạn giữ chỗ (chỉ có khi `held`) |

---

### 4.5. [Admin] Tạo ca thi hàng loạt

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-sessions/batch-create` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin tạo nhiều ca thi cùng lúc |

**Request Body:**

```json
{
  "sessions": [
    {
      "exam_type_id": 1,
      "date": "2026-10-15",
      "shift": "morning",
      "capacity": 40,
      "fee": 500000,
      "registration_deadline": "2026-10-10T23:59:59+07:00",
      "exam_session_publication_status": "scheduled",
      "exam_session_publish_at": "2026-10-01T00:00:00+07:00",
      "exam_session_check_in_at": "2026-10-15T07:30:00+07:00"
    }
  ]
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `sessions` | `array` | ✅ | Min 1 phần tử | Mảng ca thi |
| `sessions[].exam_type_id` | `integer` | ✅ | Min 1 | ID loại thi |
| `sessions[].date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày thi |
| `sessions[].shift` | `string` | ✅ | `morning`, `afternoon`, `evening` | Ca thi |
| `sessions[].capacity` | `integer` | ✅ | Min 1 | Sức chứa |
| `sessions[].fee` | `number` | ❌ | Min 0 | Lệ phí (VNĐ) |
| `sessions[].registration_deadline` | `string` | ✅ | RFC 3339 datetime | Hạn đăng ký |
| `sessions[].exam_session_publication_status` | `string` | ❌ | `published`, `draft`, `scheduled` | Trạng thái hiển thị; mặc định `published` |
| `sessions[].exam_session_publish_at` | `string` | ❌ | RFC 3339 datetime | Bắt buộc và phải ở tương lai khi `scheduled` |
| `sessions[].exam_session_check_in_at` | `string` | ❌ | RFC 3339 datetime | Giờ có mặt |

**Response (201 Created):** Mảng `ExamSessionResponseDTO`.

---

### 4.6. [Admin] Sinh ghế cho ca thi

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-sessions/:id/seats/generate` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Tự động sinh danh sách ghế (từ 1 → capacity) cho ca thi |

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body:** Không cần.

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "session_id": 1,
    "created_seats": 40
  },
  "error": null,
  "meta": null
}
```

---

### 4.7. [Admin] Hủy ca thi

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-sessions/:id/cancel` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin hủy một ca thi |

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body:** Không cần.

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Ca thi đã được hủy" },
  "error": null,
  "meta": null
}
```

---

### 4.8. [Admin] Cập nhật trạng thái phát hành (Publication Status)

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/admin/exam-sessions/:id/publication-status` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin thay đổi trạng thái phát hành của ca thi (draft, scheduled, published) |

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body:**

```json
{
  "exam_session_publication_status": "scheduled",
  "exam_session_publish_at": "2026-10-20T10:00:00Z"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_session_publication_status` | `string` | ✅ | `draft`, `published`, `scheduled` | Trạng thái phát hành |
| `exam_session_publish_at` | `string` | ❌ | RFC 3339 datetime | Bắt buộc và phải ở tương lai khi `exam_session_publication_status` là `scheduled` |

Quy tắc bổ sung: `draft` và `published` luôn lưu `exam_session_publish_at = null`;
`published` được phát hành ngay. Với `scheduled`, backend bắt buộc thời điểm tương lai.
Worker nền kiểm tra định kỳ và tự động chuyển ca đến hạn sang `published`, đồng thời
xóa `exam_session_publish_at`. Không thể cập nhật trạng thái phát hành cho ca thi đã hủy.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Cập nhật trạng thái phát hành thành công",
    "exam_session_publication_status": "scheduled",
    "exam_session_publish_at": "2026-10-20T10:00:00Z"
  },
  "error": null,
  "meta": null
}
```

---

## 5. Module Registration (Đăng ký thi)

### 5.1. Giữ chỗ / Đăng ký thi

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/registrations` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh chọn ca thi → hệ thống tự động giữ ghế 15 phút → tạo đơn đăng ký `pending_payment` |

> **⚠️ Quan trọng:** Ghế được giữ tối đa **15 phút**. Nếu không thanh toán trong thời gian này, ghế tự động được trả lại.

**Request Body:**

```json
{
  "exam_session_id": 1
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_session_id` | `integer` | ✅ | Min 1 | ID ca thi muốn đăng ký |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "candidate_id": 42,
    "exam_session_id": 1,
    "exam_seat_id": 5,
    "status": "pending_payment",
    "registered_at": "2026-09-07T10:30:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (ExamRegistrationResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID đăng ký |
| `candidate_id` | `integer` | ❌ | ID thí sinh |
| `exam_session_id` | `integer` | ❌ | ID ca thi |
| `exam_seat_id` | `integer` | ❌ | ID ghế đã giữ |
| `status` | `string` | ❌ | `pending_payment`, `confirmed`, `cancelled` |
| `registered_at` | `datetime` | ❌ | Thời điểm đăng ký |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `409` | `"Không còn ghế trống"` | Hết chỗ |
| `409` | `"Bạn đã đăng ký ca thi này"` | Đăng ký trùng |

---

### 5.2. Danh sách đăng ký thi (của tôi)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/registrations` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xem lịch sử đăng ký thi |

**Response (200 OK):** Mảng `ExamRegistrationResponseDTO`.

---

### 5.3. Xác nhận thanh toán

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/registrations/:id/payment-confirm` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xác nhận đã thanh toán cho đơn đăng ký |

**Path Params:** `id` — ID đăng ký thi (`integer`)

**Request Body:**

```json
{
  "amount": 500000.00,
  "method": "bank_transfer",
  "transaction_ref": "VCB20260907ABC123"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `amount` | `number` | ✅ | Lớn hơn 0 | Số tiền đã chuyển |
| `method` | `string` | ✅ | Không rỗng | Phương thức: `vnpay`, `momo`, `zalopay`, `bank_transfer`, `cash` |
| `transaction_ref` | `string` | ✅ | Không rỗng | Mã tham chiếu giao dịch |

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Xác nhận thanh toán thành công" },
  "error": null,
  "meta": null
}
```

---

### 5.4. Chuyển ca thi

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/registrations/:id/transfer` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh chuyển đăng ký sang ca thi khác |

**Path Params:** `id` — ID đăng ký thi (`integer`)

**Request Body:**

```json
{
  "new_exam_session_id": 5
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `new_exam_session_id` | `integer` | ✅ | Min 1 | ID ca thi mới muốn chuyển đến |

**Response (201 Created):** Trả về `ExamRegistrationResponseDTO` mới.

---

### 5.5. Hủy đăng ký thi

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/registrations/:id/cancel` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh hủy đăng ký thi (ghế được trả lại) |

**Path Params:** `id` — ID đăng ký thi (`integer`)

**Request Body:** Không cần.

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Đã hủy phiếu đăng ký" },
  "error": null,
  "meta": null
}
```

> **Lưu ý:** Chỉ hủy được khi trạng thái là `pending_payment`. Đăng ký `confirmed` hoặc `cancelled` **không thể** hủy.

---

### 5.6. Lấy Thẻ dự thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/registrations/:id/admission-slip` |
| **Auth** | 🔐 JWT |
| **Use-case** | Lấy thông tin thẻ dự thi sau khi đăng ký `confirmed` |

**Path Params:** `id` — ID đăng ký thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "registration_id": 1,
    "candidate_name": "Nguyễn Văn A",
    "id_number": "012345678901",
    "exam_date": "2026-10-15",
    "shift": "morning",
    "room_name": "Phòng A101",
    "room_location": "Tòa nhà A, Tầng 1",
    "seat_number": 5,
    "exam_type_name": "HSK Cấp 1"
  },
  "error": null,
  "meta": null
}
```

---

### 5.7. Đăng ký danh sách chờ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/exam-sessions/:id/waitlist` |
| **Auth** | 🔐 JWT |
| **Use-case** | Đăng ký nhận thông báo khi có ghế trống |

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body:** Không cần.

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "exam_session_id": 1,
    "joined_at": "2026-09-07T10:30:00+07:00"
  },
  "error": null,
  "meta": null
}
```

---

### 5.8. [Proctor] Điểm danh

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/proctor/exam-sessions/:id/attendance/:registration_id` |
| **Auth** | 🔐 JWT |
| **Use-case** | Giám thị đánh dấu thí sinh có mặt |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID ca thi |
| `registration_id` | `integer` | ID đăng ký |

**Request Body:** Không cần.

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Điểm danh thành công" },
  "error": null,
  "meta": null
}
```

---

### 5.9. [Admin] Thống kê ca thi (Dashboard)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/exam-sessions/:id/dashboard` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xem tổng quan nhanh về tình trạng ca thi |

**Path Params:** `id` — ID ca thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": 1,
    "capacity": 40,
    "booked": 25,
    "held": 3,
    "available": 12,
    "waitlist_count": 5,
    "attended_count": 20,
    "status": "open"
  },
  "error": null,
  "meta": null
}
```

---

### 5.10. [Admin] Báo cáo đối soát thanh toán

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments/reconcile` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Báo cáo đối soát thanh toán theo ngày |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày cần đối soát |

**Ví dụ:** `GET /api/v1/admin/payments/reconcile?date=2026-09-07`

**Response (200 OK):** Mảng `PaymentReconcileItemDTO`.

---

## 6. Module Payment (Thanh toán)

> **Cơ chế bảo vệ tích hợp (Idempotency & Zero-Trust):**
> Toàn bộ logic thanh toán được thực hiện trong **PostgreSQL Stored Procedure** (`fn_process_payos_webhook`), đảm bảo:
> - **Idempotent**: Webhook cùng `orderCode` bắn nhiều lần chỉ xử lý một lần duy nhất.
> - **Concurrency-safe**: Dùng `SELECT … FOR UPDATE` — chặn tuyệt đối giao dịch song song cho cùng 1 đơn hàng.
> - **Amount Guard**: Webhook có số tiền khác với số tiền đã tạo sẽ bị từ chối (trả về mã lỗi `-2`), không được confirm.
> - **Webhook Logging**: Mọi Webhook đều được ghi vào bảng `payment_webhook_logs` TRƯỚC khi xử lý logic, bảo đảm có thể truy vết kể cả khi bị tấn công DoS.

---

### 6.1. Tạo link thanh toán PayOS

| | |
|---|---|
| **Endpoint** | `POST /api/v1/payments/payos/create` |
| **Auth** | 🔐 JWT (Candidate) |
| **Use-case** | Thí sinh tạo link thanh toán qua PayOS cho phiếu đăng ký đang chờ (`pending_payment`). Số tiền được lấy từ `exam_session_fee` — thí sinh KHÔNG tự khai báo số tiền |

**Request Body:**

```json
{
  "exam_registration_id": 42,
  "return_url": "http://localhost:5173/dang-ky-thi?payment=success",
  "cancel_url": "http://localhost:5173/dang-ky-thi?payment=cancel"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_registration_id` | `integer` | ✅ | Min 1 | ID phiếu đăng ký thi |
| `return_url` | `string` | ✅ | URL hợp lệ | Link quay về khi thanh toán xong |
| `cancel_url` | `string` | ✅ | URL hợp lệ | Link quay về khi hủy thanh toán |

> **Lưu ý bảo mật:** Số tiền thanh toán (`amount`) được server tự động lấy từ `exam_session_fee` trong database — FE **KHÔNG** được truyền số tiền lên. Điều này ngăn chặn hoàn toàn việc hack giá.

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "payment_id": 101,
    "exam_registration_id": 42,
    "amount": 500000,
    "method": "payos",
    "status": "pending",
    "checkout_url": "https://pay.payos.vn/web/abc123",
    "transaction_ref": "101",
    "created_at": "2026-09-27T09:00:00+07:00"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `payment_id` | `integer` | ❌ | ID giao dịch |
| `exam_registration_id` | `integer` | ❌ | ID phiếu đăng ký |
| `amount` | `integer` | ❌ | Số tiền (VNĐ) — lấy từ phí của ca thi |
| `method` | `string` | ❌ | Luôn là `"payos"` |
| `status` | `string` | ❌ | `"pending"` khi mới tạo |
| `checkout_url` | `string` | ❌ | URL trang thanh toán PayOS — FE redirect user đến đây |
| `transaction_ref` | `string` | ❌ | Mã đơn hàng (dùng để đối soát) |
| `created_at` | `datetime` | ❌ | Thời điểm tạo giao dịch |

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | Body thiếu hoặc sai format |
| `404` | `"Không tìm thấy phiếu đăng ký"` | ID không tồn tại |
| `409` | `"Đã tồn tại giao dịch chờ thanh toán cho phiếu đăng ký này"` | Đã có payment `pending` → chuyển thẳng sang trang thanh toán cũ |
| `409` | `"Phiếu đăng ký đã được xác nhận thanh toán"` | Đã `confirmed` → không cần thanh toán lại |
| `409` | `"Không thể thanh toán cho phiếu đăng ký đã hủy"` | Phiếu đã `cancelled` |
| `500` | `"Tạo link thanh toán thất bại"` | Lỗi kết nối PayOS API |

---

### 6.2. Webhook PayOS (IPN Callback)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/payments/callback` |
| **Auth** | 🔓 Public (Xác thực bằng HMAC-SHA256 Signature trong payload) |
| **Use-case** | PayOS gọi về khi giao dịch hoàn thành. Endpoint luôn trả `200 OK` để tránh PayOS retry vô hạn |

**Request Body (do PayOS gửi):**

```json
{
  "code": "00",
  "success": true,
  "data": {
    "orderCode": 101,
    "amount": 500000,
    "reference": "REF_ABC",
    "accountNumber": "12345678",
    "transactionDateTime": "2026-09-27 09:05:00",
    "currency": "VND",
    "paymentLinkId": "LINK123",
    "code": "00",
    "desc": "success",
    "counterAccountBankId": "MB",
    "counterAccountBankName": "MBBank",
    "counterAccountName": "Nguyen Van A",
    "counterAccountNumber": "987654321",
    "virtualAccountName": "HSK Vinh",
    "virtualAccountNumber": "VN001"
  },
  "signature": "hmac_sha256_hex_string"
}
```

> **Cơ chế xử lý (Stored Procedure `fn_process_payos_webhook`):**
> 1. Luôn ghi log webhook vào `payment_webhook_logs` trước.
> 2. Kiểm tra `orderCode` → tìm payment tương ứng.
> 3. Nếu payment không phải `pending` → trả về `-1` (Idempotent, bỏ qua).
> 4. **So sánh số tiền** trong webhook vs số tiền đã lưu trong DB → nếu lệch trả về `-2` (Amount Mismatch Guard).
> 5. Nếu hợp lệ → cập nhật payment `success`/`failed` → cập nhật `exam_registrations.status = 'confirmed'` → đặt `exam_seats.status = 'booked'` trong một atomic transaction.

**Response (200 OK)** — Luôn là 200 dù thành công hay thất bại nội bộ:

```json
{ "message": "Webhook received" }
```

**Lỗi có thể xảy ra (HTTP):**

| HTTP Code | Nguyên nhân |
|---|---|
| `401` | Chữ ký HMAC-SHA256 không hợp lệ (có thể là tấn công giả mạo) |
| `400` | Số tiền webhook lệch với số tiền trong DB (`amount mismatch`) |

---

### 6.3. Lịch sử thanh toán của thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/payments?candidate_id=42` |
| **Auth** | 🔐 JWT |
| **Use-case** | Xem danh sách tất cả giao dịch thanh toán của một thí sinh |

**Query Params:**

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `candidate_id` | `integer` | ✅ | ID thí sinh (lấy từ profile) |

**Response (200 OK):** Mảng `PaymentResponseDTO`.

---

### 6.4. [Admin] Danh sách tất cả giao dịch (Phân trang)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin xem toàn bộ giao dịch, lọc theo trạng thái, phân trang |

**Query Params:**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | `integer` | `1` | Trang hiện tại |
| `limit` | `integer` | `20` | Số lượng mỗi trang (tối đa 100) |
| `status` | `string` | *(tất cả)* | Lọc: `pending`, `success`, `failed`, `refunded` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [ /* mảng AdminPaymentResponseDTO */ ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

---

### 6.5. [Admin] Xác nhận thanh toán thủ công

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/confirm` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin xác nhận thủ công cho các giao dịch chuyển khoản ngân hàng hoặc thanh toán ngoại tuyến (Bank Transfer / Cash). Chuyển trạng thái `pending → success` và tự động confirm đăng ký + đặt ghế |

**Path Params:** `id` — ID giao dịch

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` đã cập nhật.

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `404` | `"Không tìm thấy giao dịch"` | ID không tồn tại |
| `409` | `"Giao dịch không ở trạng thái chờ thanh toán"` | Giao dịch không phải `pending` |

---

### 6.6. [Admin] Hủy / Hoàn tiền giao dịch

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/cancel` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin hủy giao dịch. Logic chuyển trạng thái thông minh theo State Machine |

**Path Params:** `id` — ID giao dịch

**State Machine:**

| Trạng thái hiện tại | Kết quả sau Cancel |
|---|---|
| `pending` | → `failed` |
| `success` | → `refunded` |
| `failed` / `refunded` | ❌ Không thể hủy (409) |

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` đã cập nhật.

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `404` | `"Không tìm thấy giao dịch"` | ID không tồn tại |
| `409` | `"Không thể hủy giao dịch ở trạng thái này"` | Trạng thái không hợp lệ để hủy |

---

## 7. Module Result (Kết quả thi)

### 7.1. Xem điểm thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/results/:registration_id` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh tra cứu điểm thi |

**Path Params:** `registration_id` — ID đăng ký thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "exam_registration_id": 1,
    "listening_score": 85.5,
    "reading_score": 90.0,
    "writing_score": 78.0,
    "total_score": 253.5,
    "status": "pass",
    "published_at": "2026-11-01T08:00:00+07:00",
    "created_at": "2026-10-30T10:00:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (ExamResultResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID kết quả |
| `exam_registration_id` | `integer` | ❌ | ID đăng ký thi |
| `listening_score` | `number` | ✅ | Điểm nghe |
| `reading_score` | `number` | ✅ | Điểm đọc |
| `writing_score` | `number` | ✅ | Điểm viết |
| `total_score` | `number` | ✅ | Tổng điểm |
| `status` | `string` | ✅ | `pass` hoặc `fail` |
| `published_at` | `datetime` | ✅ | Thời điểm công bố |
| `created_at` | `datetime` | ❌ | Thời điểm tạo |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `404` | `"Chưa có kết quả thi"` | Điểm chưa được nhập |

---

### 7.2. Yêu cầu phúc khảo

| | |
|---|---|
| **Endpoint** | `POST /api/v1/rechecks` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh nộp đơn phúc khảo |

**Request Body:**

```json
{
  "exam_result_id": 1,
  "reason": "Tôi muốn phúc khảo bài thi nghe vì điểm quá thấp so với kỳ vọng"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_result_id` | `integer` | ✅ | Min 1 | ID kết quả thi |
| `reason` | `string` | ✅ | Tối thiểu 10 ký tự | Lý do phúc khảo |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "exam_result_id": 1,
    "reason": "Tôi muốn phúc khảo bài thi nghe...",
    "status": "submitted",
    "reviewed_at": null,
    "new_total_score": null,
    "created_at": "2026-11-05T10:00:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (RecheckResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID yêu cầu phúc khảo |
| `exam_result_id` | `integer` | ❌ | ID kết quả thi gốc |
| `reason` | `string` | ❌ | Lý do phúc khảo |
| `status` | `string` | ❌ | `submitted`, `in_review`, `completed`, `rejected` |
| `reviewed_at` | `datetime` | ✅ | Thời điểm hoàn tất phúc khảo |
| `new_total_score` | `number` | ✅ | Tổng điểm mới (nếu có thay đổi) |
| `created_at` | `datetime` | ❌ | Thời điểm nộp đơn |

---

### 7.3. [Admin] Nhập điểm

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/results` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin nhập điểm thi cho thí sinh |

**Request Body:**

```json
{
  "exam_registration_id": 1,
  "listening_score": 85.5,
  "reading_score": 90.0,
  "writing_score": 78.0,
  "total_score": 253.5,
  "status": "pass"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_registration_id` | `integer` | ✅ | Min 1 | ID đăng ký thi |
| `listening_score` | `number` | ❌ | 0 – 100 | Điểm nghe |
| `reading_score` | `number` | ❌ | 0 – 100 | Điểm đọc |
| `writing_score` | `number` | ❌ | 0 – 100 | Điểm viết |
| `total_score` | `number` | ❌ | Min 0 | Tổng điểm |
| `status` | `string` | ✅ | `pass` hoặc `fail` | Kết quả |

**Response (201 Created):** Trả về `ExamResultResponseDTO`.

---

## 8. Module Certificate (Chứng chỉ)

### 8.1. Danh sách chứng chỉ (của tôi)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/certificates` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xem danh sách chứng chỉ đã được cấp |

**Query Params (phân trang):**

| Param | Kiểu | Mô tả |
|---|---|---|
| `page` | `integer` | Trang (mặc định 1) |
| `limit` | `integer` | Số bản ghi/trang (mặc định 20) |

**Response (200 OK):** Mảng `CertificateResponseDTO` + `meta`.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "exam_result_id": 1,
      "certificate_no": "HSK1-2026-0001",
      "issue_date": "2026-11-15T00:00:00Z",
      "verification_code": "abc123xyz",
      "status": "issued",
      "created_at": "2026-11-15T08:00:00+07:00"
    }
  ],
  "error": null,
  "meta": { "page": 1, "per_page": 20, "total_items": 1, "total_pages": 1 }
}
```

**Response fields (CertificateResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID chứng chỉ |
| `exam_result_id` | `integer` | ❌ | ID kết quả thi |
| `certificate_no` | `string` | ❌ | Số chứng chỉ |
| `issue_date` | `datetime` | ❌ | Ngày cấp |
| `verification_code` | `string` | ❌ | Mã xác minh |
| `status` | `string` | ❌ | `issued` hoặc `revoked` |
| `created_at` | `datetime` | ❌ | Thời điểm tạo |

---

### 8.2. Chi tiết chứng chỉ (của tôi)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/certificates/:id` |
| **Auth** | 🔐 JWT |

---

### 8.3. Tải PDF chứng chỉ

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/certificates/:id/pdf` |
| **Auth** | 🔐 JWT |
| **Use-case** | Tải file PDF của chứng chỉ |

> ⚠️ **Lưu ý:** Tính năng đang được phát triển, hiện tại trả về thông báo.

---

### 8.4. Yêu cầu gửi chứng chỉ (Delivery)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/certificates/:id/deliveries` |
| **Auth** | 🔐 JWT |
| **Use-case** | Yêu cầu chuyển phát chứng chỉ bản cứng về nhà |

**Path Params:** `id` — ID chứng chỉ (`integer`)

**Request Body:**

```json
{
  "ward_id": 5,
  "address_detail": "123 Đường ABC, Phường XYZ, Quận 1",
  "courier": "ghn"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `ward_id` | `integer` | ❌ | Min 1 | ID xã/phường |
| `address_detail` | `string` | ✅ | Tối đa 255 ký tự | Địa chỉ chi tiết |
| `courier` | `string` | ❌ | Tối đa 50 ký tự | Đơn vị vận chuyển |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "certificate_id": 1,
    "ward_id": 5,
    "address_detail": "123 Đường ABC, Phường XYZ, Quận 1",
    "courier": "ghn",
    "tracking_no": null,
    "status": "requested",
    "created_at": "2026-11-20T10:00:00+07:00",
    "updated_at": "2026-11-20T10:00:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (DeliveryResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID đơn giao hàng |
| `certificate_id` | `integer` | ❌ | ID chứng chỉ |
| `ward_id` | `integer` | ✅ | ID xã/phường |
| `address_detail` | `string` | ❌ | Địa chỉ chi tiết |
| `courier` | `string` | ✅ | Đơn vị vận chuyển |
| `tracking_no` | `string` | ✅ | Mã vận đơn |
| `status` | `string` | ❌ | `requested`, `shipped`, `delivered`, `failed` |
| `created_at` | `datetime` | ❌ | Thời điểm tạo |
| `updated_at` | `datetime` | ❌ | Thời điểm cập nhật |

---

### 8.5. Xem trạng thái giao hàng

| | |
|---|---|
| **Endpoint** | `GET /api/v1/me/certificates/:id/deliveries` |
| **Auth** | 🔐 JWT |

**Path Params:** `id` — ID chứng chỉ (`integer`)

**Response (200 OK):** Trả về `DeliveryResponseDTO`.

---

### 8.6. Cập nhật địa chỉ giao hàng

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/me/deliveries/:delivery_id` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh sửa địa chỉ nhận chứng chỉ (chỉ khi trạng thái = `requested`) |

**Path Params:** `delivery_id` — ID đơn giao hàng (`integer`)

**Request Body:**

```json
{
  "ward_id": 10,
  "address_detail": "456 Đường DEF, Phường ABC"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `ward_id` | `integer` | ❌ | Min 1 | ID xã/phường mới |
| `address_detail` | `string` | ✅ | Tối đa 255 ký tự | Địa chỉ mới |

---

### 8.7. Yêu cầu cấp lại chứng chỉ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/certificates/:id/reissue-request` |
| **Auth** | 🔐 JWT |
| **Use-case** | Thí sinh xin cấp lại chứng chỉ (mất/hỏng) |

**Path Params:** `id` — ID chứng chỉ (`integer`)

**Request Body:** Không cần.

---

### 8.8. Xác minh chứng chỉ (Công khai)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/public/certificates/verify` |
| **Auth** | 🔓 Public |
| **Use-case** | Tra cứu/xác minh tính hợp lệ của chứng chỉ |

**Query Params (một trong hai cách):**

**Cách 1 — Theo mã xác thực:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `code` | `string` | Mã xác thực (verification_code) |

**Cách 2 — Theo số chứng chỉ + ngày sinh:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `certificate_no` | `string` | Số chứng chỉ |
| `dob` | `string` | Ngày sinh, format: `YYYY-MM-DD` |

**Ví dụ:**
- `GET /api/v1/public/certificates/verify?code=abc123xyz`
- `GET /api/v1/public/certificates/verify?certificate_no=HSK1-2026-0001&dob=2000-05-15`

> **⚠️ Lưu ý:** Phải cung cấp `code` HOẶC cả `certificate_no` + `dob`. Nếu không, trả lỗi 400.

---

### 8.9. [Admin] Cấp chứng chỉ đơn lẻ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/certificates/:id/issue` |
| **Auth** | 🔐 JWT + Admin |

**Request Body:**

```json
{
  "exam_result_id": 1,
  "certificate_no": "HSK1-2026-0001",
  "issue_date": "2026-11-15",
  "verification_code": "abc123xyz"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_result_id` | `integer` | ✅ | Min 1 | ID kết quả thi |
| `certificate_no` | `string` | ✅ | Tối đa 30 ký tự | Số chứng chỉ |
| `issue_date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày cấp |
| `verification_code` | `string` | ✅ | Tối đa 64 ký tự | Mã xác minh |

---

### 8.10. [Admin] Cấp chứng chỉ hàng loạt

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/certificates/issue-batch` |
| **Auth** | 🔐 JWT + Admin |

**Request Body:**

```json
{
  "exam_session_id": 1,
  "issue_date": "2026-11-15"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_session_id` | `integer` | ✅ | Min 1 | ID ca thi |
| `issue_date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày cấp |

**Response (201 Created):**

```json
{
  "success": true,
  "data": { "issued_count": 25 },
  "error": null,
  "meta": null
}
```

---

### 8.11. [Admin] Thu hồi chứng chỉ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/certificates/:id/revoke` |
| **Auth** | 🔐 JWT + Admin |

**Path Params:** `id` — ID chứng chỉ (`integer`)

**Request Body:**

```json
{
  "reason": "Phát hiện gian lận trong kỳ thi"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `reason` | `string` | ✅ | Tối đa 500 ký tự | Lý do thu hồi |

---

### 8.12. [Admin] Danh sách chứng chỉ

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/certificates` |
| **Auth** | 🔐 JWT + Admin |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_session_id` | `integer` | ❌ | Min 1 | Lọc theo ca thi |
| `status` | `string` | ❌ | `issued`, `revoked` | Lọc theo trạng thái |
| `from` | `string` | ❌ | Format: `YYYY-MM-DD` | Từ ngày |
| `to` | `string` | ❌ | Format: `YYYY-MM-DD` | Đến ngày |
| `page` | `integer` | ❌ | Min 1, mặc định 1 | Trang |
| `limit` | `integer` | ❌ | Min 1, max 100, mặc định 20 | Số bản ghi/trang |

---

### 8.13. [Admin] Danh sách vận đơn

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/deliveries` |
| **Auth** | 🔐 JWT + Admin |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `status` | `string` | ❌ | `requested`, `shipped`, `delivered`, `failed` | Lọc theo trạng thái |
| `page` | `integer` | ❌ | Min 1, mặc định 1 | Trang |
| `limit` | `integer` | ❌ | Min 1, max 100, mặc định 20 | Số bản ghi/trang |

---

### 8.14. [Admin] Cập nhật vận đơn

| | |
|---|---|
| **Endpoint** | `PATCH /api/v1/admin/deliveries/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin gán mã vận đơn và đơn vị vận chuyển |

**Path Params:** `id` — ID đơn giao hàng (`integer`)

**Request Body:**

```json
{
  "courier": "ghn",
  "tracking_no": "GHN2026090700001"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `courier` | `string` | ✅ | Tối đa 50 ký tự | Đơn vị vận chuyển |
| `tracking_no` | `string` | ✅ | Tối đa 50 ký tự | Mã vận đơn |

---

### 8.15. Webhook Giao hàng

| | |
|---|---|
| **Endpoint** | `POST /api/v1/webhooks/shipping/:courier` |
| **Auth** | HMAC Signature (header `X-Signature`) |
| **Use-case** | Đơn vị vận chuyển gửi cập nhật trạng thái |

**Path Params:** `courier` — Mã đơn vị vận chuyển (ví dụ: `ghn`)

**Request Body:**

```json
{
  "tracking_no": "GHN2026090700001",
  "status": "delivered",
  "courier_ref": "REF123"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `tracking_no` | `string` | ✅ | Không rỗng | Mã vận đơn |
| `status` | `string` | ✅ | `shipped`, `delivered`, `failed` | Trạng thái mới |
| `courier_ref` | `string` | ❌ | Tối đa 100 ký tự | Mã tham chiếu nội bộ của hãng vận chuyển |

---

## 9. Module Notification (Thông báo)

### 9.1. Danh sách thông báo

| | |
|---|---|
| **Endpoint** | `GET /api/v1/notifications` |
| **Auth** | 🔐 JWT |
| **Use-case** | Lấy danh sách thông báo hệ thống của người dùng |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account_id": 42,
      "channel": "push",
      "content": "Bạn đã đăng ký thi HSK 1 thành công",
      "status": "pending",
      "created_at": "2026-09-07T10:30:00+07:00"
    }
  ],
  "error": null,
  "meta": null
}
```

**Response fields (NotificationResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID thông báo |
| `account_id` | `integer` | ❌ | ID tài khoản |
| `channel` | `string` | ❌ | `email`, `sms`, `zalo`, `push` |
| `content` | `string` | ❌ | Nội dung thông báo |
| `status` | `string` | ❌ | `pending`, `sent`, `failed` |
| `created_at` | `datetime` | ❌ | Thời điểm tạo |

---

### 9.2. Đánh dấu đã đọc

| | |
|---|---|
| **Endpoint** | `PUT /api/v1/notifications/:id/read` |
| **Auth** | 🔐 JWT |
| **Use-case** | Đánh dấu thông báo đã đọc |

**Path Params:** `id` — ID thông báo (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Đã đánh dấu thông báo là đã đọc" },
  "error": null,
  "meta": null
}
```

---

## 10. Module Location (Địa điểm)

### 10.1. Danh sách Tỉnh/Thành phố

| | |
|---|---|
| **Endpoint** | `GET /api/v1/locations/provinces` |
| **Auth** | 🔓 Public |
| **Use-case** | Lấy danh sách tỉnh/thành phố (dùng cho dropdown) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "01",
      "name": "Thành phố Hà Nội"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 10.2. Danh sách Xã/Phường theo Tỉnh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/locations/provinces/:id/wards` |
| **Auth** | 🔓 Public |
| **Use-case** | Lấy danh sách xã/phường thuộc tỉnh (cascade dropdown) |

**Path Params:** `id` — ID tỉnh/thành phố (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "province_id": 1,
      "code": "00001",
      "name": "Phường Phúc Xá",
      "type": "phường"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 10.3. Kiểm tra tuyến giao hàng

| | |
|---|---|
| **Endpoint** | `GET /api/v1/locations/wards/:id/delivery-coverage` |
| **Auth** | 🔓 Public |
| **Use-case** | Kiểm tra đơn vị vận chuyển nào hỗ trợ giao hàng đến xã/phường |

**Path Params:** `id` — ID xã/phường (`integer`)

**Query Params (tùy chọn):**

| Param | Kiểu | Mô tả |
|---|---|---|
| `courier` | `string` | Lọc theo đơn vị vận chuyển cụ thể: `ghn`, `ghtk` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "ward_id": 5,
    "ward_name": "Phường Phúc Xá",
    "coverage": {
      "ghn": true,
      "ghtk": false
    }
  },
  "error": null,
  "meta": null
}
```

---

### 10.4. [Admin] Thống kê thí sinh theo Tỉnh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/locations/stats/candidates-by-province` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Thống kê số lượng thí sinh phân bố theo khu vực |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "province_id": 1,
      "province_code": "01",
      "province_name": "Thành phố Hà Nội",
      "total": 150
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 10.5. [Admin] Gộp Xã/Phường

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/locations/wards/:id/merge` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Gộp xã/phường bị chia tách/sáp nhập hành chính |

**Path Params:** `id` — ID xã/phường nguồn (bị gộp) (`integer`)

**Request Body:**

```json
{
  "target_ward_id": 10,
  "reason": "Sáp nhập xã theo nghị định mới"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `target_ward_id` | `integer` | ✅ | Min 1 | ID xã/phường đích (được giữ lại) |
| `reason` | `string` | ✅ | Min 5, max 500 ký tự | Lý do gộp |

---

## 11. Module Audit (Nhật ký hệ thống)

### 11.1. [Admin] Tra cứu nhật ký

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/audit-logs` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Tra cứu lịch sử hoạt động trên hệ thống |

**Query Params (tất cả tùy chọn):**

| Param | Kiểu | Validate | Mô tả |
|---|---|---|---|
| `actor_id` | `integer` | — | Lọc theo người thực hiện |
| `action` | `string` | Xem bảng Action bên dưới | Lọc theo loại hành động |
| `entity_table` | `string` | Xem bảng Entity bên dưới | Lọc theo bảng dữ liệu |
| `entity_id` | `integer` | — | Lọc theo ID bản ghi |
| `from` | `string` | Format: `YYYY-MM-DD` | Từ ngày |
| `to` | `string` | Format: `YYYY-MM-DD` | Đến ngày |
| `page` | `integer` | Min 1, mặc định 1 | Trang |
| `limit` | `integer` | Min 1, mặc định 20 | Số bản ghi/trang |

**Giá trị `action` hợp lệ:**

`CREATE`, `UPDATE`, `DELETE`, `SOFT_DELETE`, `RESTORE`, `LOGIN`, `LOGOUT`, `PASSWORD_CHANGE`, `PAYMENT`, `REFUND`, `EXPORT`, `APPROVE`, `REJECT`, `RECHECK`

**Giá trị `entity_table` hợp lệ:**

`accounts`, `candidates`, `candidate_documents`, `exam_rooms`, `exam_sessions`, `exam_seats`, `exam_registrations`, `payments`, `exam_results`, `exam_recheck_requests`, `certificates`, `certificate_deliveries`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "actor_id": 1,
      "action": "CREATE",
      "entity_table": "exam_registrations",
      "entity_id": 42,
      "old_value": null,
      "new_value": { "status": "pending_payment" },
      "created_at": "2026-09-07T10:30:00+07:00"
    }
  ],
  "error": null,
  "meta": { "page": 1, "per_page": 20, "total_items": 100, "total_pages": 5 }
}
```

**Response fields (AuditLogResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID log |
| `actor_id` | `integer` | ✅ | ID người thực hiện |
| `action` | `string` | ❌ | Hành động |
| `entity_table` | `string` | ❌ | Bảng dữ liệu bị ảnh hưởng |
| `entity_id` | `integer` | ❌ | ID bản ghi bị ảnh hưởng |
| `old_value` | `object` | ✅ | Giá trị cũ (JSON tùy ý) |
| `new_value` | `object` | ✅ | Giá trị mới (JSON tùy ý) |
| `created_at` | `datetime` | ❌ | Thời điểm ghi log |

---

## 12. Bảng Enum tham chiếu

### 12.1. Account Status

| Giá trị | Mô tả |
|---|---|
| `active` | Tài khoản hoạt động bình thường |
| `locked` | Tài khoản bị khóa |
| `pending` | Tài khoản chờ kích hoạt |

### 12.2. Candidate Gender

| Giá trị | Mô tả |
|---|---|
| `male` | Nam |
| `female` | Nữ |
| `other` | Khác |

### 12.3. Document Type

| Giá trị | Mô tả |
|---|---|
| `cccd` | Căn cước công dân |
| `passport` | Hộ chiếu |

### 12.4. Document Verification Status

| Giá trị | Mô tả |
|---|---|
| `pending` | Chờ duyệt |
| `verified` | Đã duyệt |
| `rejected` | Bị từ chối |

### 12.5. Exam Shift

| Giá trị | Mô tả |
|---|---|
| `morning` | Ca sáng |
| `afternoon` | Ca chiều |
| `evening` | Ca tối |

### 12.6. Exam Session Status

| Giá trị | Mô tả |
|---|---|
| `open` | Đang mở đăng ký |
| `closed` | Đã đóng đăng ký |
| `cancelled` | Đã hủy |

### 12.7. Exam Seat Status

| Giá trị | Mô tả |
|---|---|
| `available` | Còn trống |
| `held` | Đang giữ chỗ (15 phút) |
| `booked` | Đã đặt (đã thanh toán) |

### 12.8. Exam Registration Status

| Giá trị | Mô tả |
|---|---|
| `pending_payment` | Chờ thanh toán (ghế đang giữ) |
| `confirmed` | Đã xác nhận (đã thanh toán) |
| `cancelled` | Đã hủy |

### 12.9. Payment Method

| Giá trị | Mô tả |
|---|---|
| `vnpay` | VNPay |
| `momo` | Momo |
| `zalopay` | ZaloPay |
| `bank_transfer` | Chuyển khoản ngân hàng |
| `cash` | Tiền mặt |

### 12.10. Payment Status

| Giá trị | Mô tả |
|---|---|
| `pending` | Chờ xử lý |
| `success` | Thành công |
| `failed` | Thất bại |
| `refunded` | Đã hoàn tiền |

### 12.11. Exam Result Status

| Giá trị | Mô tả |
|---|---|
| `pass` | Đạt |
| `fail` | Không đạt |

### 12.12. Recheck Status

| Giá trị | Mô tả |
|---|---|
| `submitted` | Đã nộp đơn |
| `in_review` | Đang xem xét |
| `completed` | Đã hoàn tất |
| `rejected` | Bị từ chối |

### 12.13. Certificate Status

| Giá trị | Mô tả |
|---|---|
| `issued` | Đã cấp |
| `revoked` | Đã thu hồi |

### 12.14. Delivery Status

| Giá trị | Mô tả |
|---|---|
| `requested` | Đã yêu cầu |
| `shipped` | Đang giao |
| `delivered` | Đã giao thành công |
| `failed` | Giao thất bại |

### 12.15. Notification Channel

| Giá trị | Mô tả |
|---|---|
| `email` | Email |
| `sms` | Tin nhắn SMS |
| `zalo` | Zalo OA |
| `push` | Push notification |

### 12.16. Notification Status

| Giá trị | Mô tả |
|---|---|
| `pending` | Chờ gửi |
| `sent` | Đã gửi / Đã đọc |
| `failed` | Gửi thất bại |

---

## 13. State Machines (Luồng trạng thái)

### 13.1. Đăng ký thi (Registration)

```
        ┌─────────────┐
        │   (new)      │
        └──────┬───────┘
               ▼
     ┌─────────────────┐
     │ pending_payment  │ ── ghế giữ 15 phút ──┐
     └────────┬────────┘                        │
              │                                 │
    ┌─────────┴──────────┐           ┌──────────▼──────────┐
    │ confirmed          │           │ cancelled            │
    │ (đã thanh toán)    │           │ (hủy / hết hạn giữ) │
    └────────────────────┘           └─────────────────────┘
           TERMINAL                          TERMINAL
```

- `pending_payment` → `confirmed`: Khi thanh toán thành công
- `pending_payment` → `cancelled`: Khi hủy hoặc hết hạn giữ ghế
- `confirmed` → TERMINAL (không thể hủy sau khi đã xác nhận)
- `cancelled` → TERMINAL (không thể xác nhận lại)

### 13.2. Thanh toán (Payment)

```
     ┌─────────┐
     │ pending  │
     └────┬────┘
          │
    ┌─────┼─────────┐
    ▼     ▼         ▼
 success failed  refunded
```

- `pending` → `success`: Trigger tự động chuyển đăng ký → `confirmed`
- `pending` → `failed`: Thanh toán thất bại
- `pending` → `refunded`: Hoàn tiền
- **Chỉ `pending` mới có thể chuyển trạng thái**

### 13.3. Ghế thi (Seat)

```
  available ←──────── held (15 min timeout)
      │                 │
      │                 ▼
      │              booked
      │                 │
      └─────────────────┘ (khi hủy đăng ký)
```

- `available` → `held`: Khi thí sinh đăng ký giữ chỗ
- `held` → `booked`: Khi thanh toán thành công
- `held` → `available`: Khi hủy hoặc hết hạn 15 phút
- `booked` → `available`: Khi hủy đăng ký đã xác nhận

---

## Tổng hợp Endpoint nhanh

| # | Method | Path | Auth | Module |
|---|---|---|---|---|
| 1 | `POST` | `/auth/register` | 🔓 | Auth |
| 2 | `POST` | `/auth/login` | 🔓 | Auth |
| 3 | `POST` | `/auth/refresh` | 🔓 | Auth |
| 4 | `POST` | `/auth/force-password-change` | 🔓 | Auth |
| 5 | `POST` | `/auth/logout` | 🔐 | Auth |
| 6 | `POST` | `/auth/logout-all` | 🔐 | Auth |
| 7 | `GET` | `/me` | 🔐 | Auth |
| 8 | `PUT` | `/me` | 🔐 | Auth |
| 9 | `DELETE` | `/me` | 🔐 | Auth |
| 10 | `PATCH` | `/me/password` | 🔐 | Auth |
| 11 | `GET` | `/me/sessions` | 🔐 | Auth |
| 12 | `DELETE` | `/me/sessions/:id` | 🔐 | Auth |
| 13 | `DELETE` | `/admin/delete-account/:id` | 🔐👑 | Auth |
| 14 | `POST` | `/admin/staff-accounts` | 🔐👑 | Auth |
| 15 | `POST` | `/me/candidate-profile` | 🔐 | Candidate |
| 16 | `GET` | `/me/candidate-profile` | 🔐 | Candidate |
| 17 | `PATCH` | `/me/candidate-profile` | 🔐 | Candidate |
| 18 | `POST` | `/me/candidate-profile/documents` | 🔐 | Candidate |
| 19 | `GET` | `/me/candidate-profile/documents` | 🔐 | Candidate |
| 20 | `GET` | `/me/candidate-profile/upload-signature` | 🔐 | Candidate |
| 21 | `GET` | `/admin/candidates` | 🔐👑 | Candidate |
| 22 | `GET` | `/admin/candidates/metrics` | 🔐👑 | Candidate |
| 23 | `GET` | `/admin/candidates/export` | 🔐👑 | Candidate |
| 24 | `GET` | `/admin/candidates/duplicates` | 🔐👑 | Candidate |
| 25 | `GET` | `/admin/candidates/:id` | 🔐👑 | Candidate |
| 26 | `POST` | `/admin/candidates/:id/approve` | 🔐👑 | Candidate |
| 27 | `POST` | `/admin/candidates/:id/reject` | 🔐👑 | Candidate |
| 26 | `GET` | `/admin/exam-sessions/:id/roster` | 🔐👑 | Candidate |
| 27 | `GET` | `/exam-types` | 🔓 | Exam |
| 28 | `GET` | `/exam-sessions` | 🔓 | Exam |
| 29 | `GET` | `/exam-sessions/:id` | 🔓 | Exam |
| 30 | `GET` | `/exam-sessions/:id/seats` | 🔓 | Exam |
| 31 | `GET` | `/admin/exam-sessions` | 🔐👑 | Exam |
| 32 | `POST` | `/admin/exam-sessions/batch-create` | 🔐👑 | Exam |
| 33 | `POST` | `/admin/exam-sessions/:id/seats/generate` | 🔐👑 | Exam |
| 34 | `POST` | `/admin/exam-sessions/:id/cancel` | 🔐👑 | Exam |
| 34 | `POST` | `/me/registrations` | 🔐 | Registration |
| 35 | `GET` | `/me/registrations` | 🔐 | Registration |
| 36 | `POST` | `/me/registrations/:id/payment-confirm` | 🔐 | Registration |
| 37 | `POST` | `/me/registrations/:id/transfer` | 🔐 | Registration |
| 38 | `POST` | `/me/registrations/:id/cancel` | 🔐 | Registration |
| 39 | `GET` | `/me/registrations/:id/admission-slip` | 🔐 | Registration |
| 40 | `POST` | `/me/exam-sessions/:id/waitlist` | 🔐 | Registration |
| 41 | `PATCH` | `/proctor/exam-sessions/:id/attendance/:registration_id` | 🔐 | Registration |
| 42 | `GET` | `/admin/exam-sessions/:id/dashboard` | 🔐👑 | Registration |
| 43 | `GET` | `/admin/payments/reconcile` | 🔐👑 | Registration |
| 44 | `POST` | `/payments` | 🔐 | Payment |
| 45 | `POST` | `/payments/callback` | 🔐 | Payment |
| 46 | `GET` | `/payments` | 🔐 | Payment |
| 47 | `GET` | `/results/:registration_id` | 🔐 | Result |
| 48 | `POST` | `/rechecks` | 🔐 | Result |
| 49 | `POST` | `/admin/results` | 🔐👑 | Result |
| 50 | `GET` | `/me/certificates` | 🔐 | Certificate |
| 51 | `GET` | `/me/certificates/:id` | 🔐 | Certificate |
| 52 | `GET` | `/me/certificates/:id/pdf` | 🔐 | Certificate |
| 53 | `POST` | `/me/certificates/:id/deliveries` | 🔐 | Certificate |
| 54 | `GET` | `/me/certificates/:id/deliveries` | 🔐 | Certificate |
| 55 | `POST` | `/me/certificates/:id/reissue-request` | 🔐 | Certificate |
| 56 | `PATCH` | `/me/deliveries/:delivery_id` | 🔐 | Certificate |
| 57 | `GET` | `/public/certificates/verify` | 🔓 | Certificate |
| 58 | `POST` | `/admin/certificates/:id/issue` | 🔐👑 | Certificate |
| 59 | `POST` | `/admin/certificates/issue-batch` | 🔐👑 | Certificate |
| 60 | `POST` | `/admin/certificates/:id/revoke` | 🔐👑 | Certificate |
| 61 | `GET` | `/admin/certificates` | 🔐👑 | Certificate |
| 62 | `GET` | `/admin/certificates/print-batch` | 🔐👑 | Certificate |
| 63 | `GET` | `/admin/deliveries` | 🔐👑 | Certificate |
| 64 | `PATCH` | `/admin/deliveries/:id` | 🔐👑 | Certificate |
| 65 | `POST` | `/webhooks/shipping/:courier` | HMAC | Certificate |
| 66 | `GET` | `/notifications` | 🔐 | Notification |
| 67 | `PUT` | `/notifications/:id/read` | 🔐 | Notification |
| 68 | `GET` | `/locations/provinces` | 🔓 | Location |
| 69 | `GET` | `/locations/provinces/:id/wards` | 🔓 | Location |
| 70 | `GET` | `/locations/wards/:id/delivery-coverage` | 🔓 | Location |
| 71 | `GET` | `/admin/locations/stats/candidates-by-province` | 🔐👑 | Location |
| 72 | `POST` | `/admin/locations/wards/:id/merge` | 🔐👑 | Location |
| 73 | `GET` | `/admin/audit-logs` | 🔐👑 | Audit |

> **Chú thích:** 🔓 = Public | 🔐 = JWT | 🔐👑 = JWT + Admin | HMAC = Webhook signature

---

*Tài liệu này được tạo tự động từ mã nguồn backend. Mọi thắc mắc liên hệ team Backend.*

---

## 14. WebSocket Real-time Events

Hệ thống hỗ trợ kết nối WebSocket để nhận các sự kiện real-time (cập nhật ghế, đăng ký, thanh toán…) mà **không cần reload trang**.

### 14.1. Kết nối WebSocket

| Thuộc tính | Giá trị |
|---|---|
| **URL** | `ws://<host>:<port>/ws?token=<jwt_access_token>` |
| **Protocol** | WebSocket (RFC 6455) |
| **Authentication** | JWT Access Token truyền qua **query parameter** `token` |
| **Heartbeat** | Server gửi `ping` mỗi 54 giây, client cần trả `pong` |

#### Ví dụ kết nối (JavaScript):

```javascript
// Kết nối WebSocket
const token = localStorage.getItem("access_token");
const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);

ws.onopen = () => {
  console.log("[WS] Connected");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("[WS] Event:", data);

  switch (data.type) {
    case "seats_released":
      // Reload danh sách ca thi để cập nhật số ghế
      refetchSessions();
      break;
    case "registration_created":
      // Cập nhật số ghế còn lại của session tương ứng
      updateSlotCount(data.payload.session_id, -1);
      break;
    case "registration_cancelled":
      // Cập nhật ghế được nhả
      updateSlotCount(data.payload.session_id, +1);
      break;
    case "payment_confirmed":
      // Cập nhật trạng thái đăng ký
      updateRegistrationStatus(data.payload.registration_id, "confirmed");
      break;
  }
};

ws.onclose = (event) => {
  console.log("[WS] Disconnected, reconnecting...");
  // Implement reconnect logic (e.g. exponential backoff)
};
```

### 14.2. Event Types (Loại sự kiện)

Mỗi message nhận được qua WebSocket có cấu trúc JSON:

```json
{
  "type": "<event_type>",
  "payload": { ... },
  "timestamp": "2026-10-01T08:30:00Z"
}
```

| Event Type | Mô tả | Payload |
|---|---|---|
| `registration_created` | Có thí sinh vừa đăng ký (giữ) 1 ghế | `{ registration_id, session_id, seat_id, status }` |
| `registration_cancelled` | Đơn đăng ký bị hủy (thí sinh hủy tay hoặc hết hạn 15 phút) | `{ registration_id, seat_id, status }` |
| `payment_confirmed` | Thanh toán thành công → ghế được chốt (booked) | `{ registration_id, seat_id, status }` |
| `seats_released` | CronJob vừa giải phóng ghế quá hạn 15 phút | `{ released_count, message }` |
| `seat_updated` | Ghế thay đổi trạng thái (reserved) | `{ session_id, seat_id, new_status }` |
| `account_updated` | Thông tin tài khoản (profile/password) vừa được cập nhật | `{ account_id }` |

### 14.3. Cơ chế CronJob tự động giải phóng ghế

- **Tần suất:** Mỗi **60 giây**, hệ thống tự động quét database.
- **Logic:** Tất cả ghế có trạng thái `held` mà `exam_seat_held_until < NOW()` sẽ được:
  1. Đặt lại thành `available` (ghế trống)
  2. Đơn đăng ký tương ứng chuyển thành `cancelled`
  3. Phát sự kiện WebSocket `seats_released` để FE cập nhật UI ngay lập tức
- **Kết quả:** Thí sinh không thanh toán trong 15 phút → ghế tự động được nhả cho người khác đăng ký.

### 14.4. Xử lý reconnect phía Frontend

WebSocket có thể bị ngắt do mạng không ổn định. Frontend cần implement **auto-reconnect** với exponential backoff:

```javascript
function connectWS(token, onMessage) {
  let retryCount = 0;
  const maxRetries = 10;

  function connect() {
    const ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);

    ws.onopen = () => {
      console.log("[WS] Connected");
      retryCount = 0; // Reset retry counter on success
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.log(`[WS] Reconnecting in ${delay}ms...`);
        setTimeout(connect, delay);
        retryCount++;
      }
    };

    return ws;
  }

  return connect();
}
```

### 14.5. Lưu ý quan trọng

- **Không gửi dữ liệu lên WS:** Đây là kênh **broadcast một chiều** (server → client). Client chỉ nhận, không gửi.
- **Dùng `make db-build` thay vì `make db-rs`:** Để tránh mất dữ liệu khi build lại code, luôn dùng `make db-build` (chỉ rebuild API image, giữ nguyên DB volume).
- **Token hết hạn:** Nếu JWT token hết hạn, server sẽ từ chối kết nối WS. Frontend cần refresh token trước khi reconnect.

---

## 15. Module Dashboard (Bảng điều khiển quản trị)

> **Toàn bộ API trong module này yêu cầu:** 🔐 JWT + Admin (`role = admin`)
>
> **Prefix chung:** `/api/v1/admin/...`
>
> `GET /api/v1/admin/metrics/overview` là chức năng tổng quan thuộc cùng module/tag `Dashboard`, không phải module riêng.

### 15.1. Lấy chỉ số tổng quan (Top Metrics)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/metrics/overview` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Hiển thị 4 KPI chính ở phần trên cùng của Dashboard |
| **Chế độ** | ⚡ **Real-time 100%** (Không cache, query trực tiếp PostgreSQL tối ưu index) |

**Request:** Không cần body/query.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "total_revenue": 15000000,
    "total_registrations": 150,
    "fill_rate": 85.5,
    "payment_success_rate": 92.3
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `total_revenue` | `integer` | Tổng doanh thu (VNĐ) từ các giao dịch thành công của đợt thi đang mở |
| `total_registrations` | `integer` | Tổng số hồ sơ đăng ký dự thi (mọi trạng thái) |
| `fill_rate` | `float` | Tỷ lệ lấp đầy ghế (%) = ghế đã booked / tổng ghế |
| `payment_success_rate` | `float` | Tỷ lệ thanh toán thành công (%) = success / tổng payment |

---

### 15.2. Biểu đồ doanh thu theo ngày (Revenue Chart)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/metrics/revenue-chart` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Vẽ biểu đồ đường doanh thu & lượng đăng ký theo ngày |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `range` | `string` | ✅ | `7days` hoặc `30days` | Khoảng thời gian hiển thị |

**Request ví dụ:** `GET /api/v1/admin/metrics/revenue-chart?range=7days`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-09-27",
      "revenue": 2500000,
      "registrations": 25
    },
    {
      "date": "2026-09-28",
      "revenue": 3200000,
      "registrations": 32
    }
  ],
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `date` | `string` | Ngày (format `YYYY-MM-DD`) |
| `revenue` | `integer` | Doanh thu trong ngày (VNĐ) |
| `registrations` | `integer` | Số đơn đăng ký mới trong ngày |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Tham số range là bắt buộc (7days hoặc 30days)"` | Thiếu query param `range` |
| `400` | `"Tham số range không hợp lệ, chỉ chấp nhận 7days hoặc 30days"` | `range` không phải `7days` hoặc `30days` |

---

### 15.3. Phân bố cấp độ HSK (Pie Chart)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/metrics/hsk-distribution` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Vẽ biểu đồ tròn tỷ lệ thí sinh theo từng cấp độ HSK |

**Request:** Không cần body/query.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "level": "HSK 1", "count": 45 },
    { "level": "HSK 2", "count": 38 },
    { "level": "HSK 3", "count": 30 },
    { "level": "HSK 4", "count": 22 },
    { "level": "HSK 5", "count": 10 },
    { "level": "HSK 6", "count": 5 }
  ],
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `level` | `string` | Tên cấp độ HSK (lấy từ `exam_type_name`) |
| `count` | `integer` | Số thí sinh đã confirmed ở cấp độ này |

> **Lưu ý:** Chỉ đếm các đơn đăng ký có trạng thái `confirmed`.

---

### 15.4. Phễu thanh toán trong ngày (Payment Funnel)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/metrics/payment-funnel` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Phân tích lưu lượng giao dịch theo giờ trong ngày hôm nay (dùng cho biểu đồ cột/thanh) |

**Request:** Không cần body/query.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    { "hour": 8,  "success": 12, "holding": 3, "cancelled": 1 },
    { "hour": 9,  "success": 18, "holding": 5, "cancelled": 2 },
    { "hour": 10, "success": 25, "holding": 8, "cancelled": 3 }
  ],
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `hour` | `integer` | Khung giờ trong ngày (0–23) |
| `success` | `integer` | Số giao dịch thành công |
| `holding` | `integer` | Số giao dịch đang chờ |
| `cancelled` | `integer` | Số giao dịch thất bại / hết hạn |

---

### 15.5. Giám sát ca thi trực tiếp (Live Session Status)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/sessions/live-status` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Bảng real-time hiển thị trạng thái ghế của từng ca thi đang mở |

**Request:** Không cần body/query.

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "session_id": 1,
      "exam_type_name": "HSK 3",
      "exam_type_code": "hsk3",
      "room_name": "Phòng A101",
      "session_date": "2026-10-15",
      "shift": "morning",
      "total_seats": 30,
      "locked_seats": 22,
      "holding_seats": 3,
      "available_seats": 5
    }
  ],
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `session_id` | `integer` | ID ca thi |
| `exam_type_name` | `string` | Tên loại đề thi (ví dụ: "HSK 3") |
| `exam_type_code` | `string` | Mã loại đề thi (ví dụ: "hsk3") |
| `room_name` | `string` | Tên phòng thi |
| `session_date` | `string` | Ngày thi (format `YYYY-MM-DD`) |
| `shift` | `string` | Ca thi: `morning`, `afternoon`, `evening` |
| `total_seats` | `integer` | Tổng số ghế |
| `locked_seats` | `integer` | Số ghế đã chốt (booked) |
| `holding_seats` | `integer` | Số ghế đang bị giữ tạm (held, chờ thanh toán) |
| `available_seats` | `integer` | Số ghế còn trống |

> **Lưu ý:** Chỉ trả về các ca thi có trạng thái `open` (đang mở đăng ký).

---

### 15.6. Danh sách giao dịch ngoại lệ (Transaction Exceptions)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/transactions/exceptions` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xem các giao dịch có vấn đề cần Admin xử lý thủ công |

**Query Params:**

| Param | Kiểu | Bắt buộc | Default | Validate | Mô tả |
|---|---|---|---|---|---|
| `page` | `integer` | ❌ | `1` | Min 1 | Trang hiện tại |
| `limit` | `integer` | ❌ | `20` | Min 1, Max 100 | Số bản ghi mỗi trang |

**Request ví dụ:** `GET /api/v1/admin/transactions/exceptions?page=1&limit=10`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "payment_id": 42,
      "registration_id": 100,
      "candidate_name": "Nguyễn Văn A",
      "exam_type_name": "HSK 4",
      "expected_amount": 500000,
      "actual_amount": null,
      "status": "pending",
      "exception_type": "expired_payment",
      "transaction_ref": "PAY-1696309200-100",
      "created_at": "2026-10-02T14:00:00+07:00"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 10,
    "total_items": 5,
    "total_pages": 1
  }
}
```

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `payment_id` | `integer` | ❌ | ID giao dịch thanh toán |
| `registration_id` | `integer` | ❌ | ID đơn đăng ký liên kết |
| `candidate_name` | `string` | ❌ | Tên thí sinh |
| `exam_type_name` | `string` | ❌ | Tên loại kỳ thi (ví dụ: `"HSK 1"`, `"HSK 4"`, `"HSKK Sơ cấp"`) |
| `expected_amount` | `integer` | ❌ | Số tiền phải thanh toán (VNĐ) |
| `actual_amount` | `integer` | ✅ | Số tiền thực nhận (null nếu chưa thanh toán) |
| `status` | `string` | ❌ | Trạng thái: `pending`, `failed`, `expired` |
| `exception_type` | `string` | ❌ | Loại ngoại lệ: `webhook_failed`, `expired_payment`, `amount_mismatch` |
| `transaction_ref` | `string` | ✅ | Mã giao dịch tham chiếu |
| `created_at` | `datetime` | ❌ | Thời gian tạo giao dịch |

---

### 15.7. Duyệt giao dịch thủ công (Manual Approve)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/transactions/:id/manual-approve` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin force-approve một giao dịch bị lỗi, hệ thống sẽ chốt đơn đăng ký và giữ ghế |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch (Payment ID) |

**Request Body:**

```json
{
  "reason": "Đã nhận chuyển khoản qua Vietcombank, xác nhận thủ công"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `reason` | `string` | ✅ | Min 5, Max 500 ký tự | Lý do duyệt thủ công (ghi nhận vào Audit Log) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "payment_id": 42,
    "registration_id": 100,
    "new_status": "success",
    "message": "Đã duyệt thủ công thành công"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `payment_id` | `integer` | ID giao dịch đã duyệt |
| `registration_id` | `integer` | ID đơn đăng ký được chốt |
| `new_status` | `string` | Trạng thái mới: `success` |
| `message` | `string` | Thông báo kết quả |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Tham số id không hợp lệ"` | ID không phải số nguyên |
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | Body JSON sai format |
| `400` | Chi tiết lỗi validation | `reason` quá ngắn (< 5 ký tự) |
| `404` | `"Không tìm thấy giao dịch"` | Payment ID không tồn tại |
| `409` | `"Giao dịch đã được xác nhận"` | Payment đã ở trạng thái `success` |
| `409` | `"Giao dịch đã hoàn tiền, không thể duyệt"` | Payment đã ở trạng thái `refunded` |

> **⚠️ Lưu ý quan trọng:** Thao tác này sẽ đồng thời:
> 1. Cập nhật `payment_status` → `success`
> 2. Cập nhật `exam_registration_status` → `confirmed`
> 3. Cập nhật `exam_seat_status` → `booked`
> 4. Ghi Audit Log với lý do Admin cung cấp

---

### 15.8. Đánh dấu hoàn tiền (Refund Mark)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/transactions/:id/refund-mark` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin đánh dấu một giao dịch là đã hoàn tiền cho thí sinh |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch (Payment ID) |

**Request Body:**

```json
{
  "reason": "Thí sinh yêu cầu hoàn tiền, đã chuyển khoản lại qua ngân hàng"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `reason` | `string` | ✅ | Min 5, Max 500 ký tự | Lý do hoàn tiền (ghi nhận vào Audit Log) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "payment_id": 42,
    "new_status": "refunded",
    "message": "Đã đánh dấu hoàn tiền thành công"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `payment_id` | `integer` | ID giao dịch đã đánh dấu hoàn tiền |
| `new_status` | `string` | Trạng thái mới: `refunded` |
| `message` | `string` | Thông báo kết quả |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Tham số id không hợp lệ"` | ID không phải số nguyên |
| `404` | `"Không tìm thấy giao dịch"` | Payment ID không tồn tại |
| `409` | `"Giao dịch chưa thanh toán, không thể hoàn tiền"` | Payment chưa ở trạng thái `success` |
| `409` | `"Giao dịch đã được hoàn tiền trước đó"` | Payment đã ở trạng thái `refunded` |

> **⚠️ Lưu ý quan trọng:** Thao tác này sẽ đồng thời:
> 1. Cập nhật `payment_status` → `refunded`
> 2. Cập nhật `exam_registration_status` → `cancelled`
> 3. Cập nhật `exam_seat_status` → `available` (trả ghế)
> 4. Ghi Audit Log với lý do Admin cung cấp

---

### 15.9. Lịch sử hoạt động gần đây (Recent Logs)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/logs/recent` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xem nhật ký hành động mới nhất trên hệ thống (tất cả Admin) |

**Query Params:**

| Param | Kiểu | Bắt buộc | Default | Validate | Mô tả |
|---|---|---|---|---|---|
| `page` | `integer` | ❌ | `1` | Min 1 | Trang hiện tại |
| `limit` | `integer` | ❌ | `20` | Min 1, Max 100 | Số bản ghi mỗi trang |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "action": "manual_approve",
      "entity_table": "payments",
      "entity_id": 42,
      "actor_id": 1,
      "created_at": "2026-10-03T08:30:00+07:00"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID bản ghi audit |
| `action` | `string` | ❌ | Hành động (ví dụ: `manual_approve`, `refund_mark`, `clear_cache`) |
| `entity_table` | `string` | ❌ | Tên bảng bị ảnh hưởng (ví dụ: `payments`, `exam_registrations`) |
| `entity_id` | `integer` | ❌ | ID bản ghi bị ảnh hưởng |
| `actor_id` | `integer` | ✅ | ID tài khoản Admin thực hiện (null nếu là hệ thống) |
| `created_at` | `datetime` | ❌ | Thời điểm thực hiện |

---

### 15.10. Xóa bộ nhớ đệm (Clear Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/system/clear-cache` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xác nhận trạng thái Real-time và ghi nhận audit log hệ thống |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Hệ thống đang hoạt động ở chế độ thời gian thực (Real-time), dữ liệu luôn được cập nhật mới nhất"
  },
  "error": null,
  "meta": null
}
```

> **Lưu ý:** Hệ thống Dashboard hiện query trực tiếp theo thời gian thực (Real-time) và tự động nhận tín hiệu WebSocket khi có thay đổi. API này được giữ để tương thích giao diện và ghi nhận audit log.

---

### 15.11. Lịch sử thao tác cá nhân (My Audit Log)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/users/me/audit-log` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem lịch sử các hành động do chính mình thực hiện |

**Query Params:**

| Param | Kiểu | Bắt buộc | Default | Validate | Mô tả |
|---|---|---|---|---|---|
| `page` | `integer` | ❌ | `1` | Min 1 | Trang hiện tại |
| `limit` | `integer` | ❌ | `20` | Min 1, Max 100 | Số bản ghi mỗi trang |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "action": "manual_approve",
      "entity_table": "payments",
      "entity_id": 42,
      "old_value": { "payment_status": "pending" },
      "new_value": { "payment_status": "success" },
      "created_at": "2026-10-03T08:30:00+07:00"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 35,
    "total_pages": 2
  }
}
```

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID bản ghi audit |
| `action` | `string` | ❌ | Hành động đã thực hiện |
| `entity_table` | `string` | ❌ | Tên bảng bị ảnh hưởng |
| `entity_id` | `integer` | ❌ | ID bản ghi bị ảnh hưởng |
| `old_value` | `object` | ✅ | Giá trị cũ trước khi thay đổi (JSON, có thể `null`) |
| `new_value` | `object` | ✅ | Giá trị mới sau khi thay đổi (JSON, có thể `null`) |
| `created_at` | `datetime` | ❌ | Thời điểm thực hiện |

---

### 15.12. Tổng quan kiến trúc Dashboard cho Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD LAYOUT                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Doanh thu│ │ Hồ sơ DT │ │ Lấp đầy %│ │ Thanh toán TC %  │   │
│  │ 15.000 K │ │    150   │ │  85.5%   │ │     92.3%        │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ← API: GET /admin/metrics/overview (Real-time, không cache)   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │  Biểu đồ doanh thu      │ │  Phân bố HSK (Pie Chart)   │   │
│  │  (Line Chart 7d/30d)    │ │  HSK1: 45, HSK2: 38...     │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
│  ← API: revenue-chart            ← API: hsk-distribution      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │  Phễu thanh toán        │ │  Trạng thái ca thi live     │   │
│  │  (Bar Chart theo giờ)   │ │  (Bảng real-time)          │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
│  ← API: payment-funnel          ← API: sessions/live-status   │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Giao dịch ngoại lệ (Table + Hành động)                  │ │
│  │  [Duyệt thủ công]  [Đánh dấu hoàn tiền]                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ← API: transactions/exceptions + manual-approve + refund-mark│
├─────────────────────────────────────────────────────────────────┤
│  Nhật ký hệ thống  │  Lịch sử cá nhân  │  [Xóa Cache]        │
│  ← logs/recent     │  ← me/audit-log   │  ← system/clear-cache│
└─────────────────────────────────────────────────────────────────┘
```

### 15.13. Gợi ý tích hợp cho Frontend

- **Auto-refresh:** Nên gọi lại `GET /admin/metrics/overview` mỗi 3-5 phút (hoặc dùng WebSocket event `dashboard_metrics_updated` để trigger refresh).
- **Biểu đồ:** Dùng thư viện như **Chart.js**, **Recharts** (React), hoặc **ECharts** để render.
- **Bảng giao dịch ngoại lệ:** Mỗi dòng có 2 nút hành động:
  - **"Duyệt"** → gọi `POST /admin/transactions/:id/manual-approve`
  - **"Hoàn tiền"** → gọi `POST /admin/transactions/:id/refund-mark`
- **Xóa Cache:** Đặt nút nhỏ ở góc Dashboard, sau khi bấm → gọi `POST /admin/system/clear-cache` rồi reload lại `overview`.
- **Pagination:** Các API có phân trang (`exceptions`, `logs/recent`, `me/audit-log`) đều trả về `meta` object, dùng để render thanh phân trang.
