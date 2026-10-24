# 📘 API Documentation — HSK Vinh University Registration System

> **Base URL:** `http://<host>:<port>/api/v1`
> **Content-Type:** `application/json`
> **Ngôn ngữ lỗi:** Tiếng Việt (tất cả thông báo lỗi trả về bằng Tiếng Việt)
> **Phiên bản:** v1.2.3
> **Cập nhật lần cuối:** 2026-10-24

## Changelog

### v1.2.3 (2026-10-24)
- 🚀 **Quản lý Đợt thi (Exam Period) & Nhân bản Kỳ thi định kỳ (Duplicate Exam Period)**:
  - Triển khai mô hình phân cấp quản lý 2 tầng: **Đợt thi (`exam_periods`)** chứa nhiều **Ca thi (`exam_sessions`)**.
  - **Nhân bản đợt thi (`POST /api/v1/admin/exam-periods/:id/duplicate`)**: Nhân bản toàn bộ cấu hình kỳ thi (phòng thi, lệ phí, loại chứng chỉ HSK, ca sáng/chiều, sức chứa...) từ đợt thi trước đó trong **duy nhất 1 database transaction (ACID)**. Đợt thi mới và toàn bộ ca thi con được khởi tạo ở trạng thái `draft`, đặt ngày thi và hạn đăng ký về `NULL` (buộc quản trị viên phải nhập ngày thi mới, triệt tiêu nguy cơ phát hành nhầm ca thi với ngày cũ), tuyệt đối **KHÔNG sao chép hồ sơ đăng ký hoặc thí sinh** (0 registrations/candidates copied).
  - **Ràng buộc chỉnh sửa đợt thi (`PUT /api/v1/admin/exam-periods/:id`)**: Chỉ cho phép chỉnh sửa tự do không giới hạn khi đợt thi ở trạng thái `draft`. Khi đợt thi đã chuyển sang `published` hoặc `registration_open`: chỉ cho phép chỉnh sửa các trường an toàn (`name`, `description`, `instructions`). Mọi hành vi cố tình sửa ngày thi (`start_date`, `end_date`, `registration_deadline`) bị chặn ngay với HTTP 409 Conflict và bắt buộc chuyển sang quy trình Dời lịch thi (`Reschedule`).
  - **Dời lịch thi cấp đợt thi (`POST /api/v1/admin/exam-periods/:id/reschedule`)**: Hỗ trợ xử lý bất khả kháng (thiên tai, dịch bệnh). Cập nhật cascade đồng bộ ngày thi và hạn nộp cho toàn bộ ca thi con thuộc đợt thi; **giữ nguyên toàn bộ hồ sơ đăng ký của thí sinh**; tự động gửi thông báo hàng loạt (bulk notifications) cho tất cả thí sinh đã đăng ký; bắt buộc ghi nhận lý do dời lịch vào hệ thống nhật ký kiểm toán (Audit Log).
  - **Đóng đăng ký sớm (`close-registration`)**: Cho phép quản trị viên chủ động đóng đăng ký thủ công trước hạn chót khi các địa điểm thi đã kín chỗ, áp dụng linh hoạt ở cả cấp Đợt thi (`POST /api/v1/admin/exam-periods/:id/close-registration`) và cấp Ca thi đơn lẻ (`POST /api/v1/admin/exam-sessions/:id/close-registration`).

### v1.2.2 (2026-10-17)
- 🚀 **Tối ưu hóa Docker Image & Chuẩn đóng gói Container (< 100MB)**:
  - Tối ưu kích thước Docker Image API từ mức phình to >200MB xuống còn **~22.3MB content transfer** và **51MB disk usage** (kích thước binary Go sau nén chỉ còn **18.1MB**).
  - Tích hợp công cụ nén binary thực thi `upx --best --lzma` trong Dockerfile multi-stage build.
  - Tối ưu hóa `.dockerignore`: Loại bỏ triệt để file rác, binary cục bộ (`bin/api`), `secrets/`, `migrations/`, `.git/` để thu nhỏ build context từ hàng chục MB xuống còn vài chục KB.
  - Hỗ trợ biên dịch Multi-Architecture (`linux/amd64` và `linux/arm64` cho macOS Apple Silicon) qua biến build `TARGETARCH`.
  - Bổ sung cấu hình giới hạn dung lượng log (`json-file`, `max-size: 10m`, `max-file: 3`) cho toàn bộ dịch vụ trong `docker-compose.yml` chống phình ổ đĩa.
- ⚡ **Tích hợp Dịch vụ Bộ nhớ đệm Redis với Cơ chế Phòng thủ (Defensive Redis Cache Architecture)**:
  - Triển khai mô hình **Cache-Aside** cho các module cốt lõi: Ca thi (`exam`), Hồ sơ thí sinh (`candidate`), Địa điểm (`location`), và Kết quả thi (`result`).
  - **Chống Cache Breakdown (Stampede)**: Sử dụng kỹ thuật `singleflight.Group` triệt tiêu trùng lặp tính toán đồng thời trên cùng một tiến trình Go.
  - **Khởi động nguội đa phiên bản (Multi-Instance Cold Start)**: Triển khai khóa phân tán Redis Distributed Lock (`SET NX PX` kết hợp giải phóng an toàn bằng mã Lua atomics).
  - **Chống Cache Avalanche**: Bổ sung độ trễ ngẫu nhiên Dynamic TTL Jitter (±10% mặc định, ±35% cho ca thi được phát hành đồng loạt).
  - **Chống Cache Penetration**: Caching bản ghi rỗng Sentinel (`__HSK_NOT_FOUND__`) TTL 1 phút cho các truy vấn tra cứu công khai không tồn tại ID.
  - **Graceful Fallback Mode**: Thiết lập timeout ngắn (`DialTimeout: 1s`, `Read/WriteTimeout: 200ms`). Khi Redis gián đoạn, hệ thống tự động fallback trực tiếp xuống cơ sở dữ liệu PostgreSQL mà không gây lỗi HTTP 500 cho ứng dụng.
  - **Bộ API Xóa & Làm mới Cache linh hoạt**: Cung cấp các endpoint chuyên biệt cho Admin và Thí sinh để xóa cache tức thì theo từng phân hệ hoặc xóa toàn bộ hệ thống (`hsk:*`).

### v1.2.0 (2026-10-14)
- ✨ Thêm tự động kiểm tra ảnh chân dung bằng Google Cloud Vision API khi upload giấy tờ tùy thân
- 📝 Validation ảnh chân dung bao gồm: URL hợp lệ, khuôn mặt, chất lượng ảnh, góc chụp, nền trắng, nội dung an toàn
- 🎯 Ảnh hợp lệ tự động được `verified`, ảnh không hợp lệ tự động bị `rejected` với lý do cụ thể
- 🔄 Graceful degradation: nếu Vision API không khả dụng, giấy tờ giữ `pending` để admin kiểm tra thủ công
- 🐛 **v1.2.1 (2026-10-14)**: 
  - Chặn ngay lập tức hành động upload khi ảnh chân dung không đạt yêu cầu: trả về lỗi **HTTP 400 Bad Request** thay vì lưu hồ sơ rồi trả 201 Created. Giúp Front-end không còn hiển thị nhầm thông báo "Upload thành công".
  - Phân tích màu nền thực tế (pixel border analysis) kiểm tra nền trắng chuẩn xác.
  - Tích hợp kiểm tra kính qua Object Localization và Label Detection (`eyewear`, `glasses`, `sunglasses`) kết hợp Headwear Likelihood.
  - Quét toàn bộ lỗi và trả về danh sách chi tiết lý do vi phạm bằng tiếng Việt.

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
- [16. Chuẩn đóng gói Container & Tối ưu hóa Dung lượng Docker](#16-chuẩn-đóng-gói-container--tối-ưu-hóa-dung-lượng-docker)
- [17. Kiến trúc Bộ nhớ đệm Redis & Cơ chế Phòng thủ (Redis Defensive Caching)](#17-kiến-trúc-bộ-nhớ-đệm-redis--cơ-chế-phòng-thủ-redis-defensive-caching)

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

> **🤖 Tự động kiểm tra ảnh chân dung:**
> 
> - Ảnh chân dung (`portrait_image_url`) sẽ được tự động kiểm tra bằng Google Cloud Vision API và bộ phân tích ảnh ngay khi upload.
> - **Nếu validation passes**: Lưu thông tin giấy tờ với `verification_status: "verified"` (HTTP 201 Created).
> - **Nếu validation fails**: **Chặn ngay lập tức** bằng lỗi **HTTP 400 Bad Request**, KHÔNG lưu bản ghi vào database. Response lỗi chuẩn:
>   ```json
>   {
>     "statusCode": 400,
>     "timestamp": "2026-10-14T14:30:00+07:00",
>     "path": "/api/v1/me/candidate-profile/documents",
>     "msg": "Ảnh chân dung không hợp lệ: <danh sách lý do vi phạm>"
>   }
>   ```
> - **Nếu Vision API không khả dụng hoặc lỗi hạ tầng**: Giữ nguyên cơ chế graceful degradation, lưu với trạng thái `pending` (HTTP 201 Created) để admin kiểm tra thủ công.
> 
> **Quy tắc validation ảnh chân dung:**
> 
> 1. **URL ảnh**: Bắt buộc là HTTPS từ Cloudinary (`res.cloudinary.com`), không để trống.
> 2. **Khuôn mặt**: Phải có chính xác 1 khuôn mặt, không được đeo kính (`glasses`, `eyewear`, `sunglasses`) hoặc trang phục che khuôn mặt.
> 3. **Chất lượng ảnh**: Không được mờ, độ sáng vùng khuôn mặt phải hợp lý (80–240 / 255).
> 4. **Góc chụp**: Đầu không được nghiêng quá nhiều (roll < 20°, pan < 25°, tilt < 20°).
> 5. **Nền ảnh**: Phải màu trắng (tỷ lệ điểm ảnh trắng ở vùng viền trên và 2 bên đạt ≥ 80%).
> 6. **Nội dung**: Không được chứa nội dung nhạy cảm (adult, violence, medical, racy).
> 
> **Lý do từ chối (msg) bằng tiếng Việt:**
> 
> - "URL ảnh không được để trống!"
> - "URL ảnh không hợp lệ!"
> - "phải có chính xác một khuôn mặt trong ảnh!"
> - "không được đeo kính hoặc trang phục che khuôn mặt!"
> - "ảnh bị mờ, không rõ nét!"
> - "ảnh quá tối, không đủ sáng!"
> - "ảnh quá sáng, bị cháy sáng!"
> - "góc chụp khuôn mặt không hợp lệ (đầu nghiêng quá nhiều)!"
> - "nền ảnh phải màu trắng!"
> - "không thể xác định màu nền ảnh!"
> - "ảnh chứa nội dung không phù hợp!"
> 
> **⚠️ Lưu ý cho Front-end:**
> 
> - Khi nhận **HTTP 201 Created**: Ảnh đã đạt chuẩn (hoặc đang chờ duyệt thủ công nếu Vision API offline). Hiển thị thông báo thành công và chuyển bước tiếp theo.
> - Khi nhận **HTTP 400 Bad Request**: Bắt lỗi trong khối `catch` (Axios/Fetch), hiển thị ngay Toast/Modal cảnh báo lỗi màu đỏ với nội dung từ `error.response.data.msg`, chặn người dùng tiến hành và yêu cầu chọn lại ảnh khác.

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

### 3.7. Kiểm tra tính hợp lệ của ảnh chân dung (Pre-validation)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/candidate-profile/validate-portrait` |
| **Auth** | 🔐 JWT |
| **Use-case** | Front-end gọi ngay sau khi thí sinh chọn ảnh hoặc upload lên Cloudinary để kiểm tra tiêu chuẩn ảnh (nền trắng, không đeo kính, 1 khuôn mặt, đủ sáng) trước khi nhấn "Lưu giấy tờ" |

**Request Body:**

```json
{
  "portrait_image_url": "https://res.cloudinary.com/.../portrait.jpg"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `portrait_image_url` | `string` | ✅ | URL hợp lệ | URL ảnh chân dung cần phân tích |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "has_face": true,
    "has_glasses": true,
    "is_white_background": false,
    "is_blurred": false,
    "is_too_dark": false,
    "brightness": 184.2,
    "reasons": [
      "nền ảnh phải màu trắng!",
      "không được đeo kính hoặc trang phục che khuôn mặt!"
    ],
    "rejection_reason": "Ảnh chân dung không hợp lệ: nền ảnh phải màu trắng! không được đeo kính hoặc trang phục che khuôn mặt!"
  },
  "error": null,
  "meta": null
}
```

> **Hướng dẫn cho Front-end:**
> - Gọi API này ngay khi ảnh chân dung được tải lên Cloudinary.
> - Nếu `data.valid === false`:
>   - Hiển thị Toast/Cảnh báo lỗi màu đỏ với nội dung từ `data.rejection_reason` (hoặc liệt kê từng lỗi trong `data.reasons`).
>   - Reset/Xóa trường ảnh chân dung (`setValue("portrait_image_url", "")`) để người dùng không thể gửi ảnh sai.
> - Nếu `data.valid === true`:
>   - Hiển thị thông báo: "Ảnh chân dung đạt tiêu chuẩn 3×4 cm!" và lưu URL vào form.

---

### 3.8. [Admin] Danh sách thí sinh

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

### 3.13. [Admin] Xoá toàn bộ bộ nhớ đệm thí sinh (Clear Candidates Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/candidates/clear-cache` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xoá toàn bộ cache hồ sơ (`hsk:cand:profile:*`) và giấy tờ (`hsk:cand:docs:*`) của tất cả thí sinh trên Redis để phục vụ FE/Admin làm mới dữ liệu tức thì sau khi có can thiệp dữ liệu ngoài hệ thống |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã làm mới toàn bộ bộ nhớ đệm thí sinh"
  },
  "error": null,
  "meta": null
}
```

---

### 3.14. Xoá bộ nhớ đệm hồ sơ cá nhân (Clear My Profile Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/me/candidate-profile/clear-cache` |
| **Auth** | 🔐 JWT (Candidate / Authenticated User) |
| **Use-case** | Xoá cache hồ sơ và giấy tờ của chính thí sinh đang đăng nhập trên Redis để làm mới giao diện |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã làm mới bộ nhớ đệm hồ sơ cá nhân"
  },
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

