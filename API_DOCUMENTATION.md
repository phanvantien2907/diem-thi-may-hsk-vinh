# 📘 API Documentation — HSK Vinh University Registration System

> **Base URL:** `http://<host>:<port>/api/v1`
> **Content-Type:** `application/json`
> **Ngôn ngữ lỗi:** Tiếng Việt (tất cả thông báo lỗi trả về bằng Tiếng Việt)
> **Phiên bản:** v1.0.0
> **Cập nhật lần cuối:** 2026-09-07

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
| `access_token` | `string` | JWT access token (24h) |
| `refresh_token` | `string` | JWT refresh token (7 ngày) |
| `expires_in` | `integer` | Thời gian sống của access token (giây) |
| `must_change_password` | `boolean` | `true` nếu là nhân viên lần đầu đăng nhập cần đổi mật khẩu tạm |

> **⚠️ Khi `must_change_password = true`:** Front-end phải redirect sang trang đổi mật khẩu bắt buộc (gọi API [2.4](#24-đổi-mật-khẩu-bắt-buộc-nhân-viên)).

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
| **Use-case** | Cập nhật email, số điện thoại của tài khoản đang đăng nhập |

**Request Body:**

```json
{
  "email": "newemail@example.com",
  "phone": "0987654321"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `email` | `string` | ❌ | Email hợp lệ, tối đa 150 ký tự | Email mới (bỏ qua nếu không đổi) |
| `phone` | `string` | ❌ | Tối đa 20 ký tự | SĐT mới (bỏ qua nếu không đổi) |

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
| `status` | `string` | ❌ | `pending`, `verified`, `rejected` | Lọc theo trạng thái xác minh |
| `page` | `integer` | ❌ | Min 1, mặc định 1 | Trang hiện tại |
| `limit` | `integer` | ❌ | Min 1, max 100, mặc định 20 | Số bản ghi/trang |

**Ví dụ:** `GET /api/v1/admin/candidates?status=pending&page=1&limit=20`

**Response (200 OK):** Mảng `AdminCandidateResponseDTO` + `meta` phân trang.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account_id": 1,
      "full_name": "Nguyễn Văn A",
      "dob": "2000-05-15T00:00:00Z",
      "gender": "male",
      "nationality": "Việt Nam",
      "latest_document": {
        "id": 1,
        "candidate_id": 1,
        "doc_type": "cccd",
        "doc_number": "012345678901",
        "verification_status": "pending"
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

### 3.8. [Admin] Xem chi tiết thí sinh

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/candidates/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem chi tiết hồ sơ một thí sinh |

**Path Params:** `id` — ID thí sinh (`integer`)

**Response (200 OK):** Trả về `AdminCandidateResponseDTO`.

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

### 4.2. Danh sách phòng thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-rooms` |
| **Auth** | 🔓 Public |
| **Use-case** | Xem danh sách các phòng thi |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phòng A101",
      "location": "Tòa nhà A, Tầng 1",
      "capacity": 40
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 4.3. Danh sách ca thi

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

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "exam_type_id": 1,
      "exam_room_id": 1,
      "date": "2026-10-15T00:00:00Z",
      "shift": "morning",
      "capacity": 40,
      "fee": 500000,
      "registration_deadline": "2026-10-10T23:59:59+07:00",
      "status": "open"
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
| `exam_room_id` | `integer` | ❌ | ID phòng thi |
| `date` | `datetime` | ❌ | Ngày thi |
| `shift` | `string` | ❌ | Ca thi: `morning`, `afternoon`, `evening` |
| `capacity` | `integer` | ❌ | Sức chứa tối đa |
| `fee` | `integer` | ❌ | Lệ phí thi (đơn vị: VNĐ) |
| `registration_deadline` | `datetime` | ❌ | Hạn đăng ký |
| `status` | `string` | ❌ | `open`, `closed`, `cancelled` |

---

### 4.4. Chi tiết ca thi

| | |
|---|---|
| **Endpoint** | `GET /api/v1/exam-sessions/:id` |
| **Auth** | 🔓 Public |
| **Use-case** | Xem chi tiết một ca thi cụ thể |

**Path Params:** `id` — ID ca thi (`integer`)

**Response (200 OK):** Trả về `ExamSessionResponseDTO` (xem [4.3](#43-danh-sách-ca-thi)).

---

### 4.5. Sơ đồ ghế ngồi

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

### 4.6. [Admin] Tạo ca thi hàng loạt

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
      "exam_room_id": 1,
      "date": "2026-10-15",
      "shift": "morning",
      "capacity": 40,
      "fee": 500000,
      "registration_deadline": "2026-10-10T23:59:59+07:00"
    }
  ]
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `sessions` | `array` | ✅ | Min 1 phần tử | Mảng ca thi |
| `sessions[].exam_type_id` | `integer` | ✅ | Min 1 | ID loại thi |
| `sessions[].exam_room_id` | `integer` | ✅ | Min 1 | ID phòng thi |
| `sessions[].date` | `string` | ✅ | Format: `YYYY-MM-DD` | Ngày thi |
| `sessions[].shift` | `string` | ✅ | `morning`, `afternoon`, `evening` | Ca thi |
| `sessions[].capacity` | `integer` | ✅ | Min 1 | Sức chứa |
| `sessions[].fee` | `number` | ❌ | Min 0 | Lệ phí (VNĐ) |
| `sessions[].registration_deadline` | `string` | ✅ | RFC 3339 datetime | Hạn đăng ký |

**Response (201 Created):** Mảng `ExamSessionResponseDTO`.

---

### 4.7. [Admin] Sinh ghế cho ca thi

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

### 4.8. [Admin] Hủy ca thi

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

### 6.1. Tạo yêu cầu thanh toán

| | |
|---|---|
| **Endpoint** | `POST /api/v1/payments` |
| **Auth** | 🔐 JWT |
| **Use-case** | Tạo giao dịch thanh toán cho đơn đăng ký thi |

**Request Body:**

```json
{
  "exam_registration_id": 1,
  "amount": 500000,
  "method": "vnpay"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_registration_id` | `integer` | ✅ | Min 1 | ID đăng ký thi |
| `amount` | `integer` | ✅ | Min 1 | Số tiền (VNĐ) |
| `method` | `string` | ✅ | `vnpay`, `momo`, `zalopay`, `bank_transfer`, `cash` | Phương thức thanh toán |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "exam_registration_id": 1,
    "amount": 500000,
    "method": "vnpay",
    "transaction_ref": null,
    "status": "pending",
    "paid_at": null,
    "created_at": "2026-09-07T10:30:00+07:00"
  },
  "error": null,
  "meta": null
}
```

**Response fields (PaymentResponseDTO):**

| Field | Kiểu | Nullable | Mô tả |
|---|---|---|---|
| `id` | `integer` | ❌ | ID giao dịch |
| `exam_registration_id` | `integer` | ❌ | ID đăng ký thi |
| `amount` | `integer` | ❌ | Số tiền (VNĐ) |
| `method` | `string` | ❌ | Phương thức thanh toán |
| `transaction_ref` | `string` | ✅ | Mã tham chiếu giao dịch |
| `status` | `string` | ❌ | `pending`, `success`, `failed`, `refunded` |
| `paid_at` | `datetime` | ✅ | Thời điểm thanh toán thành công |
| `created_at` | `datetime` | ❌ | Thời điểm tạo |

---

### 6.2. Callback thanh toán (Webhook)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/payments/callback` |
| **Auth** | 🔐 JWT |
| **Use-case** | Cổng thanh toán gửi kết quả xử lý (IPN/Callback) |

