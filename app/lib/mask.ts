/**
 * Tiện ích che giấu dữ liệu định danh cá nhân (PII Masking)
 * Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
 */

/**
 * Che giấu thông tin định danh nhạy cảm chung.
 * Chuỗi > 6 ký tự: giữ 3 ký tự đầu và 3 ký tự cuối (ví dụ: "040***040").
 * Chuỗi 3 - 6 ký tự: giữ 1 ký tự đầu và 1 ký tự cuối.
 * Chuỗi <= 2 ký tự: hiển thị "***".
 */
export function maskPII(raw?: string | null): string {
  if (!raw) return "—";
  const trimmed = raw.trim();
  if (!trimmed) return "—";

  // Nếu chuỗi đã được che giấu từ trước (chứa ***) thì giữ nguyên
  if (trimmed.includes("***")) {
    return trimmed;
  }

  const len = trimmed.length;
  if (len > 6) {
    return `${trimmed.slice(0, 3)}***${trimmed.slice(-3)}`;
  }
  if (len > 2) {
    return `${trimmed.slice(0, 1)}***${trimmed.slice(-1)}`;
  }
  return "***";
}

/**
 * Che giấu số điện thoại thí sinh (ví dụ: "0923923923" -> "092***923").
 */
export function maskPhoneNumber(phone?: string | null): string {
  return maskPII(phone);
}

/**
 * Che giấu số thẻ Căn cước công dân hoặc Hộ chiếu (ví dụ: "040204017040" -> "040***040").
 */
export function maskDocumentNumber(doc?: string | null): string {
  return maskPII(doc);
}

/**
 * Che giấu địa chỉ email thí sinh, bảo toàn tên miền (ví dụ: "040204017040@vinhuni.edu.vn" -> "04***40@vinhuni.edu.vn").
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const trimmed = email.trim();
  if (!trimmed) return "—";

  if (trimmed.includes("***")) {
    return trimmed;
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return maskPII(trimmed);
  }

  const [local, domain] = parts;
  let maskedLocal = "***";
  if (local.length > 6) {
    maskedLocal = `${local.slice(0, 2)}***${local.slice(-2)}`;
  } else if (local.length > 3) {
    maskedLocal = `${local.slice(0, 2)}***${local.slice(-1)}`;
  } else if (local.length > 1) {
    maskedLocal = `${local.slice(0, 1)}***`;
  }

  return `${maskedLocal}@${domain}`;
}

/**
 * Che giấu số nhà/ngõ cụ thể ở đầu địa chỉ, giữ lại tên phường/xã/tỉnh.
 * (ví dụ: "201 hhhthhth" -> "*** hhhthhth", "ngõ 192 hưng bình" -> "*** hưng bình").
 */
export function maskAddress(address?: string | null): string {
  if (!address) return "—";
  const trimmed = address.trim();
  if (!trimmed) return "—";

  if (trimmed.includes("***")) {
    return trimmed;
  }

  // Tách theo dấu phẩy nếu có cấu trúc địa chỉ chuẩn
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    const rest = parts.slice(1).join(",").trim();
    return `***, ${rest}`;
  }

  // Nếu là chuỗi đơn có số ở đầu
  const replaced = trimmed.replace(/^([^\s]+|\w+\s+\d+)\s+/i, "*** ");
  return replaced !== trimmed ? replaced : `*** ${trimmed}`;
}