### 4.9. [Admin] Xoá bộ nhớ đệm Ca thi (Clear Exam Sessions Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-sessions/clear-cache` (Admin)<br>`POST /api/v1/exam-sessions/clear-cache` (Công khai / Development) |
| **Auth** | 🔐 JWT + Admin (với route admin) / 🔓 Public (route dev) |
| **Use-case** | Xoá toàn bộ cache danh sách loại thi (`hsk:exam:types`), danh sách ca thi công khai (`hsk:exam:sessions:published`), và chi tiết từng ca thi (`hsk:exam:session:*`) trên Redis. Giúp làm mới danh sách ca thi ngay lập tức khi Admin cập nhật lịch hoặc số lượng chỗ thi |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã làm mới bộ nhớ đệm ca thi"
  },
  "error": null,
  "meta": null
}
```

---

### 4.10. [Admin] Danh sách Đợt thi (List Exam Periods)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/exam-periods` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem danh sách các đợt thi (kèm thống kê số lượng ca thi con trong từng đợt), có thể lọc theo trạng thái và khoảng thời gian |

**Query Params (tất cả tùy chọn):**

| Param | Kiểu | Validate | Mô tả |
|---|---|---|---|
| `status` | `string` | `draft`, `published`, `registration_open`, `registration_closed`, `rescheduled`, `cancelled`, `completed` | Lọc theo trạng thái đợt thi |
| `from` | `string` | Format: `YYYY-MM-DD` | Lọc từ ngày bắt đầu |
| `to` | `string` | Format: `YYYY-MM-DD` | Lọc đến ngày kết thúc |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Đợt thi HSK ngày 13/12/2026",
      "code": "HSK-2026-12-13",
      "description": "Kỳ thi năng lực HSK đợt tháng 12/2026",
      "instructions": "Thí sinh có mặt trước giờ thi 30 phút",
      "start_date": "2026-12-13",
      "end_date": "2026-12-13",
      "registration_start": "2026-10-01T08:00:00Z",
      "registration_deadline": "2026-11-23T23:59:59Z",
      "status": "published",
      "session_count": 4,
      "created_at": "2026-10-24T08:56:33Z",
      "updated_at": "2026-10-24T08:56:33Z"
    }
  ],
  "error": null,
  "meta": null
}
```

---

### 4.11. [Admin] Chi tiết Đợt thi kèm danh sách Ca con (Get Exam Period Details)

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/exam-periods/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xem thông tin chi tiết đợt thi và danh sách toàn bộ các ca thi con (`exam_sessions`) thuộc đợt |

**Path Params:** `id` — ID đợt thi (`integer`)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Đợt thi HSK ngày 13/12/2026",
    "code": "HSK-2026-12-13",
    "description": "Kỳ thi năng lực HSK đợt tháng 12/2026",
    "instructions": "Thí sinh có mặt trước giờ thi 30 phút",
    "start_date": "2026-12-13",
    "end_date": "2026-12-13",
    "registration_start": "2026-10-01T08:00:00Z",
    "registration_deadline": "2026-11-23T23:59:59Z",
    "status": "published",
    "session_count": 4,
    "sessions": [
      {
        "id": 3,
        "period_id": 1,
        "exam_type_id": 1,
        "date": "2026-12-13T00:00:00Z",
        "shift": "morning",
        "capacity": 40,
        "fee": 1330000,
        "registration_deadline": "2026-11-23T23:59:59Z",
        "status": "open",
        "exam_session_publication_status": "published"
      }
    ],
    "created_at": "2026-10-24T08:56:33Z",
    "updated_at": "2026-10-24T08:56:33Z"
  },
  "error": null,
  "meta": null
}
```

---

### 4.12. [Admin] Tạo mới Đợt thi (Create Exam Period)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-periods` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Tạo đợt thi mới ở trạng thái mặc định `draft` |

**Request Body:**

```json
{
  "name": "Đợt thi HSK Tháng 03/2027",
  "code": "HSK-2027-03",
  "description": "Đợt thi năng lực HSK đầu năm",
  "instructions": "Yêu cầu mang theo CCCD bản gốc",
  "start_date": "2027-03-15",
  "end_date": "2027-03-15",
  "registration_start": "2027-01-10T08:00:00Z",
  "registration_deadline": "2027-02-28T23:59:59Z"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `name` | `string` | ✅ | Max 255 ký tự | Tên đợt thi |
| `code` | `string` | ✅ | Max 50 ký tự, Unique | Mã đợt thi |
| `description` | `string` | ❌ | — | Mô tả chi tiết đợt thi |
| `instructions` | `string` | ❌ | — | Hướng dẫn cho thí sinh |
| `start_date` | `string` | ❌ | Format `YYYY-MM-DD` | Ngày bắt đầu đợt thi |
| `end_date` | `string` | ❌ | Format `YYYY-MM-DD` | Ngày kết thúc đợt thi |
| `registration_start` | `string` | ❌ | RFC 3339 datetime | Thời điểm bắt đầu mở đăng ký |
| `registration_deadline` | `string` | ❌ | RFC 3339 datetime | Hạn chót đóng đăng ký |

**Response (201 Created):** Trả về `ExamPeriodResponseDTO` với trạng thái ban đầu là `draft`.

---

### 4.13. [Admin] Chỉnh sửa Đợt thi (Update Exam Period)

| | |
|---|---|
| **Endpoint** | `PUT /api/v1/admin/exam-periods/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Chỉnh sửa thông tin đợt thi với cơ chế bảo vệ trạng thái an toàn |

> **⚠️ Ràng buộc cốt lõi (Business Invariant):**
> - **Khi trạng thái là `draft`**: Cho phép tự do chỉnh sửa mọi trường thông tin (tên, mô tả, hướng dẫn, ngày bắt đầu, ngày kết thúc, thời gian mở/đóng đăng ký).
> - **Từ khi đợt thi chuyển sang `published` hoặc `registration_open` trở đi**: Hệ thống **CHỈ cho phép sửa các trường an toàn** (`name`, `description`, `instructions`). Mọi hành vi cố tình thay đổi ngày thi (`start_date`, `end_date`) hoặc hạn nộp (`registration_start`, `registration_deadline`) sẽ bị chặn ngay lập tức với mã **HTTP 409 Conflict** và hướng dẫn quản trị viên chuyển sang quy trình **Dời lịch thi (Reschedule)** chuyên dụng nhằm cảnh báo và gửi thông báo tới thí sinh.

**Request Body:**

```json
{
  "name": "Đợt thi HSK Tháng 03/2027 (Điều chỉnh)",
  "description": "Cập nhật mô tả: Phòng thi có trang bị điều hòa và máy tính mới.",
  "instructions": "Vui lòng có mặt trước giờ thi 45 phút."
}
```

**Response khi thành công (200 OK):** Trả về `ExamPeriodResponseDTO` đã cập nhật.

