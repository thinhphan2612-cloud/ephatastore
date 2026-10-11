"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { vndToPoints } from "@/lib/points";

async function assertAdmin() {
  if (!(await getAdminUser())) throw new Error("Không có quyền admin.");
}

export interface TopupState {
  error?: string;
}

const MIN_TOPUP_VND = 10000;
const MAX_TOPUP_VND = 50000000;

/** User tạo yêu cầu nạp point → sinh mã CK → sang trang QR. */
export async function createTopup(
  _prev: TopupState,
  formData: FormData
): Promise<TopupState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn chưa đăng nhập." };

  const amount = Math.floor(Number(formData.get("amount_vnd")));
  if (!Number.isFinite(amount) || amount < MIN_TOPUP_VND)
    return { error: `Số tiền nạp tối thiểu ${MIN_TOPUP_VND.toLocaleString("vi-VN")}đ.` };
  if (amount > MAX_TOPUP_VND) return { error: "Số tiền nạp quá lớn." };

  const points = vndToPoints(amount);
  if (points <= 0) return { error: "Số tiền không hợp lệ." };

  const supabase = createStoreAdminClient();
  const code = `NAP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from("point_topups")
    .insert({ user_id: user.id, code, amount_vnd: amount, points, status: "pending" })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Không tạo được đơn nạp." };

  redirect(`/wallet/topup/${data.id}`);
}

/** Admin duyệt đơn nạp → cộng point (atomic) + đánh dấu đã thu tiền. */
export async function approveTopup(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { data: topup } = await supabase
    .from("point_topups")
    .select("id,user_id,code,points,status")
    .eq("id", id)
    .maybeSingle();
  if (!topup) throw new Error("Không tìm thấy đơn nạp.");
  if (topup.status !== "pending") return; // đã xử lý

  const { error: rpcErr } = await supabase.rpc("adjust_points", {
    p_user: topup.user_id,
    p_amount: topup.points,
    p_kind: "topup",
    p_ref: topup.code,
    p_note: `Nạp point ${topup.code}`,
  });
  if (rpcErr) throw new Error(rpcErr.message);

  const { error } = await supabase
    .from("point_topups")
    .update({ status: "paid", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending"); // chống duyệt 2 lần
  if (error) throw new Error(error.message);

  revalidatePath("/admin/topups");
}

/** Admin từ chối đơn nạp. */
export async function rejectTopup(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();
  await supabase
    .from("point_topups")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  revalidatePath("/admin/topups");
}
