"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { DEVICE_RESET_DAYS } from "@/data/software";

/**
 * Khách tự gỡ một thiết bị khỏi key phần mềm của mình (đổi máy / cài lại Windows) — 1 lần / 30 ngày / key.
 * Máy đã gỡ: lần làm mới bản quyền kế tiếp sẽ về "chưa kích hoạt" (refresh yêu cầu thiết bị đã đăng ký).
 */
export async function removeMyDevice(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/library");
  const deviceId = String(formData.get("device_id") ?? "").trim();
  if (!deviceId) return;

  const supabase = createStoreAdminClient();
  const { data: dev } = await supabase
    .from("license_devices")
    .select("id,license:licenses!inner(id,store_user_id,devices_reset_at)")
    .eq("id", deviceId)
    .maybeSingle();
  const lic = dev?.license as unknown as { id: string; store_user_id: string | null; devices_reset_at: string | null } | null;
  if (!dev || !lic || lic.store_user_id !== user.id) return; // không phải key của mình

  // Chốt lượt gỡ trước (điều kiện trong câu update) → 2 lần bấm song song không gỡ được 2 máy.
  const cutoff = new Date(Date.now() - DEVICE_RESET_DAYS * 86400000).toISOString();
  const { data: claimed } = await supabase
    .from("licenses")
    .update({ devices_reset_at: new Date().toISOString() })
    .eq("id", lic.id)
    .or(`devices_reset_at.is.null,devices_reset_at.lt.${cutoff}`)
    .select("id")
    .maybeSingle();
  if (!claimed) redirect("/library?notice=device_reset_wait");

  await supabase.from("license_devices").delete().eq("id", dev.id);
  revalidatePath("/library");
  redirect("/library?notice=device_removed");
}