**Response khi vi phạm sửa ngày ở trạng thái đã công khai (409 Conflict):**

```json
{
  "statusCode": 409,
  "timestamp": "2026-10-24T16:25:07+07:00",
  "path": "/api/v1/admin/exam-periods/1",
  "msg": "Kỳ thi đã mở đăng ký hoặc đã công khai. Không thể thay đổi trực tiếp ngày thi hoặc hạn đăng ký. Vui lòng sử dụng quy trình dời lịch (Reschedule) để cảnh báo và gửi thông báo tới thí sinh."
}
```

---

### 4.14. [Admin] Nhân bản Đợt thi (Duplicate Exam Period)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-periods/:id/duplicate` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Trung tâm tổ chức kỳ thi gần như tương tự hàng tháng → sao chép toàn bộ cấu hình kỳ thi (phòng thi, lệ phí, loại chứng chỉ HSK, ca sáng/chiều, sức chứa...) từ đợt trước |

> **⭐ Các lưu ý kỹ thuật bắt buộc:**
> 1. **Giao dịch Transactional & Atomic**: Thao tác thực thi hoàn toàn trong **duy nhất 1 database transaction (ACID)** trên backend; không dựa vào việc frontend gửi nhiều request riêng lẻ. Nếu xảy ra bất kỳ lỗi nào, toàn bộ giao dịch sẽ tự động rollback.
> 2. **Trạng thái an toàn chống phát hành nhầm**: 
>    - Tạo mới một `exam_period` với trạng thái `draft`.
>    - Sao chép toàn bộ các `exam_sessions` con thuộc đợt thi nguồn.
>    - Toàn bộ ca thi con được **reset trạng thái phát hành về `draft`** và **đặt ngày thi (`exam_session_date`) cùng hạn đăng ký (`exam_session_registration_deadline`) về `NULL`**. Điều này bắt buộc Admin phải vào nhập ngày thi mới, loại bỏ hoàn toàn nguy cơ vô tình phát hành ca thi với ngày tháng cũ của tháng trước.
> 3. **Bảo toàn dữ liệu thí sinh**: **TUYỆT ĐỐI KHÔNG sao chép** bất kỳ đơn đăng ký (`exam_registrations`) hay thí sinh (`candidates`) nào sang đợt mới. Đợt thi mới bắt đầu hoàn toàn sạch sẽ với 0 lượt đăng ký.

**Path Params:** `id` — ID đợt thi cần nhân bản (`integer`)

**Request Body (tùy chọn):**

```json
{
  "name": "Đợt thi HSK Tháng 01/2027",
  "code": "HSK-2027-01"
}
```
*(Nếu không truyền `name` và `code`, backend sẽ tự động gán tên dạng `"[Tên cũ] (Bản sao)"` và mã duy nhất kèm timestamp).*

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "new_period_id": 7,
    "duplicated_sessions": 4,
    "period": {
      "id": 7,
      "name": "Đợt thi HSK Tháng 01/2027",
      "code": "HSK-2027-01",
      "status": "draft",
      "session_count": 4,
      "created_at": "2026-10-24T09:22:14Z",
      "updated_at": "2026-10-24T09:22:14Z"
    }
  },
  "error": null,
  "meta": null
}
```

---

### 4.15. [Admin] Dời lịch thi Đợt thi (Reschedule Exam Period)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-periods/:id/reschedule` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Áp dụng khi gặp sự kiện bất khả kháng (thiên tai bão lũ, dịch bệnh, sự cố hội trường) cần dời ngày thi của toàn bộ đợt thi sang thời gian mới |

> **⭐ Đặc điểm hành vi của quy trình Reschedule:**
> 1. **Cascade đồng loạt**: Tự động cập nhật ngày thi mới và hạn nộp hồ sơ mới cho **TOÀN BỘ các ca thi con (`exam_sessions`)** thuộc đợt thi.
> 2. **Giữ nguyên hồ sơ đăng ký**: Toàn bộ thí sinh đã đăng ký và nộp lệ phí vẫn được bảo toàn nguyên vẹn mã ghế và trạng thái đăng ký, chỉ cập nhật ngày thi mới.
> 3. **Gửi thông báo hàng loạt (Bulk Notification) bắt buộc**: Hệ thống tự động tạo thông báo gửi tới tất cả các tài khoản thí sinh có đơn đăng ký đang hoạt động trong đợt thi đó.
> 4. **Bắt buộc ghi nhận lý do vào Nhật ký kiểm toán (Audit Log)**: Trường `reason` là bắt buộc, được lưu trữ trong Audit Log để phục vụ thanh tra, kiểm toán hành chính.

**Path Params:** `id` — ID đợt thi (`integer`)

**Request Body:**

```json
{
  "new_start_date": "2026-12-20",
  "new_end_date": "2026-12-20",
  "new_registration_deadline": "2026-11-30T23:59:59Z",
  "reason": "Do ảnh hưởng bão số 6 gây ngập lụt diện rộng, hội đồng thi dời ngày thi sang 20/12/2026 để đảm bảo an toàn cho thí sinh.",
  "send_notification": true
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `new_start_date` | `string` | ✅ | Format `YYYY-MM-DD` | Ngày bắt đầu thi mới |
| `new_end_date` | `string` | ❌ | Format `YYYY-MM-DD` | Ngày kết thúc thi mới |
| `new_registration_deadline` | `string` | ❌ | RFC 3339 datetime | Hạn đăng ký mới sau khi dời lịch |
| `reason` | `string` | ✅ | Không được rỗng | Lý do dời lịch thi (bắt buộc lưu audit log) |
| `send_notification` | `boolean` | ❌ | Default: `true` | Gửi thông báo tự động tới các thí sinh đã đăng ký |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "period_id": 1,
    "updated_sessions": 4,
    "candidates_alerted": 25,
    "reason": "Do ảnh hưởng bão số 6 gây ngập lụt diện rộng, hội đồng thi dời ngày thi sang 20/12/2026 để đảm bảo an toàn cho thí sinh.",
    "period": {
      "id": 1,
      "name": "Đợt thi HSK ngày 13/12/2026",
      "code": "HSK-2026-12-13",
      "start_date": "2026-12-20",
      "end_date": "2026-12-20",
      "registration_deadline": "2026-11-30T23:59:59Z",
      "status": "rescheduled",
      "session_count": 4,
      "created_at": "2026-10-24T08:56:33Z",
      "updated_at": "2026-10-24T09:25:33Z"
    }
  },
  "error": null,
  "meta": null
}
```

---

### 4.16. [Admin] Đóng đăng ký sớm cấp Đợt thi (Close Exam Period Registration)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-periods/:id/close-registration` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Đóng cổng đăng ký thủ công cho toàn bộ đợt thi trước hạn chót (ví dụ: tất cả phòng thi đã kín chỗ trên toàn bộ các ca) |

**Path Params:** `id` — ID đợt thi (`integer`)

**Request Body (tùy chọn):**

```json
{
  "reason": "Tất cả các ca thi trong đợt đã kín chỗ trước thời hạn"
}
```

**Response (200 OK):** Trả về `ExamPeriodResponseDTO` với trạng thái `registration_closed` và hạn đăng ký được cập nhật về thời điểm đóng hiện tại.

---

### 4.17. [Admin] Đóng đăng ký sớm cấp Ca thi (Close Exam Session Registration)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/exam-sessions/:id/close-registration` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Đóng cổng đăng ký thủ công cho một ca thi đơn lẻ trước hạn chót (ví dụ: ca sáng HSK 3 đã hết 100% chỗ) |

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body (tùy chọn):**

```json
{
  "reason": "Ca thi đã đủ số lượng thí sinh đăng ký sớm hơn dự kiến"
}
```

**Response (200 OK):** Trả về `ExamSessionResponseDTO` với trạng thái `closed` và hạn đăng ký được cập nhật về thời điểm hiện tại.

---

### 4.18. [Admin] Chỉnh sửa Ca thi (Update Exam Session)

| | |
|---|---|
| **Endpoint** | `PUT /api/v1/admin/exam-sessions/:id` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin tùy chỉnh ngày thi, ca thi (sáng/chiều), sức chứa, lệ phí thi, hạn nộp hồ sơ, hoặc giờ check-in của một ca thi cụ thể. Đây là API cốt lõi được frontend gọi khi Admin ở màn hình chỉnh sửa đợt thi mới nhân bản (Draft) để hoàn thiện ngày thi và lệ phí trước khi công khai |

> **⚠️ Ràng buộc bảo vệ tính toàn vẹn (Safety Invariants):**
> - **Khi ca thi ở trạng thái `draft`**: Cho phép tự do cập nhật ngày thi, ca thi, sức chứa, lệ phí và hạn nộp hồ sơ.
> - **Khi ca thi đã chuyển sang `published` hoặc đã có thí sinh đăng ký**: Hệ thống **CHẶN can thiệp trực tiếp** vào ngày thi, sức chứa hoặc lệ phí thi (trả về mã **HTTP 409 Conflict**). Mọi thay đổi lịch thi khi đó bắt buộc phải đi qua quy trình **Dời lịch (Reschedule)** để đảm bảo an toàn quyền lợi thí sinh và phát thông báo đồng bộ.
> - **Khi ca thi đã hủy (`cancelled`)**: Không thể chỉnh sửa (trả về HTTP 400).
> - **Khóa DB ràng buộc**: Ràng buộc cơ sở dữ liệu `chk_exam_sessions_publish_requires_schedule` đảm bảo ca thi không bao giờ có thể chuyển sang trạng thái công khai (`published` / `scheduled`) khi ngày thi hoặc hạn đăng ký đang là `NULL`.

**Path Params:** `id` — ID ca thi (`integer`)

**Request Body (tất cả các trường đều tùy chọn - partial update):**

