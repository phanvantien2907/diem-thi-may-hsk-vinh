/**
 * Cloudinary upload utility
 *
 * Luồng:
 * 1. getUploadSignature(token) — lấy chữ ký từ backend
 * 2. uploadToCloudinary(file, signature) — upload trực tiếp lên Cloudinary
 * 3. Trả về URL ảnh đã upload
 */
import type { CloudinarySignatureDTO } from "~/types/candidate";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Validate file trước khi upload */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Kích thước ảnh không được vượt quá 5MB";
  }
  return null;
}

/** Lấy chữ ký upload từ backend */
export async function getUploadSignature(
  token: string,
  apiBaseUrl: string
): Promise<CloudinarySignatureDTO> {
  const response = await fetch(
    `${apiBaseUrl}/api/v1/me/candidate-profile/upload-signature`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Không thể lấy chữ ký upload. Vui lòng thử lại.");
  }

  const result = (await response.json()) as { data: CloudinarySignatureDTO };
  return result.data;
}

/** Upload file trực tiếp lên Cloudinary */
export async function uploadToCloudinary(
  file: File,
  signature: CloudinarySignatureDTO
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.api_key);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("❌ Cloudinary Upload Error:", errData);

    const errorMsg = errData?.error?.message || "Upload ảnh thất bại. Vui lòng thử lại.";
    throw new Error(`Cloudinary báo lỗi: ${errorMsg}`);
  }

  const data = (await response.json()) as { secure_url: string };
  return data.secure_url;
}
