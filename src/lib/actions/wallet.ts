"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getAdminUser } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-audit";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { vndToPoints } from "@/lib/points";
import { safeNext } from "@/lib/safe-next";
import { sendEmail } from "@/lib/email";
import { topupApprovedEmail, topupRejectedEmail } from "@/lib/email-templates";
import { notifyAdmin } from "@/lib/admin-notify";

async function assertAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Không có quyền admin.");
  return admin;
}

export interface TopupState {
  error?: string;
}

const MIN_TOPUP_VND = 10000;
const MAX_TOPUP_VND = 50000000;

/** User tạo yêu cầu nạp point → sinh mã CK → sang trang QR. */
const MAX_PENDING_TOPUPS = 3;

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
  // Chặn tạo đơn liên tục (làm ngập hàng đợi admin): tối đa 3 đơn đang chờ duyệt / người.
  const { count: pendingCount } = await supabase
    .from("point_topups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= MAX_PENDING_TOPUPS)
    return {
      error: `Bạn đang có ${MAX_PENDING_TOPUPS} đơn nạp chờ duyệt. Hãy chuyển khoản theo đơn đã tạo (xem ở mục Đơn nạp gần đây) hoặc đợi admin duyệt.`,
    };

  const code = `NAP${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const { data, error } = await supabase
    .from("point_topups")
    .insert({ user_id: user.id, code, amount_vnd: amount, points, status: "pending" })
    .select("id")
    .single();
  if (error || !data) return { error: "Không tạo được đơn nạp. Thử lại sau ít phút." };

  // Báo admin có đơn mới để đối soát chuyển khoản sớm (khách chờ duyệt mới có point).
  await notifyAdmin({
    title: `Đơn nạp mới ${code} — ${amount.toLocaleString("vi-VN")}đ`,
    eyebrow: "// Nạp point · Chờ duyệt",
    lines: [
      `Khách: ${user.email ?? user.id}`,
      `Mã nạp (nội dung CK): ${code}`,
      `Số tiền: ${amount.toLocaleString("vi-VN")}đ → ${points.toLocaleString("vi-VN")} point`,
      "Đối soát tài khoản ngân hàng rồi duyệt / từ chối ở trang Nạp point.",
    ],
    href: "/admin/topups",
    cta: "Mở Admin → Nạp point",
  });

  // Đến từ trang mua (thiếu point) → mang theo đường quay lại, để cộng point xong mua tiếp được ngay.
  const back = safeNext(String(formData.get("back") ?? ""), "");
  redirect(`/wallet/topup/${data.id}${back ? `?back=${encodeURIComponent(back)}` : ""}`);
}

/**
 * Admin duyệt đơn nạp → cộng point + đánh dấu đã thu tiền.
 * Chốt trạng thái TRƯỚC (chỉ một request đổi được pending → paid) rồi mới cộng point: hai admin bấm duyệt
 * cùng lúc không cộng 2 lần. Cộng point lỗi → trả đơn về pending.
 */
export async function approveTopup(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createStoreAdminClient();
  const { data: topup, error: claimErr } = await supabase
    .from("point_topups")
    .update({ status: "paid", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,user_id,code,points,amount_vnd")
    .maybeSingle();
  if (claimErr) throw new Error(claimErr.message);
  if (!topup) return; // không tồn tại hoặc đã có người xử lý

  const { data: rpcBalance, error: rpcErr } = await supabase.rpc("adjust_points", {
    p_user: topup.user_id,
    p_amount: topup.points,
    p_kind: "topup",
    p_ref: topup.code,
    p_note: `Nạp point ${topup.code}`,
  });
  if (rpcErr) {
    await supabase.from("point_topups").update({ status: "pending", approved_at: null }).eq("id", id);
    throw new Error(rpcErr.message);
  }
  await logAdmin(admin, "topup.approve", { type: "topup", id }, {
    code: topup.code,
    user_id: topup.user_id,
    points: topup.points,
    amount_vnd: topup.amount_vnd,
  });
  // Báo khách qua email — lỗi gửi không ảnh hưởng việc duyệt.
  await notifyTopupUser(topup.user_id, topupApprovedEmail({
    code: topup.code,
    points: topup.points,
    amountVnd: topup.amount_vnd,
    balance: typeof rpcBalance === "number" ? rpcBalance : null,
  }));

  revalidatePath("/admin/topups");
}

/** Admin từ chối đơn nạp — kèm lý do (hiện cho khách + gửi email). */
export async function rejectTopup(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const reason =
    String(formData.get("reason") ?? "").trim().slice(0, 300) || "Chưa nhận được chuyển khoản khớp số tiền và nội dung của đơn.";

  const supabase = createStoreAdminClient();
  const { data: rejected } = await supabase
    .from("point_topups")
    .update({ status: "rejected", reject_reason: reason })
    .eq("id", id)
    .eq("status", "pending")
    .select("user_id,code,points,amount_vnd")
    .maybeSingle();
  if (rejected) {
    await logAdmin(admin, "topup.reject", { type: "topup", id }, { code: rejected.code, points: rejected.points, reason });
    await notifyTopupUser(rejected.user_id, topupRejectedEmail({ code: rejected.code, amountVnd: rejected.amount_vnd, reason }));
  }

  revalidatePath("/admin/topups");
}

/** Gửi email trạng thái đơn nạp cho chủ đơn (email tài khoản). Lỗi chỉ ghi log. */
async function notifyTopupUser(userId: string, mail: { subject: string; text: string; html: string }) {
  try {
    const { data } = await createStoreAdminClient().auth.admin.getUserById(userId);
    const to = data.user?.email;
    if (!to) return;
    const sent = await sendEmail({ to, ...mail });
    if (!sent.ok) console.error("topup email", sent.error);
  } catch (e) {
    console.error("topup email", e);
  }
}