```json
{
  "date": "2027-01-15",
  "shift": "morning",
  "capacity": 45,
  "fee": 1400000,
  "registration_deadline": "2027-01-05T23:59:59Z",
  "exam_session_check_in_at": "2027-01-15T07:30:00Z"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `date` | `string` | ❌ | Format `YYYY-MM-DD` | Ngày tổ chức ca thi |
| `shift` | `string` | ❌ | `morning`, `afternoon`, `evening` | Ca thi trong ngày |
| `capacity` | `integer` | ❌ | Min 1 | Số lượng thí sinh tối đa |
| `fee` | `integer` | ❌ | Min 0 (VND) | Lệ phí thi của ca này |
| `registration_deadline` | `string` | ❌ | RFC 3339 datetime | Hạn chót nộp hồ sơ ca thi |
| `exam_session_check_in_at` | `string` | ❌ | RFC 3339 datetime | Giờ tập trung làm thủ tục |

**Response (200 OK):** Trả về `ExamSessionResponseDTO` với các trường đã cập nhật.

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

### 6.4. [Admin] Danh sách & đối soát tất cả giao dịch

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Kế toán tra cứu, đối soát giao dịch PayOS và phân trang |

**Query Params:**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | `integer` | `1` | Trang hiện tại |
| `limit` | `integer` | `20` | Số lượng mỗi trang (tối đa 100) |
| `status` | `string` | *(tất cả)* | Lọc: `pending`, `success`, `cancelled`, `failed`, `expired`, `refunded`, `partial_paid`, `amount_mismatch` (không phân biệt hoa thường) |
| `from` | `date` | *(tất cả)* | Ngày bắt đầu theo `YYYY-MM-DD` |
| `to` | `date` | *(tất cả)* | Ngày kết thúc theo `YYYY-MM-DD`, bao gồm cả ngày này |
| `order_code` | `string` | *(tất cả)* | Mã đơn hàng PayOS (`payment_transaction_ref`) |
| `transaction_id` | `string` | *(tất cả)* | Mã giao dịch ngân hàng/PayOS (`payment_gateway_trans_id`) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "exam_registration_id": 42,
      "candidate_name": "Nguyễn Văn A",
      "candidate_email": "nguyenvana@email.com",
      "exam_type_name": "HSK 3 (Cấp độ 3 + HSKK sơ cấp)",
      "amount": 500000,
      "amount_received": 500000,
      "method": "payos",
      "gateway": "payos",
      "transaction_ref": "101",
      "gateway_trans_id": "FT26274494820346",
      "content": "HSK-42",
      "status": "success",
      "evidence_urls": [],
      "admin_note": null,
      "is_top_up": false,
      "paid_at": "2026-09-27T09:05:00+07:00",
      "created_at": "2026-09-27T09:00:00+07:00",
      "updated_at": "2026-09-27T09:05:00+07:00"
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

---

### 6.4.1. [Admin] Xuất đối soát giao dịch CSV

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments/export` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Xuất CSV UTF-8 mở trực tiếp bằng Excel với cùng bộ lọc của danh sách |

Response là file `text/csv` gồm các cột: `Mã đơn hàng`, `Tên thí sinh`,
`Số tiền yêu cầu`, `Số tiền thực nhận`, `Thời gian`, `Trạng thái`.

---

### 6.5. [Admin] Xác nhận thanh toán thủ công

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/confirm` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin xác nhận thủ công cho các giao dịch chuyển khoản ngân hàng hoặc tiền mặt (Bank Transfer / Cash). Bắt buộc đính kèm hình ảnh bằng chứng (biên lai/sao kê). Chuyển trạng thái `pending → success` và tự động confirm đăng ký + đặt ghế. |

**Path Params:** `id` — ID giao dịch

**Request Body:**

```json
{
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/receipt_01.jpg"
  ],
  "note": "Xác nhận đối chiếu sao kê ngân hàng Vietcombank"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Danh sách URL hình ảnh bằng chứng chuyển tiền |
| `note` | `string` | ❌ | Tùy chọn | Ghi chú của quản trị viên |

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` đã cập nhật.

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | Thiếu hoặc sai định dạng `evidence_urls` |
| `404` | `"Không tìm thấy giao dịch"` | ID không tồn tại |
| `409` | `"Giao dịch không ở trạng thái chờ thanh toán"` | Giao dịch không phải `pending` |
| `409` | `"Không còn ghế trống cho phiếu đăng ký"` | Ghế đã được đặt hoặc đã hết thời gian giữ; request bị chặn để tránh overbooking |

Mọi lần xác nhận đều khóa payment/registration/seat trong cùng transaction bằng `SELECT ... FOR UPDATE` và ghi
`actor_account_id` của admin vào `audit_logs`.

> **🛡️ Cơ chế chống Double-Click (Idempotent):** Endpoint này được thiết kế an toàn tuyệt đối khi Admin bấm đúp chuột hoặc nhiều Admin cùng xác nhận đồng thời. Khi request thứ hai đi vào sau khi request đầu tiên đã commit thành công, hệ thống phát hiện giao dịch đã ở trạng thái `success`, tự động giải phóng lock và trả về ngay kết quả `200 OK` với dữ liệu thanh toán hiện tại, không gây lỗi `409 Conflict` khó hiểu trên giao diện và tuyệt đối không cộng dồn/overbook ghế.

---

### 6.6. [Admin] Hủy / Hoàn tiền giao dịch

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/cancel` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin xác nhận hủy trong một transaction ACID kèm hình ảnh bằng chứng và lý do. Payment, hồ sơ đăng ký, ghế và audit log cùng commit hoặc cùng rollback. |

**Path Params:** `id` — ID giao dịch

**Request Body:**

```json
{
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/cancel_request.jpg"
  ],
  "reason": "Thí sinh có đơn xin rút đăng ký kèm giấy xác nhận viện phí"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Hình ảnh đơn/bằng chứng hủy giao dịch |
| `reason` | `string` | ✅ | Min 3 ký tự | Lý do hủy giao dịch |

**State Machine:**

| Trạng thái hiện tại | Kết quả sau Cancel |
|---|---|
| `pending` | → `cancelled` |
| `success` | → `pending_refund` (chờ kế toán thực hiện chuyển khoản hoàn tiền) |
| `failed` / `expired` / `refunded` / `pending_refund` / `amount_mismatch` / `partial_paid` | ❌ Không thể hủy (409) |

**Điều kiện khóa theo kỳ thi:**

- Backend khóa payment, registration, exam session và exam seat bằng `FOR UPDATE`.
- Nếu `exam_session_date <= CURRENT_DATE` (đã qua hoặc đang trong ngày thi), API trả
  `409` và rollback toàn bộ; payment, registration và seat không thay đổi.
- Chỉ khi kỳ thi chưa đến ngày thi, registration mới chuyển sang `cancelled`.
- Seat chỉ được trả về `available` nếu đang ở trạng thái `held` hoặc `booked`.
- Với payment `success`, audit log dùng action `CANCEL_SUCCESS_PAYMENT`, lưu admin
  actor, `transaction_id`, registration, seat và cờ `seat_released` trong cùng transaction. Payment chuyển sang `pending_refund`.

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` đã cập nhật.

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | Thiếu `evidence_urls` hoặc `reason` |
| `404` | `"Không tìm thấy giao dịch"` | ID không tồn tại |
| `409` | `"Không thể hủy giao dịch ở trạng thái này"` | Trạng thái không hợp lệ để hủy |
| `409` | `"Không thể hủy giao dịch sau ngày thi ..."` | Kỳ thi đã qua hoặc đang diễn ra; toàn bộ dữ liệu được giữ nguyên |

---

### 6.7. [Admin] Đánh dấu giao dịch cần hoàn tiền (Bước 1: Mark Refund)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/mark-refund` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Đưa giao dịch vào trạng thái `pending_refund` (Đã duyệt nhu cầu hoàn tiền, trả ghế về `available`, hủy đơn đăng ký). Đơn được đưa vào danh sách chờ kế toán chuyển khoản thủ công qua ngân hàng. |

**Path Params:** `id` — ID giao dịch

**Request Body:**

```json
{
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/refund_proof.jpg"
  ],
  "reason": "Chuyển tiền thừa ca thi, kế toán lập lệnh hoàn trả"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Bằng chứng yêu cầu hoàn tiền |
| `reason` | `string` | ✅ | Min 3 ký tự | Lý do hoàn tiền |

**State Machine:** Chuyển trạng thái giao dịch sang `pending_refund`.
- Idempotent: Nếu giao dịch đã ở `pending_refund`, API trả về 200 OK ngay lập tức.
- Nếu kỳ thi chưa diễn ra, ghế được trả về `available` và đơn đăng ký chuyển sang `cancelled`.

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` với `status: "pending_refund"`.

---

### 6.7.1. [Admin] Xác nhận đã hoàn tiền xong (Bước 2: Confirm Refund)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/confirm-refund` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | **Đóng vòng lặp hoàn tiền**: Sau khi bộ phận kế toán/Admin đã thực hiện chuyển khoản lại tiền vào tài khoản ngân hàng của thí sinh, Admin gọi endpoint này để xác nhận hoàn tiền thành công, chuyển từ `pending_refund → refunded`. |

**Path Params:** `id` — ID giao dịch

**Request Body:**

```json
{
  "bank_ref": "FT261016888899",
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/bank_refund_slip.jpg"
  ],
  "note": "Đã chuyển khoản hoàn 100% lệ phí về STK VCB 0123456789 của thí sinh"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `bank_ref` | `string` | ✅ | Min 3 ký tự | Mã giao dịch chuyển khoản hoàn tiền trên ngân hàng (FT... / VCB...) |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Ảnh ủy nhiệm chi / biên lai chuyển khoản ngân hàng hoàn tiền |
| `note` | `string` | ❌ | Tùy chọn | Ghi chú kế toán/admin |

**State Machine:**
- Chỉ cho phép giao dịch đang ở trạng thái `pending_refund`.
- Idempotent: Nếu giao dịch đã ở `refunded`, API trả về 200 OK với dữ liệu hiện tại (an toàn khi double-click).
- Cập nhật `status = 'refunded'`, lưu `refunded_at`, `refund_bank_ref`, `refund_evidence_urls`.
- Ghi Audit Log với hành động `CONFIRM_REFUND`.

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` với `status: "refunded"`, `refunded_at`, `refund_bank_ref`, `refund_evidence_urls`.

**Lỗi có thể xảy ra:**

| HTTP Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Dữ liệu yêu cầu không hợp lệ"` | Thiếu `bank_ref` hoặc `evidence_urls` |
| `404` | `"Không tìm thấy giao dịch"` | ID không tồn tại |
| `409` | `"Giao dịch không ở trạng thái chờ hoàn tiền (pending_refund)"` | Giao dịch chưa qua bước mark-refund |

---

### 6.8. [Admin] Lấy chữ ký tải ảnh bằng chứng Cloudinary

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments/evidence-upload-signature` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Frontend gọi endpoint này để lấy chữ ký bảo mật (signature) trước khi tải ảnh bằng chứng trực tiếp lên Cloudinary folder `hsk/payment-evidence`. |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "timestamp": 1727400000,
    "signature": "a1b2c3d4e5f6...",
    "api_key": "123456789012345",
    "cloud_name": "dhv-hsk",
    "folder": "hsk/payment-evidence"
  },
  "error": null,
  "meta": null
}
```

---

