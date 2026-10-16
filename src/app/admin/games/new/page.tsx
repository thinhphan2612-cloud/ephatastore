import { redirect } from "next/navigation";

/** Link cũ — "Chạy trên store" nay dùng form chung (đủ mô tả HTML, logo, ảnh minh họa…). */
export default function NewGamePage() {
  redirect("/admin/products/new?kind=hosted");
}