**Request Body:**

```json
{
  "transaction_ref": "VNP20260907ABC123",
  "status": "success"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `transaction_ref` | `string` | ✅ | Không rỗng | Mã tham chiếu giao dịch |
| `status` | `string` | ✅ | `pending`, `success`, `failed`, `refunded` | Trạng thái mới |

> **⚠️ Khi `status = "success"`:** Hệ thống tự động chuyển đăng ký thi sang `confirmed` và ghế sang `booked`.

**Response (200 OK):** Trả về `PaymentResponseDTO` đã cập nhật.

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `409` | `"Giao dịch đã được xử lý"` | Callback trùng (đã xử lý trước đó) |

---

### 6.3. Lịch sử thanh toán

| | |
|---|---|
| **Endpoint** | `GET /api/v1/payments` |
| **Auth** | 🔐 JWT |
| **Use-case** | Xem danh sách giao dịch thanh toán |

**Query Params:**

| Param | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `candidate_id` | `integer` | ✅ | Lớn hơn 0 | ID thí sinh |

**Ví dụ:** `GET /api/v1/payments?candidate_id=42`

**Response (200 OK):** Mảng `PaymentResponseDTO`.

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
| 22 | `GET` | `/admin/candidates/duplicates` | 🔐👑 | Candidate |
| 23 | `GET` | `/admin/candidates/:id` | 🔐👑 | Candidate |
| 24 | `POST` | `/admin/candidates/:id/approve` | 🔐👑 | Candidate |
| 25 | `POST` | `/admin/candidates/:id/reject` | 🔐👑 | Candidate |
| 26 | `GET` | `/admin/exam-sessions/:id/roster` | 🔐👑 | Candidate |
| 27 | `GET` | `/exam-types` | 🔓 | Exam |
| 28 | `GET` | `/exam-rooms` | 🔓 | Exam |
| 29 | `GET` | `/exam-sessions` | 🔓 | Exam |
| 30 | `GET` | `/exam-sessions/:id` | 🔓 | Exam |
| 31 | `GET` | `/exam-sessions/:id/seats` | 🔓 | Exam |
| 32 | `POST` | `/admin/exam-sessions/batch-create` | 🔐👑 | Exam |
| 33 | `POST` | `/admin/exam-sessions/:id/seats/generate` | 🔐👑 | Exam |
| 34 | `POST` | `/admin/exam-sessions/:id/cancel` | 🔐👑 | Exam |
| 35 | `POST` | `/me/registrations` | 🔐 | Registration |
| 36 | `GET` | `/me/registrations` | 🔐 | Registration |
| 37 | `POST` | `/me/registrations/:id/payment-confirm` | 🔐 | Registration |
| 38 | `POST` | `/me/registrations/:id/transfer` | 🔐 | Registration |
| 39 | `POST` | `/me/registrations/:id/cancel` | 🔐 | Registration |
| 40 | `GET` | `/me/registrations/:id/admission-slip` | 🔐 | Registration |
| 41 | `POST` | `/me/exam-sessions/:id/waitlist` | 🔐 | Registration |
| 42 | `PATCH` | `/proctor/exam-sessions/:id/attendance/:registration_id` | 🔐 | Registration |
| 43 | `GET` | `/admin/exam-sessions/:id/dashboard` | 🔐👑 | Registration |
| 44 | `GET` | `/admin/payments/reconcile` | 🔐👑 | Registration |
| 45 | `POST` | `/payments` | 🔐 | Payment |
| 46 | `POST` | `/payments/callback` | 🔐 | Payment |
| 47 | `GET` | `/payments` | 🔐 | Payment |
| 48 | `GET` | `/results/:registration_id` | 🔐 | Result |
| 49 | `POST` | `/rechecks` | 🔐 | Result |
| 50 | `POST` | `/admin/results` | 🔐👑 | Result |
| 51 | `GET` | `/me/certificates` | 🔐 | Certificate |
| 52 | `GET` | `/me/certificates/:id` | 🔐 | Certificate |
| 53 | `GET` | `/me/certificates/:id/pdf` | 🔐 | Certificate |
| 54 | `POST` | `/me/certificates/:id/deliveries` | 🔐 | Certificate |
| 55 | `GET` | `/me/certificates/:id/deliveries` | 🔐 | Certificate |
| 56 | `POST` | `/me/certificates/:id/reissue-request` | 🔐 | Certificate |
| 57 | `PATCH` | `/me/deliveries/:delivery_id` | 🔐 | Certificate |
| 58 | `GET` | `/public/certificates/verify` | 🔓 | Certificate |
| 59 | `POST` | `/admin/certificates/:id/issue` | 🔐👑 | Certificate |
| 60 | `POST` | `/admin/certificates/issue-batch` | 🔐👑 | Certificate |
| 61 | `POST` | `/admin/certificates/:id/revoke` | 🔐👑 | Certificate |
| 62 | `GET` | `/admin/certificates` | 🔐👑 | Certificate |
| 63 | `GET` | `/admin/certificates/print-batch` | 🔐👑 | Certificate |
| 64 | `GET` | `/admin/deliveries` | 🔐👑 | Certificate |
| 65 | `PATCH` | `/admin/deliveries/:id` | 🔐👑 | Certificate |
| 66 | `POST` | `/webhooks/shipping/:courier` | HMAC | Certificate |
| 67 | `GET` | `/notifications` | 🔐 | Notification |
| 68 | `PUT` | `/notifications/:id/read` | 🔐 | Notification |
| 69 | `GET` | `/locations/provinces` | 🔓 | Location |
| 70 | `GET` | `/locations/provinces/:id/wards` | 🔓 | Location |
| 71 | `GET` | `/locations/wards/:id/delivery-coverage` | 🔓 | Location |
| 72 | `GET` | `/admin/locations/stats/candidates-by-province` | 🔐👑 | Location |
| 73 | `POST` | `/admin/locations/wards/:id/merge` | 🔐👑 | Location |
| 74 | `GET` | `/admin/audit-logs` | 🔐👑 | Audit |

> **Chú thích:** 🔓 = Public | 🔐 = JWT | 🔐👑 = JWT + Admin | HMAC = Webhook signature

---

*Tài liệu này được tạo tự động từ mã nguồn backend. Mọi thắc mắc liên hệ team Backend.*