### 6.9. [Admin] Edge Case 1: Đồng bộ trạng thái PayOS & Khôi phục chỗ

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/sync` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | **Thí sinh bị trừ tiền thành công nhưng đơn bị hủy**: Thí sinh quét QR lúc phút 14, ngân hàng xử lý chậm sang phút 16 webhook mới đến (ghế đã bị nhả sau 15p). Admin bấm "Đồng bộ PayOS" để truy vấn trực tiếp cổng thanh toán. |

**Path Params:** `id` — ID giao dịch

**Logic xử lý tự động:**
1. Backend gọi trực tiếp API Query Status sang PayOS (`GET /v2/payment-requests/{orderCode}`).
2. Nếu PayOS xác nhận đã thanh toán (`PAID`) và số tiền khớp:
   - **Trường hợp ghế còn khả dụng (`available` hoặc `held` của chính mình):** Hệ thống tự động kích hoạt lại đơn đăng ký sang `confirmed`, khóa ghế sang `booked`, và đánh dấu payment thành `success`.
   - **Trường hợp ghế đã bị người khác đặt mất:** Hệ thống tự động chuyển payment sang trạng thái `refunded` (đánh dấu hoàn tiền 100% cho thí sinh), hủy đơn đăng ký và ghi rõ lý do trong log kiểm toán.

**Response (200 OK):** Trả về `AdminPaymentResponseDTO` đã đồng bộ.

---

### 6.10. [Admin] Edge Case 2: Thanh toán sai số tiền (Underpayment & Overpayment)

#### 6.10.1. Thanh toán thiếu tiền (Underpayment): Tạo link nộp bổ sung

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/top-up` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Thí sinh chuyển khoản thiếu (ví dụ lệ phí 500k nhưng chỉ chuyển 400k). Admin tạo link thanh toán bổ sung PayOS cho số tiền còn thiếu (100k), hệ thống đóng băng và gia hạn giữ chỗ thêm X giờ, đồng thời gửi thông báo tự động (Email & Zalo). |

**Path Params:** `id` — ID giao dịch gốc

**Request Body:**

```json
{
  "additional_amount": 100000,
  "extend_hours": 24,
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/underpaid_stmt.jpg"
  ],
  "note": "Thí sinh mới chuyển 400k/500k, tạo link nộp thêm 100k",
  "return_url": "https://diemthihsk.dhv.edu.vn/dang-ky-thi?payment=topup_success",
  "cancel_url": "https://diemthihsk.dhv.edu.vn/dang-ky-thi?payment=topup_cancel"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `additional_amount` | `integer` | ❌ | Min 1000 VNĐ | Số tiền bổ sung (nếu bỏ trống, hệ thống tự tính: `lệ phí ca thi - số tiền đã nhận`) |
| `extend_hours` | `integer` | ❌ | 1 đến 168 (giờ) | Số giờ gia hạn giữ chỗ (mặc định 24 giờ) |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Bằng chứng thí sinh chuyển thiếu tiền |
| `note` | `string` | ❌ | Tùy chọn | Ghi chú của quản trị viên |
| `return_url` | `string` | ❌ | URL hợp lệ | Trang quay về khi thanh toán bổ sung thành công |
| `cancel_url` | `string` | ❌ | URL hợp lệ | Trang quay về khi hủy thanh toán bổ sung |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "top_up_payment_id": 105,
    "parent_payment_id": 101,
    "exam_registration_id": 42,
    "additional_amount": 100000,
    "checkout_url": "https://pay.payos.vn/web/topup123",
    "held_until": "2026-09-28T09:00:00+07:00",
    "notification_sent": true,
    "created_at": "2026-09-27T09:00:00+07:00"
  },
  "error": null,
  "meta": null
}
```

#### 6.10.2. Thanh toán thừa tiền (Overpayment): Xác nhận giữ chỗ & hoàn tiền chênh lệch

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/resolve-overpayment` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Thí sinh chuyển thừa tiền (ví dụ lệ phí 500k nhưng chuyển 600k). Admin bấm xử lý: hệ thống xác nhận đăng ký và khóa chỗ (`success`), đồng thời tạo bản ghi hoàn tiền thừa 100k (`refunded`) cho kế toán hoàn lại. |

**Path Params:** `id` — ID giao dịch

**Request Body:**

```json
{
  "refund_amount": 100000,
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/overpaid_stmt.jpg"
  ],
  "note": "Xác nhận đăng ký và tạo lệnh hoàn trả 100.000 VNĐ nộp thừa"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `refund_amount` | `integer` | ❌ | Min 1000 VNĐ | Số tiền hoàn lại (nếu bỏ trống, hệ thống tự tính: `số tiền đã nhận - lệ phí ca thi`) |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Hình ảnh sao kê chuyển thừa |
| `note` | `string` | ✅ | Min 3 ký tự | Ghi chú xử lý thừa tiền |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "payment_id": 101,
    "status": "success",
    "exam_registration_id": 42,
    "refund_payment_id": 106,
    "refund_amount": 100000,
    "refund_status": "refunded",
    "seat_booked": true,
    "message": "Đã xác nhận đăng ký thi và tạo bản ghi hoàn tiền phần chênh lệch thừa"
  },
  "error": null,
  "meta": null
}
```

---

### 6.11. [Admin] Edge Case 3: Giao dịch trùng lặp (Double Charge)

#### 6.11.1. Danh sách cảnh báo trùng lặp

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments/double-charges` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Hệ thống tự động quét và cảnh báo các trường hợp thí sinh có từ 2 giao dịch thành công trở lên cho cùng 1 ca thi. |

**Query Params:**
- `page`: Trang hiện tại (mặc định 1)
- `limit`: Số bản ghi mỗi trang (mặc định 20)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "candidate_id": 12,
      "candidate_name": "Nguyễn Văn A",
      "candidate_email": "vana@example.com",
      "exam_session_id": 5,
      "exam_name": "HSK 4 - Ca sáng",
      "payment_count": 2,
      "total_amount": 1000000,
      "payments": [
        {
          "payment_id": 101,
          "order_code": 101,
          "amount": 500000,
          "status": "success",
          "paid_at": "2026-09-27T08:00:00+07:00"
        },
        {
          "payment_id": 102,
          "order_code": 102,
          "amount": 500000,
          "status": "success",
          "paid_at": "2026-09-27T08:02:00+07:00"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

#### 6.11.2. Giải quyết giao dịch trùng lặp

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/resolve-double-charge` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Admin chọn giữ lại 1 giao dịch hợp lệ và đưa tất cả giao dịch trùng lặp còn lại vào danh sách hoàn tiền 100% (`refunded`). |

**Request Body:**

```json
{
  "keep_payment_id": 101,
  "refund_payment_ids": [102],
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/double_charge_proof.jpg"
  ],
  "note": "Giữ giao dịch 101, hoàn trả giao dịch 102 do thí sinh quét mã QR 2 lần"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `keep_payment_id` | `integer` | ✅ | Min 1 | ID giao dịch hợp lệ được giữ lại (`success`) |
| `refund_payment_ids` | `array[integer]` | ✅ | Min 1 item | Danh sách ID giao dịch trùng cần hoàn lại 100% |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Hình ảnh sao kê chứng minh trùng lặp |
| `note` | `string` | ✅ | Min 3 ký tự | Ghi chú xử lý |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "keep_payment_id": 101,
    "refunded_payment_ids": [102],
    "total_refund_amount": 500000,
    "message": "Đã giữ 1 giao dịch hợp lệ và chuyển các giao dịch trùng sang trạng thái hoàn tiền"
  },
  "error": null,
  "meta": null
}
```

---

### 6.12. [Admin] Edge Case 4: Quản lý tài khoản treo / Chuyển khoản sai nội dung (Suspense Account)

> **Cơ chế bắt tự động:** Khi thí sinh chuyển khoản nhưng gõ sai `orderCode`, Webhook PayOS không khớp được với đơn hàng nào trong hệ thống. Stored Procedure `fn_process_payos_webhook` tự động lưu bản ghi vào bảng `payment_suspense_transactions` với `suspense_source = 'webhook'`, giúp Admin không bị sót bất kỳ khoản tiền nào.

#### 6.12.1. Danh sách giao dịch treo

| | |
|---|---|
| **Endpoint** | `GET /api/v1/admin/payments/suspense` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Xem danh sách các khoản tiền chuyển sai nội dung, chưa khớp được với đơn đăng ký. |

**Query Params:**
- `page`: Trang hiện tại (mặc định 1)
- `limit`: Số bản ghi mỗi trang (mặc định 20)
- `status`: Lọc trạng thái (`pending`, `matched`, `refunded`)
- `from`: Ngày bắt đầu (`YYYY-MM-DD`)
- `to`: Ngày kết thúc (`YYYY-MM-DD`)
- `search`: Tìm kiếm theo nội dung chuyển khoản hoặc mã giao dịch ngân hàng

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "suspense_id": 1,
      "amount": 500000,
      "bank_ref": "FT2409270001",
      "transfer_content": "Nguyen Van A nop le phi",
      "transfer_time": "2026-09-27T08:30:00+07:00",
      "status": "pending",
      "source": "webhook",
      "evidence_urls": [],
      "admin_note": "",
      "created_at": "2026-09-27T08:30:05+07:00"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

#### 6.12.2. Nhập giao dịch treo thủ công

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/suspense` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Kế toán phát hiện tiền nổi trên sao kê tài khoản ngân hàng của trường nhưng không qua PayOS hoặc chuyển nhầm, nhập vào hệ thống để theo dõi. |

**Request Body:**

```json
{
  "amount": 500000,
  "bank_ref": "VCB.20260927.999",
  "transfer_content": "LE HOANG NAM THI HSK",
  "transfer_time": "2026-09-27T09:15:00+07:00",
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/vcb_slip.jpg"
  ],
  "admin_note": "Chuyển khoản trực tiếp tới tài khoản VCB của nhà trường"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `amount` | `integer` | ✅ | Min 1000 VNĐ | Số tiền nhận được |
| `bank_ref` | `string` | ✅ | Không rỗng | Mã giao dịch ngân hàng |
| `transfer_content` | `string` | ✅ | Không rỗng | Nội dung chuyển khoản trên sao kê |
| `transfer_time` | `string` | ❌ | ISO8601/RFC3339 | Thời gian chuyển tiền |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Hình ảnh chứng từ sao kê |
| `admin_note` | `string` | ❌ | Tùy chọn | Ghi chú của Admin |

**Response (201 Created):** Trả về `SuspenseTransactionResponseDTO`.

#### 6.12.3. Khớp giao dịch treo vào phiếu đăng ký

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/suspense/:id/match` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | Sau khi đối chiếu xác minh được thí sinh sở hữu khoản tiền treo, Admin khớp tiền vào phiếu đăng ký thi. Hệ thống tự động chuyển đơn sang `confirmed`, khóa ghế `booked` và ghi nhận giao dịch `success`. |

