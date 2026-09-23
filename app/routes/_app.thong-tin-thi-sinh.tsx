import * as React from "react";
import type { Route } from "./+types/_app.thong-tin-thi-sinh";
import { requireAuth } from "~/lib/auth.server";
import { API_BASE_URL } from "~/lib/env.server";

import type {
  CandidateResponseDTO,
  DocumentResponseDTO,
  Province,
  Ward,
} from "~/types/candidate";
import type { CandidateProfileFormValues } from "~/lib/schemas/candidate";
import type { CandidateDocumentFormValues } from "~/lib/schemas/candidate";

import { ProfileForm } from "~/components/candidate/ProfileForm";
import { DocumentForm } from "~/components/candidate/DocumentForm";
import { toast } from "~/components/ui/toast";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "~/components/ui/card";

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

  // 1. Họ và tên từ tài khoản đăng ký/đăng nhập
  const userFullName =
    (user?.full_name && user.full_name.trim()) ||
    (user?.name && !user.name.startsWith("Thí sinh") ? user.name.trim() : "");

  // Fetch candidate profile without awaiting it (Streaming)
  const profilePromise = fetch(`${API_BASE_URL}/api/v1/me/candidate-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (res.ok) return res.json() as Promise<{ data: CandidateResponseDTO }>;
      return null;
    })
    .then((result) => result?.data ?? null)
    .catch((error) => {
      console.error("[CandidateProfile] Error fetching profile:", error);
      return null;
    });

  // Fetch documents only if profile exists (Chained Promise for Streaming)
  const documentPromise = profilePromise.then((profile) => {
    if (!profile) return null;
    return fetch(`${API_BASE_URL}/api/v1/me/candidate-profile/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json() as Promise<{ data: DocumentResponseDTO | DocumentResponseDTO[] }>;
        return null;
      })
      .then((result) => {
        if (!result) return null;
        const docData = result.data;
        return Array.isArray(docData) ? docData[0] ?? null : docData ?? null;
      })
      .catch((error) => {
        console.error("[CandidateProfile] Error fetching documents:", error);
        return null;
      });
  });

  // Fetch provinces concurrently
  const provincesPromise = fetch(`${API_BASE_URL}/api/v1/locations/provinces`)
    .then((res) => {
      if (res.ok) return res.json() as Promise<{ data: Province[] }>;
      return null;
    })
    .then((result) => result?.data ?? [])
    .catch((error) => {
      console.error("[CandidateProfile] Error fetching provinces:", error);
      return [];
    });

  // Fetch wards chained from documentPromise
  const wardsPromise = documentPromise.then((document) => {
    if (!document?.province_id) return [];
    return fetch(`${API_BASE_URL}/api/v1/locations/provinces/${document.province_id}/wards`)
      .then((res) => {
        if (res.ok) return res.json() as Promise<{ data: Ward[] }>;
        return null;
      })
      .then((result) => result?.data ?? [])
      .catch((error) => {
        console.error("[CandidateProfile] Error fetching wards:", error);
        return [];
      });
  });

  return {
    profilePromise,
    documentPromise,
    provincesPromise,
    wardsPromise,
    token,
    apiBaseUrl: API_BASE_URL,
    userCccd,
    userFullName,
  };
}

// ─── Page Component ─────────────────────────────────────────────────────────
export default function CandidateProfilePage({
  loaderData,
}: Route.ComponentProps) {
  const {
    token,
    apiBaseUrl,
    userCccd,
    userFullName,
    profilePromise,
    documentPromise,
    provincesPromise,
    wardsPromise,
  } = loaderData;

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

      <React.Suspense fallback={<PageSkeleton />}>
        <CandidateFormsWrapper
          profilePromise={profilePromise}
          documentPromise={documentPromise}
          provincesPromise={provincesPromise}
          wardsPromise={wardsPromise}
          token={token}
          apiBaseUrl={apiBaseUrl}
          userCccd={userCccd}
          userFullName={userFullName}
        />
      </React.Suspense>
    </div>
  );
}

// ─── Client Forms Wrapper (uses React.use to resolve data) ──────────────────
function CandidateFormsWrapper({
  profilePromise,
  documentPromise,
  provincesPromise,
  wardsPromise,
  token,
  apiBaseUrl,
  userCccd,
  userFullName,
}: {
  profilePromise: Promise<CandidateResponseDTO | null>;
  documentPromise: Promise<DocumentResponseDTO | null>;
  provincesPromise: Promise<Province[]>;
  wardsPromise: Promise<Ward[]>;
  token: string;
  apiBaseUrl: string;
  userCccd: string;
  userFullName: string;
}) {
  const resolvedProfile = React.use(profilePromise);
  const resolvedDocument = React.use(documentPromise);
  const resolvedProvinces = React.use(provincesPromise);
  const resolvedWards = React.use(wardsPromise);

  const [profile, setProfile] = React.useState(resolvedProfile);
  const [document, setDocument] = React.useState(resolvedDocument);

  async function handleProfileSubmit(
    data: CandidateProfileFormValues,
    isNew: boolean
  ) {
    const method = isNew ? "POST" : "PATCH";
    const url = `${apiBaseUrl}/api/v1/me/candidate-profile`;

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

  async function handleDocumentSubmit(data: CandidateDocumentFormValues) {
    const url = `${apiBaseUrl}/api/v1/me/candidate-profile/documents`;

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
    <>
      <ProfileForm
        profile={profile}
        defaultFullName={userFullName}
        onSubmit={handleProfileSubmit}
      />
      <DocumentForm
        document={document}
        provinces={resolvedProvinces}
        initialWards={resolvedWards}
        token={token}
        apiBaseUrl={apiBaseUrl}
        onSubmit={handleDocumentSubmit}
        disabled={profile === null}
        userCccd={userCccd}
      />
      {profile === null && (
        <p className="text-center text-xs text-muted-foreground">
          Vui lòng tạo hồ sơ cá nhân trước khi cập nhật giấy tờ tùy thân.
        </p>
      )}
    </>
  );
}

// ─── Skeleton Loading State ───────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1.5" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1.5" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Skeleton className="h-4 w-40 mb-3" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-md" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
