import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

/**
 * Bật / tắt tính năng bên Giáo Lý Số cho GIÁO XỨ khi quyền trên Ephata thay đổi.
 * Gửi webhook tới edge function `provision` của Giáo Lý Số (header x-provision-secret).
 * Mỗi lần gửi là một job trong provision_jobs: lỗi thì giữ failed + lỗi để admin thử lại — không mất đơn.
 *
 * Payload grant_feature: { action, parish_id, feature_key, expires_at|null, source, ref, feature: { name, description } }
 * Payload revoke_feature: { action, parish_id, feature_key, source, ref }
 */

type Job = { id: string; payload: Record<string, unknown> };

async function send(job: Job): Promise<void> {
  const supabase = createStoreAdminClient();
  const endpoint = process.env.GIAOLY_PROVISION_URL;
  const secret = process.env.GIAOLY_PROVISION_SECRET;
  let error: string | null = null;
  if (!endpoint || !secret) {
    error = "Chưa cấu hình GIAOLY_PROVISION_URL / GIAOLY_PROVISION_SECRET.";
  } else {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "x-provision-secret": secret },
        body: JSON.stringify(job.payload),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) error = `Giáo Lý Số trả ${res.status}: ${(await res.text()).slice(0, 300)}`;
    } catch (e) {
      error = e instanceof Error ? e.message : "Không gọi được Giáo Lý Số.";
    }
  }
  const { data: cur } = await supabase.from("provision_jobs").select("attempts").eq("id", job.id).single();
  await supabase
    .from("provision_jobs")
    .update({
      status: error ? "failed" : "done",
      last_error: error,
      attempts: (cur?.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

/**
 * Đồng bộ quyền tính năng của một user (đã liên kết Giáo Lý Số, là quản trị giáo xứ) sang Giáo Lý Số.
 * Gọi sau mọi thay đổi quyền sản phẩm loại tính năng: mua, dùng thử, nhận miễn phí, admin cấp/thu hồi.
 * Không phải sản phẩm tính năng (không có feature key) → bỏ qua.
 */
export async function syncFeatureProvision(userId: string, productId: string): Promise<void> {
  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,title,tagline,giaoly_feature_key")
    .eq("id", productId)
    .maybeSingle();
  const featureKey = product?.giaoly_feature_key;
  if (!featureKey) return;

  const { data: prof } = await supabase
    .from("profiles")
    .select("parish_id")
    .eq("id", userId)
    .maybeSingle();
  if (!prof?.parish_id) return; // chưa liên kết Giáo Lý Số — luồng mua đã chặn trước

  const now = new Date().toISOString();
  const { data: ent } = await supabase
    .from("entitlements")
    .select("expires_at")
    .eq("store_user_id", userId)
    .eq("product_id", productId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  const base = { parish_id: prof.parish_id, feature_key: featureKey, source: "ephata", ref: `${productId}:${userId}` };
  const payload = ent
    ? {
        action: "grant_feature",
        ...base,
        expires_at: ent.expires_at,
        feature: { name: product.title, description: product.tagline ?? "" },
      }
    : { action: "revoke_feature", ...base };

  const { data: job, error } = await supabase
    .from("provision_jobs")
    .insert({ action: payload.action, product_id: productId, store_user_id: userId, payload })
    .select("id,payload")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Không tạo được job provision.");
  await send(job as Job);
}

/** Admin: gửi lại một job lỗi. */
export async function retryProvisionJob(id: string): Promise<void> {
  const { data: job } = await createStoreAdminClient()
    .from("provision_jobs")
    .select("id,payload")
    .eq("id", id)
    .maybeSingle();
  if (job) await send(job as Job);
}