**Path Params:** `id` — ID giao dịch treo (`suspense_id`)

**Request Body:**

```json
{
  "exam_registration_id": 42,
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/reconcile_match.jpg"
  ],
  "note": "Khớp giao dịch treo cho thí sinh Lê Hoàng Nam sau khi xuất trình căn cước"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `exam_registration_id` | `integer` | ✅ | Min 1 | ID phiếu đăng ký thi cần khớp tiền |
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL hợp lệ | Bằng chứng đối chiếu xác minh |
| `note` | `string` | ❌ | Tùy chọn | Ghi chú đối soát |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "suspense_id": 1,
    "payment_id": 107,
    "exam_registration_id": 42,
    "amount": 500000,
    "status": "matched",
    "seat_booked": true,
    "message": "Khớp giao dịch treo thành công và đã giữ chỗ cho thí sinh"
  },
  "error": null,
  "meta": null
}
```

---

#### 6.12.4. Nhập sao kê ngân hàng tự động hàng loạt (Bulk Import Statement)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/suspense/import` |
| **Auth** | 🔐👑 JWT + Admin |
| **Use-case** | **Giải quyết bài toán volume giao dịch thực tế**: Khi ngân hàng gửi file sao kê định kỳ hoặc kế toán trích xuất danh sách giao dịch từ Internet Banking (Vietcombank, BIDV, VietinBank...). Thay vì gõ tay từng dòng, Admin import file CSV hoặc gửi danh sách JSON. Hệ thống tự động: <br>1. Khử trùng lặp theo `bank_ref` (bỏ qua giao dịch đã tồn tại). <br>2. Tự động bóc tách nội dung chuyển khoản để nhận diện mã `orderCode`. <br>3. Tự động khớp (Auto-match) với đơn đăng ký thi đang `pending` và book ghế ngay lập tức. |

**Header Hỗ trợ:**
- `Content-Type: multipart/form-data`: Upload file CSV sao kê (field `file`).
- `Content-Type: application/json`: Gửi danh sách bản ghi trực tiếp qua JSON body.

**Cách 1: Upload file CSV (`multipart/form-data`)**
- Form field: `file` (File `.csv` UTF-8).
- Header CSV tự động nhận diện linh hoạt các định dạng phổ biến:
  - Cột mã giao dịch: `bank_ref`, `ref`, `transaction_id`, `so_giao_dich`, `ma_gd`
  - Cột số tiền: `amount`, `credit`, `so_tien`, `co`
  - Cột nội dung: `transfer_content`, `content`, `description`, `noi_dung`
  - Cột thời gian: `transfer_time`, `time`, `date`, `ngay_gd`

**Cách 2: Gửi JSON body (`application/json`)**

```json
{
  "items": [
    {
      "bank_ref": "VCB.20261016.001",
      "amount": 500000,
      "transfer_content": "HSK 101 nop le phi",
      "transfer_time": "2026-10-16T08:00:00+07:00",
      "admin_note": "Import từ sao kê VCB sáng 16/10"
    },
    {
      "bank_ref": "VCB.20261016.002",
      "amount": 600000,
      "transfer_content": "Chuyen tien thi HSK",
      "transfer_time": "2026-10-16T08:05:00+07:00",
      "admin_note": "Nội dung thiếu orderCode -> lưu vào suspense để tra cứu sau"
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "imported_count": 2,
    "matched_count": 1,
    "skipped_count": 0,
    "message": "Nhập sao kê thành công: 2 giao dịch mới, 1 giao dịch tự động khớp, 0 giao dịch trùng lặp bỏ qua"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `imported_count` | `integer` | Số lượng bản ghi mới được lưu vào hệ thống |
| `matched_count` | `integer` | Số lượng bản ghi tự động khớp thành công với đơn đăng ký thi |
| `skipped_count` | `integer` | Số lượng bản ghi bị trùng `bank_ref` được tự động bỏ qua (idempotent) |

---

### 6.13. Tự động hết hạn giao dịch (Worker)

Worker nền quét định kỳ các payment `pending` quá 15 phút, chuyển sang `expired`,
hủy registration `pending_payment` và trả seat `held` về `available` trong một
transaction PostgreSQL. Không sử dụng Redis.

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

### 7.4. [Admin] Xoá bộ nhớ đệm Kết quả thi (Clear Results Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/results/clear-cache` (Admin)<br>`POST /api/v1/results/clear-cache` (Công khai / Development) |
| **Auth** | 🔐 JWT + Admin (với route admin) / 🔓 Public (route dev) |
| **Use-case** | Xoá toàn bộ cache điểm thi và tra cứu kết quả thi trên Redis (prefix `hsk:res:score:*` và `hsk:result:*`). Dùng khi Admin cập nhật điểm thi hàng loạt hoặc giải quyết đơn phúc khảo |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã làm mới bộ nhớ đệm kết quả thi"
  },
  "error": null,
  "meta": null
}
```

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

### 10.6. [Admin] Xoá bộ nhớ đệm Địa điểm (Clear Locations Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/locations/clear-cache` (Admin)<br>`POST /api/v1/locations/clear-cache` (Công khai / Development) |
| **Auth** | 🔐 JWT + Admin (với route admin) / 🔓 Public (route dev) |
| **Use-case** | Xoá toàn bộ cache danh sách tỉnh/thành (`hsk:loc:provinces`), danh sách xã/phường (`hsk:loc:wards:*`), và thông tin giao hàng (`hsk:loc:coverage:*`) trên Redis. Dùng khi cập nhật danh mục địa giới hành chính |

**Request Body:** Không cần body.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Đã làm mới bộ nhớ đệm địa điểm"
  },
  "error": null,
  "meta": null
}
```

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

### 12.6. Exam Period Status

| Giá trị | Mô tả |
|---|---|
| `draft` | Bản nháp (cho phép chỉnh sửa tự do toàn bộ thông tin) |
| `published` | Đã công khai thông tin kỳ thi (chỉ cho phép sửa thông tin an toàn) |
| `registration_open` | Đang mở tiếp nhận đăng ký trực tuyến |
| `registration_closed` | Đã đóng tiếp nhận đăng ký (hết hạn hoặc đóng sớm do kín chỗ) |
| `rescheduled` | Đã dời lịch thi do sự kiện bất khả kháng (cascade ngày thi con, giữ nguyên thí sinh) |
| `cancelled` | Đã hủy toàn bộ đợt thi |
| `completed` | Đợt thi đã hoàn thành |

### 12.7. Exam Session Status

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
| `pending` | Chờ xử lý thanh toán |
| `success` | Thanh toán thành công |
| `failed` | Thanh toán thất bại |
| `cancelled` | Đã hủy (trước khi thanh toán thành công) |
| `expired` | Hết hạn giữ chỗ (quá 15 phút chưa thanh toán) |
| `pending_refund` | Chờ hoàn tiền (đã duyệt hoàn tiền, ghế đã nhả, chờ kế toán chuyển khoản lại cho thí sinh) |
| `refunded` | Đã hoàn tiền xong (kế toán đã chuyển khoản thực tế, kèm mã `bank_ref` và ảnh ủy nhiệm chi) |
| `partial_paid` | Thanh toán thiếu tiền (chờ nộp bổ sung qua top-up) |
| `amount_mismatch` | Thanh toán sai số tiền (thừa hoặc không khớp) |

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
- `confirmed` → `cancelled`: Admin hủy payment `success` trước ngày thi; chỉ trả
  ghế nếu trạng thái ghế là `booked`. Nếu ngày thi đã đến hoặc đã qua, API khóa
  thao tác và rollback.
- `cancelled` → TERMINAL (không thể xác nhận lại)

### 13.2. Thanh toán (Payment)

```
           ┌──────────┐
           │ pending  │
           └────┬─────┘
                │
     ┌──────────┼──────────────┬───────────────┐
     ▼          ▼              ▼               ▼
  success     failed       cancelled        expired
     │                         (admin hủy)   (quá 15p)
     │ (hủy / mark-refund / double-charge / overpayment / sync mất ghế)
     ▼
 pending_refund (Bước 1: ghế đã nhả, registration đã hủy, tiền chờ kế toán chuyển khoản)
     │
     │ POST /admin/payments/:id/confirm-refund (Bước 2: chuyển khoản + ủy nhiệm chi + bank_ref)
     ▼
  refunded (TERMINAL)
```

- `pending` → `success`: Webhook PayOS khớp hoặc Admin xác nhận thủ công (Idempotent chống double-click)
- `pending` → `failed`: Thanh toán thất bại qua cổng
- `pending` → `cancelled`: Admin cancel hoặc thí sinh chủ động hủy trước khi thanh toán
- `pending` → `expired`: Quá 15 phút không thanh toán
- `success` → `pending_refund`: Admin cancel trước ngày thi, hoặc bấm `mark-refund`, hoặc giải quyết `double-charge`/`overpayment`/`sync`
- `pending_refund` → `refunded`: Admin gọi `confirm-refund` cung cấp `bank_ref` và ảnh chứng từ ủy nhiệm chi để đóng vòng lặp kế toán (Terminal)

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
- `booked` → `available`: Khi admin hủy payment success trước ngày thi hoặc hủy
  đăng ký đã xác nhận; không thực hiện sau ngày thi

### 13.4. Đợt thi (Exam Period)

```
              ┌───────────────────────────┐
              │           draft           │ ── (Nhân bản từ đợt cũ / Tạo mới)
              │ (sửa tự do toàn bộ fields)│
              └─────────────┬─────────────┘
                            │ Phát hành / Mở đăng ký
                            ▼
              ┌───────────────────────────┐
              │  published / reg_open     │ ── Chỉ sửa an toàn (name/desc/notes)
              └──────┬──────────────┬─────┘
                     │              │
      Dời lịch (Force│              │ Đóng đăng ký sớm (hết chỗ)
      Majeure)       │              │ hoặc hết hạn chót
                     ▼              ▼
           ┌──────────────┐   ┌───────────────────────┐
           │ rescheduled  │   │  registration_closed  │
           └──────┬───────┘   └───────────┬───────────┘
                  │                       │
                  └───────────┬───────────┘
                              │ Tổ chức thi xong
                              ▼
                      ┌───────────────┐
                      │   completed   │
                      └───────────────┘
