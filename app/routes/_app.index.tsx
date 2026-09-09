/**
 * Index route — "/" redirect đến "/thong-tin-thi-sinh"
 * Route này được loader của _app.tsx bảo vệ trước khi đến đây
 */
import { redirect } from "react-router";

export function loader() {
  return redirect("/thong-tin-thi-sinh");
}

// Component không bao giờ render (loader luôn redirect)
export default function AppIndex() {
  return null;
}
