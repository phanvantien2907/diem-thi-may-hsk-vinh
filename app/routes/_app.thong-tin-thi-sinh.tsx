/**
 * _app.thong-tin-thi-sinh.tsx — /thong-tin-thi-sinh
 *
 * Trang "Thông tin thí sinh" — form hồ sơ cá nhân + giấy tờ tùy thân.
 *
 * Loader:
 *   - GET /api/v1/me/candidate-profile → populate profile form (404 = chưa có)
 *   - Trả về { profile, token, apiBaseUrl }
 *
 * Không dùng action — submit qua client-side fetch (Cloudinary upload cần client).
 */
import * as React from "react";
import type { Route } from "./+types/_app.thong-tin-thi-sinh";
import { requireAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";

import type {
  CandidateResponseDTO,
  DocumentResponseDTO,
} from "~/types/candidate";
import type { CandidateProfileFormValues } from "~/lib/schemas/candidate";
import type { CandidateDocumentFormValues } from "~/lib/schemas/candidate";

import { ProfileForm } from "~/components/candidate/ProfileForm";
import { DocumentForm } from "~/components/candidate/DocumentForm";
import { toast } from "~/components/ui/toast";

// ─── SEO Meta ─────────────────────────────────────────────────────────────────
export const meta: Route.MetaFunction = () => [
  { title: "Thông tin thí sinh" },
  {
    name: "description",
    content:
      "Hoàn thiện hồ sơ thí sinh để đăng ký thi HSK máy tính tại Trường Đại học Vinh.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { user, token } = await requireAuth(request);
  const userCccd = user?.cccd || user?.username || "";

  let profile: CandidateResponseDTO | null = null;
  let document: DocumentResponseDTO | null = null;

  // Fetch candidate profile
  try {
    const profileRes = await fetch(`${API_BASE_URL}/api/v1/me/candidate-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (profileRes.ok) {
      const result = (await profileRes.json()) as { data: CandidateResponseDTO };
      profile = result.data;
    }
    // 404 = chưa có hồ sơ → profile stays null
  } catch (error) {
    console.error("[CandidateProfile] Error fetching profile:", error);
  }

  // Fetch documents (nếu đã có profile)
  if (profile) {
    try {
      const docRes = await fetch(
        `${API_BASE_URL}/api/v1/me/candidate-profile/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (docRes.ok) {
        const result = (await docRes.json()) as { data: DocumentResponseDTO | DocumentResponseDTO[] };
        // API trả về object hoặc array — normalize
        const docData = result.data;
        document = Array.isArray(docData)
          ? docData[0] ?? null
          : docData ?? null;
      }
    } catch (error) {
      console.error("[CandidateProfile] Error fetching documents:", error);
    }
  }

  return { profile, document, token, apiBaseUrl: API_BASE_URL, userCccd };
}

// ─── Page Component ─────────────────────────────────────────────────────────
export default function CandidateProfilePage({
  loaderData,
}: Route.ComponentProps) {
  const { token, apiBaseUrl, userCccd } = loaderData;

  // Local state — populate from loader, then update on successful submit
  const [profile, setProfile] = React.useState(loaderData.profile);
  const [document, setDocument] = React.useState(loaderData.document);

  // ── Profile submit ────────────────────────────────────────────────────────
  async function handleProfileSubmit(
    data: CandidateProfileFormValues,
    isNew: boolean
  ) {
    const method = isNew ? "POST" : "PATCH";
    const url = `${apiBaseUrl}/api/v1/me/candidate-profile`;

    // Clean up optional fields: remove empty strings, convert NaN to undefined
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === "" || (typeof value === "number" && isNaN(value))) continue;
      body[key] = value;
    }

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as {
        msg?: string;
      } | null;
      throw new Error(
        err?.msg ?? "Không thể lưu thông tin. Vui lòng thử lại."
      );
    }

    const result = (await response.json()) as { data: CandidateResponseDTO };
    setProfile(result.data);
    toast.add({
      type: "success",
      title: isNew ? "Tạo hồ sơ thành công!" : "Cập nhật thành công!",
    });
  }

  // ── Document submit ───────────────────────────────────────────────────────
  async function handleDocumentSubmit(data: CandidateDocumentFormValues) {
    const url = `${apiBaseUrl}/api/v1/me/candidate-profile/documents`;

    // Clean up optional fields
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (
        value === "" ||
        value === undefined ||
        (typeof value === "number" && isNaN(value))
      )
        continue;
      body[key] = value;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => null)) as {
        msg?: string;
      } | null;
      throw new Error(
        err?.msg ?? "Không thể lưu giấy tờ. Vui lòng thử lại."
      );
    }

    const result = (await response.json()) as { data: DocumentResponseDTO };
    setDocument(result.data);
    toast.add({
      type: "success",
      title: "Lưu giấy tờ thành công!",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Thông tin thí sinh
        </h1>
        <p className="text-sm text-muted-foreground">
          Hoàn thiện hồ sơ cá nhân và giấy tờ tùy thân để đăng ký thi HSK.
        </p>
      </div>

      {/* Section 1: Thông tin cá nhân */}
      <ProfileForm profile={profile} onSubmit={handleProfileSubmit} />

      {/* Section 2: Giấy tờ tùy thân */}
      <DocumentForm
        document={document}
        token={token}
        apiBaseUrl={apiBaseUrl}
        onSubmit={handleDocumentSubmit}
        disabled={profile === null}
        userCccd={userCccd}
      />

      {/* Hint khi chưa có profile */}
      {profile === null && (
        <p className="text-center text-xs text-muted-foreground">
          Vui lòng tạo hồ sơ cá nhân trước khi upload giấy tờ tùy thân.
        </p>
      )}
    </div>
  );
}