```

- `draft`: Trạng thái ban đầu sau khi tạo hoặc nhân bản. Toàn bộ thông tin được phép chỉnh sửa tự do.
- `published` / `registration_open`: Công khai và mở tiếp nhận thí sinh. Khóa chặt các trường ngày thi và hạn đăng ký trực tiếp; mọi can thiệp thay đổi ngày thi bắt buộc chuyển qua quy trình `Reschedule`.
- `rescheduled`: Khi dời lịch thi do sự cố bất khả kháng. Cập nhật cascade toàn bộ ca thi con, giữ nguyên hồ sơ thí sinh, gửi thông báo diện rộng tới thí sinh.
- `registration_closed`: Đóng tiếp nhận hồ sơ (tự động khi đến hạn chót hoặc do Admin chủ động đóng sớm khi kín phòng).
- `cancelled`: Khi hủy bỏ toàn bộ đợt thi.
- `completed`: Khi kỳ thi đã diễn ra xong.

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
| 35 | `GET` | `/admin/exam-periods` | 🔐👑 | Exam |
| 36 | `POST` | `/admin/exam-periods` | 🔐👑 | Exam |
| 37 | `GET` | `/admin/exam-periods/:id` | 🔐👑 | Exam |
| 38 | `PUT` | `/admin/exam-periods/:id` | 🔐👑 | Exam |
| 39 | `POST` | `/admin/exam-periods/:id/duplicate` | 🔐👑 | Exam |
| 40 | `POST` | `/admin/exam-periods/:id/reschedule` | 🔐👑 | Exam |
| 41 | `POST` | `/admin/exam-periods/:id/close-registration` | 🔐👑 | Exam |
| 42 | `POST` | `/admin/exam-sessions/:id/close-registration` | 🔐👑 | Exam |
| 43 | `PUT` | `/admin/exam-sessions/:id` | 🔐👑 | Exam |
| 43 | `POST` | `/me/registrations` | 🔐 | Registration |
| 35 | `GET` | `/me/registrations` | 🔐 | Registration |
| 36 | `POST` | `/me/registrations/:id/payment-confirm` | 🔐 | Registration |
| 37 | `POST` | `/me/registrations/:id/transfer` | 🔐 | Registration |
| 38 | `POST` | `/me/registrations/:id/cancel` | 🔐 | Registration |
| 39 | `GET` | `/me/registrations/:id/admission-slip` | 🔐 | Registration |
| 40 | `POST` | `/me/exam-sessions/:id/waitlist` | 🔐 | Registration |
| 41 | `PATCH` | `/proctor/exam-sessions/:id/attendance/:registration_id` | 🔐 | Registration |
| 42 | `GET` | `/admin/exam-sessions/:id/dashboard` | 🔐👑 | Registration |
| 43 | `GET` | `/admin/payments/reconcile` | 🔐👑 | Registration |
| 44 | `POST` | `/payments/payos/create` | 🔐 | Payment |
| 45 | `POST` | `/payments/callback` | 🔐 | Payment |
| 46 | `GET` | `/payments` | 🔐 | Payment |
| 47 | `GET` | `/results/:registration_id` | 🔐 | Result |
| 48 | `POST` | `/rechecks` | 🔐 | Result |
| 49 | `POST` | `/admin/results` | 🔐👑 | Result |
| 50 | `GET` | `/admin/payments` | 🔐👑 | Payment |
| 51 | `GET` | `/admin/payments/export` | 🔐👑 | Payment |
| 52 | `POST` | `/admin/payments/:id/confirm` | 🔐👑 | Payment |
| 53 | `POST` | `/admin/payments/:id/sync` | 🔐👑 | Payment |
| 54 | `POST` | `/admin/payments/:id/cancel` | 🔐👑 | Payment |
| 55 | `POST` | `/admin/payments/:id/mark-refund` | 🔐👑 | Payment |
| 56 | `POST` | `/admin/payments/:id/confirm-refund` | 🔐👑 | Payment |
| 57 | `GET` | `/admin/payments/evidence-upload-signature` | 🔐👑 | Payment |
| 58 | `POST` | `/admin/payments/:id/top-up` | 🔐👑 | Payment |
| 59 | `POST` | `/admin/payments/:id/resolve-overpayment` | 🔐👑 | Payment |
| 60 | `GET` | `/admin/payments/double-charges` | 🔐👑 | Payment |
| 61 | `POST` | `/admin/payments/resolve-double-charge` | 🔐👑 | Payment |
| 62 | `GET` | `/admin/payments/suspense` | 🔐👑 | Payment |
| 63 | `POST` | `/admin/payments/suspense` | 🔐👑 | Payment |
| 64 | `POST` | `/admin/payments/suspense/:id/match` | 🔐👑 | Payment |
| 65 | `POST` | `/admin/payments/suspense/import` | 🔐👑 | Payment |
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
| `status` | `string` | ❌ | Trạng thái: `pending`, `success`, `failed`, `expired`, `cancelled`, `refunded`, `partial_paid`, `amount_mismatch` |
| `exception_type` | `string` | ❌ | Loại ngoại lệ: `webhook_failed`, `expired_payment`, `amount_mismatch`, `partial_paid` |
| `transaction_ref` | `string` | ✅ | Mã giao dịch tham chiếu |
| `created_at` | `datetime` | ❌ | Thời gian tạo giao dịch |

---

### 15.7. Duyệt giao dịch thủ công (Manual Approve)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/confirm` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin xác nhận giao dịch pending; hệ thống kiểm tra slot, chốt đơn đăng ký và book ghế |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch (Payment ID) |

**Request Body:**

```json
{
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/receipt_01.jpg"
  ],
  "note": "Xác nhận đối chiếu sao kê ngân hàng"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL | Hình ảnh biên lai/sao kê chứng minh thanh toán |
| `note` | `string` | ❌ | Tùy chọn | Ghi chú của quản trị viên |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "exam_registration_id": 100,
    "status": "success"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch đã duyệt |
| `exam_registration_id` | `integer` | ID đơn đăng ký được chốt |
| `status` | `string` | Trạng thái mới: `success` |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Tham số id không hợp lệ"` | ID không phải số nguyên |
| `404` | `"Không tìm thấy giao dịch"` | Payment ID không tồn tại |
| `409` | `"Giao dịch không ở trạng thái chờ thanh toán"` | Payment không còn `pending` |
| `409` | `"Không còn ghế trống cho phiếu đăng ký"` | Ghế đã được đặt hoặc hết thời gian giữ |

> **⚠️ Lưu ý quan trọng:** Thao tác này sẽ đồng thời:
> 1. Cập nhật `payment_status` → `success`
> 2. Cập nhật `exam_registration_status` → `confirmed`
> 3. Cập nhật `exam_seat_status` → `booked`
> 4. Ghi Audit Log với `actor_account_id` của Admin

---

### 15.8. Đánh dấu hoàn tiền (Refund Mark)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/payments/:id/mark-refund` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Admin đánh dấu một giao dịch là đã hoàn tiền cho thí sinh |

**Path Params:**

| Param | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch (Payment ID) |

**Request Body:**

```json
{
  "evidence_urls": [
    "https://res.cloudinary.com/demo/image/upload/v1/hsk/payment-evidence/refund_proof.jpg"
  ],
  "reason": "Hoàn tiền cho thí sinh chuyển khoản thừa"
}
```

