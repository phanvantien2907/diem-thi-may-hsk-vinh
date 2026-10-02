import { redirect } from "react-router";
import type { Route } from "./+types/_app.index";
import { getTokenFromRequest, decodeJwtPayload, getUserInfoFromCookie } from "~/lib/auth.server";

export function loader({ request }: Route.LoaderArgs) {
  const token = getTokenFromRequest(request);
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload?.user_role === "admin") {
      return redirect("/trang-quan-tri");
    }
  }

  const cachedUser = getUserInfoFromCookie(request);
  if (cachedUser?.rawRole === "admin" || cachedUser?.role === "Quản trị viên") {
    return redirect("/trang-quan-tri");
  }

  return redirect("/thong-tin-thi-sinh");
}

// Component không bao giờ render (loader luôn redirect)
export default function AppIndex() {
  return null;
}
