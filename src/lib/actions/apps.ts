"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser, getCurrentUser } from "@/lib/auth";
import { connect, disconnect, getAppProductById, rotateAppSecret } from "@/data/apps";

/** Người dùng đồng ý cho app trừ point (màn hình xin phép ở /launch hoặc /play). */
export async function acceptAppConnection(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("product_id") ?? "");
  const next = String(formData.get("next") ?? "/");
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!(await getAppProductById(productId))) throw new Error("Sản phẩm không tồn tại.");
  await connect(productId, user.id);
  // Chỉ quay lại đường dẫn nội bộ.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/** Ngắt kết nối app khỏi ví (trang Ví). */
export async function disconnectApp(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await disconnect(String(formData.get("connection_id") ?? ""), user.id);
  revalidatePath("/wallet");
}

/** Admin tạo khóa bí mật server mới cho app ngoài — trả khóa rõ, chỉ hiện một lần. */
export async function createAppSecret(productId: string): Promise<string> {
  if (!(await getAdminUser())) throw new Error("Không có quyền admin.");
  return rotateAppSecret(productId);
}