| Field | Kiểu | Bắt buộc | Validate | Mô tả |
|---|---|---|---|---|
| `evidence_urls` | `array[string]` | ✅ | Min 1 URL | Hình ảnh chứng từ/ủy nhiệm chi hoàn tiền |
| `reason` | `string` | ✅ | Min 3 ký tự | Lý do hoàn tiền |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "pending_refund"
  },
  "error": null,
  "meta": null
}
```

| Field | Kiểu | Mô tả |
|---|---|---|
| `id` | `integer` | ID giao dịch đã đánh dấu hoàn tiền |
| `status` | `string` | Trạng thái mới: `pending_refund` |

**Lỗi có thể xảy ra:**

| Code | Thông báo | Nguyên nhân |
|---|---|---|
| `400` | `"Tham số id không hợp lệ"` | ID không phải số nguyên |
| `404` | `"Không tìm thấy giao dịch"` | Payment ID không tồn tại |
| `409` | `"Giao dịch chưa đủ điều kiện đánh dấu hoàn tiền"` | Payment chưa ở trạng thái có thể hoàn tiền |

> **⚠️ Lưu ý quan trọng:** Thao tác này là Bước 1 trong quy trình 2 bước:
> 1. Cập nhật `payment_status` → `pending_refund`
> 2. Cập nhật `exam_registration_status` → `cancelled`
> 3. Cập nhật `exam_seat_status` → `available` (nhả ghế thi trước ngày thi)
> 4. Ghi Audit Log với `actor_account_id` của Admin
> 5. **Bước tiếp theo (Bước 2):** Sau khi kế toán thực hiện chuyển khoản lại cho thí sinh, Admin gọi `POST /api/v1/admin/payments/:id/confirm-refund` (kèm mã giao dịch ngân hàng `bank_ref` và ảnh ủy nhiệm chi) để đóng vòng lặp trạng thái sang `refunded`.

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

### 15.10. Xóa bộ nhớ đệm hệ thống (Master Clear Cache)

| | |
|---|---|
| **Endpoint** | `POST /api/v1/admin/system/clear-cache` |
| **Auth** | 🔐 JWT + Admin |
| **Use-case** | Xóa toàn bộ dữ liệu bộ nhớ đệm Redis của toàn bộ hệ thống (quét và xóa tất cả key có tiền tố `hsk:*`) bao gồm ca thi, loại thi, địa điểm, hồ sơ thí sinh và kết quả thi. Đồng thời tự động ghi nhận audit log hệ thống |

**Request Body:** Không cần body.

**Response (200 OK) — Khi Redis đang hoạt động:**

```json
{
  "success": true,
  "data": {
    "message": "Toàn bộ bộ nhớ đệm (Redis Cache) hệ thống đã được làm mới thành công"
  },
  "error": null,
  "meta": null
}
```

**Response (200 OK) — Khi hệ thống chạy ở chế độ dự phòng (Graceful Degradation / No Redis):**

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

> **Lưu ý nghiệp vụ:**
> - Hệ thống Dashboard quản trị và module Thanh toán query trực tiếp theo thời gian thực (Real-time từ PostgreSQL) và tự động nhận tín hiệu WebSocket khi có biến động.
> - Các module hiển thị dữ liệu tĩnh/bán tĩnh (Ca thi, Loại thi, Địa điểm, Hồ sơ thí sinh, Điểm thi) được lưu trên Redis và sẽ được làm mới ngay lập tức khi gọi API này.

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

---

## 16. Chuẩn đóng gói Container & Tối ưu hóa Dung lượng Docker

Để đảm bảo hiệu năng triển khai CI/CD, tốc độ khởi động và tiết kiệm băng thông/dung lượng lưu trữ trên server, toàn bộ container và quy trình build Docker tuân thủ nghiêm ngặt chuẩn tối ưu hoá siêu nhẹ:

### 16.1. Nguyên nhân gây phình to Image trước đây (>200MB)
1. **Thiếu nén Executable Binary**: Binary Go biên dịch tích hợp nhiều thư viện nặng (Google Cloud Vision API, gRPC, Protobuf, Swagger, Validator...) sinh ra kích thước tệp thực thi thô ~56MB.
2. **Build Context chứa rác**: `.dockerignore` không loại bỏ thư mục `bin/` (nơi chứa binary build cục bộ `bin/api` ~32MB), `secrets/`, `docs/`, `migrations/`, làm phình to context và cache layer.
3. **Hardcode kiến trúc máy chủ**: `GOARCH=amd64` cứng nhắc khiến Docker trên máy Apple Silicon (arm64) phải chạy qua lớp dịch Rosetta gây lãng phí bộ nhớ và CPU.
4. **Không giới hạn dung lượng log**: Các container chạy liên tục sinh log không kiểm soát làm phình ổ cứng host.

### 16.2. Các giải pháp kỹ thuật đã áp dụng
| Hạng mục | Trước tối ưu | Sau tối ưu | Hiệu quả |
|---|---|---|---|
| **Binary Executable** | 56.5 MB (uncompressed) | **18.1 MB** (UPX LZMA) | Giảm **68%** |
| **Docker Content Transfer** | ~98.9 MB | **22.3 MB** | Giảm **77%** |
| **Docker Disk Usage** | > 200 MB | **51.0 MB** | Giảm **75%** |
| **Build Context** | Hàng chục MB | **< 600 KB** | Giảm **98%** |
| **Log Rotation** | Không giới hạn | Giới hạn `10MB x 3 files` | Chống cạn dung lượng đĩa |

### 16.3. Quy định bắt buộc cho tính năng & Container mới
1. **Quy tắc Build Multi-Stage:**
   - Builder stage: `golang:1.23-alpine` tích hợp `upx`.
   - Compiler flags: `CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -trimpath -ldflags="-s -w"`
   - Bắt buộc nén binary: `upx --best --lzma /bin/api`
   - Runtime stage: `alpine:3.21` (hoặc bản minimal mới nhất), người dùng không đặc quyền (`appuser`).
2. **Ngưỡng dung lượng tối đa (Size Budget):**
   - Image API backend **không bao giờ được vượt quá 100MB** (mục tiêu chuẩn: content <= 25MB, disk usage <= 55MB).
   - Nếu bổ sung container/dịch vụ mới vào `docker-compose.yml`, bắt buộc ưu tiên các tag `-alpine` (ví dụ `postgres:16-alpine`, `redis:7-alpine`).
3. **Quản lý `.dockerignore`:**
   - Mọi tệp binary cục bộ (`bin/`), credentials/secrets (`secrets/`), tệp migration (`migrations/`), tài liệu markdown và git artifacts phải được liệt kê trong `.dockerignore`.
4. **Log Rotation:**
   - Mọi service mới trong `docker-compose.yml` bắt buộc phải có block:
     ```yaml
     logging:
       driver: "json-file"
       options:
         max-size: "10m"
         max-file: "3"
     ```

---

## 17. Kiến trúc Bộ nhớ đệm Redis & Cơ chế Phòng thủ (Redis Defensive Caching)

Hệ thống HSK Vinh University triển khai tầng lưu trữ đệm phân tán Redis (chạy container `redis:7-alpine`) nhằm tăng tốc độ truy vấn cho hàng ngàn thí sinh truy cập đồng thời vào các thời điểm mở cổng đăng ký thi, đồng thời giảm tải 80-90% truy vấn đọc xuống PostgreSQL.

### 17.1. Nguyên lý Thiết kế Phòng thủ (Defensive Caching Patterns)

Hệ thống áp dụng đầy đủ 5 cơ chế phòng thủ chuyên sâu cho hệ thống phân tán:

| Cơ chế | Vấn đề giải quyết | Giải pháp kỹ thuật triển khai |
|---|---|---|
| **Cache-Aside Pattern** | Tách biệt logic ứng dụng & cache | Ứng dụng đọc từ Redis trước, nếu Cache Miss thì truy vấn PostgreSQL, sau đó ghi ngược vào Redis kèm TTL và trả về cho client. |
| **Chống Cache Breakdown (Stampede)** | 1 key bị hết hạn đột ngột, hàng ngàn request cùng lúc đổ dồn vào database | Sử dụng `golang.org/x/sync/singleflight`: đảm bảo trong cùng một tiến trình chỉ có **duy nhất 1 goroutine** được phép truy vấn database để tính toán dữ liệu cho key đó. Các request khác cùng key sẽ đợi kết quả từ goroutine này. |
| **Khóa phân tán (Distributed Lock)** | Khởi động nguội trên môi trường Multi-Instance (N container replica) | Sử dụng `SET NX PX` với TTL 5 giây để khóa key trên Redis. Chỉ 1 container duy nhất thực hiện query database và ghi đè cache. Khi hoàn tất, giải phóng khóa bằng script Lua nguyên tử (atomic Lua release). |
| **Chống Cache Avalanche** | Hàng loạt key cùng hết hạn tại một thời điểm khiến DB bị sập | Bổ sung độ lệch ngẫu nhiên **Dynamic TTL Jitter** (±10% cho hầu hết dữ liệu, ±35% cho danh sách ca thi). Nhờ đó thời điểm hết hạn của các key được phân tán đều theo thời gian. |
| **Chống Cache Penetration** | Hacker/Client spam query các ID không tồn tại | Với các endpoint công khai (như tra cứu ca thi theo ID, tra cứu điểm thi), khi database trả về `sql.ErrNoRows`, hệ thống ghi nhận giá trị Sentinel `__HSK_NOT_FOUND__` vào Redis với TTL ngắn (1 phút) để chặn các request tiếp theo truy vấn database. |
| **Graceful Degradation (Chế độ dự phòng)** | Redis server bị sập hoặc mất kết nối mạng | Client Redis được thiết lập timeout siêu ngắn (`DialTimeout: 1s`, `Read/WriteTimeout: 200ms`). Mọi lỗi thao tác cache đều được log cảnh báo và tự động fallback xuống truy vấn trực tiếp PostgreSQL. Ứng dụng **không bao giờ trả về lỗi 500** chỉ vì Redis gặp sự cố. |

### 17.2. Bảng Ma trận Key & TTL Caching

| Phân hệ / Module | Key Pattern | TTL Cơ bản | Jitter | Invalidation Trigger (Tự động xóa) |
|---|---|---|---|---|
| **Exam Types** | `hsk:exam:types` | 24 giờ | ±10% | Admin tạo / sửa / xóa loại thi |
| **Exam Sessions (Public)** | `hsk:exam:sessions:published` | 10 phút | ±35% | Tạo ca thi mới, hủy ca thi, thay đổi trạng thái phát hành, worker chuyển ca thi sang published |
| **Exam Sessions (Admin/Filt)** | `hsk:exam:sessions:filt:*` | 10 phút | ±35% | Tạo ca thi mới, hủy ca thi, đổi trạng thái, phát hành ca thi, xoá cache ca thi |
| **Exam Session Detail** | `hsk:exam:session:<id>` | 10 phút | ±35% | Hủy ca thi, cập nhật thông tin ca thi |
| **Candidate Profile** | `hsk:cand:profile:acc:<account_id>` | 6 giờ | ±10% | Thí sinh cập nhật hồ sơ cá nhân |
| **Candidate Documents** | `hsk:cand:docs:cand:<candidate_id>` | 6 giờ | ±10% | Thí sinh upload giấy tờ, Admin duyệt / từ chối giấy tờ |
| **Admin Candidates List** | `hsk:cand:admin:list:*` | 5 phút | — | Duyệt hồ sơ, từ chối hồ sơ, xoá cache thí sinh |
| **Admin Candidate Metrics** | `hsk:cand:admin:metrics` | 5 phút | — | Duyệt hồ sơ, từ chối hồ sơ, xoá cache thí sinh |
| **Provinces** | `hsk:loc:provinces` | 24 giờ | ±10% | Cập nhật danh mục Tỉnh/Thành phố |
| **Wards by Province** | `hsk:loc:wards:p:<province_id>` | 24 giờ | ±10% | Gộp xã/phường (`MergeWard`) |
| **Delivery Coverage** | `hsk:loc:coverage:w:<ward_id>` | 24 giờ | ±10% | Gộp xã/phường (`MergeWard`) |
| **Exam Score** | `hsk:res:score:reg:<registration_id>` | 12 giờ | ±10% | Admin nhập điểm thi, cập nhật kết quả phúc khảo |
| **Payment Transactions** | *(Không Cache)* | — | — | **Real-time 100% từ PostgreSQL** để bảo đảm toàn vẹn tài chính |
| **Dashboard Metrics** | *(Không Cache)* | — | — | **Real-time 100% từ PostgreSQL** & đồng bộ tức thì qua WebSocket |

### 17.3. Tổng hợp API Quản lý & Làm mới Cache cho Admin

Admin có thể chủ động kích hoạt làm mới cache trên giao diện quản trị thông qua các endpoint sau:

| Thao tác | Endpoint | Quyền hạn | Phạm vi làm sạch |
|---|---|---|---|
| **Làm mới toàn bộ hệ thống** | `POST /api/v1/admin/system/clear-cache` | 🔐 Admin | Quét và xóa toàn bộ key có tiền tố `hsk:*` |
| **Làm mới cache Thí sinh** | `POST /api/v1/admin/candidates/clear-cache` | 🔐 Admin | Xóa `hsk:cand:profile:*` và `hsk:cand:docs:*` |
| **Làm mới cache Ca thi** | `POST /api/v1/admin/exam-sessions/clear-cache` | 🔐 Admin | Xóa `hsk:exam:types`, `hsk:exam:sessions:published`, `hsk:exam:session:*` |
| **Làm mới cache Địa điểm** | `POST /api/v1/admin/locations/clear-cache` | 🔐 Admin | Xóa `hsk:loc:provinces`, `hsk:loc:wards:*`, `hsk:loc:coverage:*` |
| **Làm mới cache Điểm thi** | `POST /api/v1/admin/results/clear-cache` | 🔐 Admin | Xóa `hsk:res:score:*` và `hsk:result:*` |


