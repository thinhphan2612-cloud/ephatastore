import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getGiaolyContextFor } from "@/lib/giaoly-context";
import { notifyAdmin } from "@/lib/admin-notify";

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
  if (error && endpoint && secret) {
    // Lỗi đồng bộ → báo admin ngay (bỏ qua khi chưa cấu hình — môi trường local / preview) (trước đây chỉ hiện ở Admin → Đồng bộ GLS, không ai biết để thử lại).
    const p = job.payload as { action?: string; parish_id?: string; feature_key?: string };
    await notifyAdmin({
      title: `Đồng bộ Giáo Lý Số lỗi — ${p.action === "revoke_feature" ? "tắt" : "bật"} ${p.feature_key ?? "tính năng"}`,
      eyebrow: "// Đồng bộ Giáo Lý Số · Lỗi",
      lines: [`Giáo xứ: ${p.parish_id ?? "?"}`, `Lệnh: ${p.action ?? "?"} · ${p.feature_key ?? "?"}`, `Lỗi: ${error.slice(0, 300)}`],
      href: "/admin/provisions",
      cta: "Mở Admin → Đồng bộ GLS (Thử lại)",
    });
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
 * Đồng bộ quyền tính năng của MỘT GIÁO XỨ (parish_entitlements) sang Giáo Lý Số: còn hạn → grant_feature, hết / thu hồi → revoke_feature.
 * Gọi sau mọi thay đổi quyền tính năng: mua, dùng thử, nhận miễn phí, admin cấp/thu hồi. Không phải sản phẩm tính năng → bỏ qua.
 * actorUserId: tài khoản gây ra thay đổi (ghi vào job để tra cứu). Trả true nếu đã tạo + gửi job.
 */
export async function syncParishFeature(parishId: string, productId: string, actorUserId: string | null = null): Promise<boolean> {
  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,title,tagline,giaoly_feature_key")
    .eq("id", productId)
    .maybeSingle();
  const featureKey = product?.giaoly_feature_key;
  if (!featureKey) return false;

  const now = new Date().toISOString();
  const { data: ent } = await supabase
    .from("parish_entitlements")
    .select("expires_at")
    .eq("parish_id", parishId)
    .eq("product_id", productId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .maybeSingle();

  const base = { parish_id: parishId, feature_key: featureKey, source: "ephata", ref: `${productId}:${parishId}` };
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
    .insert({ action: payload.action, product_id: productId, store_user_id: actorUserId, parish_id: parishId, payload })
    .select("id,payload")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Không tạo được job provision.");
  await send(job as Job);
  return true;
}

/** Đồng bộ tính năng cho giáo xứ HIỆN TẠI của user (đã liên kết Giáo Lý Số). Chưa liên kết → bỏ qua. */
export async function syncFeatureProvision(userId: string, productId: string): Promise<boolean> {
  const ctx = await getGiaolyContextFor(userId); // làm mới nếu cũ → đúng giáo xứ hiện tại
  if (!ctx?.parishId) return false;
  return syncParishFeature(ctx.parishId, productId, userId);
}

/**
 * Admin: gửi lại một job lỗi = đồng bộ lại theo TRẠNG THÁI HIỆN TẠI của giáo xứ (job mới), không gửi nguyên payload cũ —
 * payload cũ có thể đã lỗi thời (quyền đã bị thu hồi / đã gia hạn sau đó). Job cũ đóng lại kèm ghi chú.
 */
export async function retryProvisionJob(id: string): Promise<void> {
  const supabase = createStoreAdminClient();
  const { data: job } = await supabase
    .from("provision_jobs")
    .select("id,store_user_id,product_id,parish_id")
    .eq("id", id)
    .maybeSingle();
  if (!job?.product_id) return;
  // Job mới có parish_id → không phụ thuộc người mua còn liên kết; job cũ (trước 0024) → theo giáo xứ hiện tại của người đó.
  const sent = job.parish_id
    ? await syncParishFeature(job.parish_id, job.product_id, job.store_user_id)
    : job.store_user_id
      ? await syncFeatureProvision(job.store_user_id, job.product_id)
      : false;
  await supabase
    .from("provision_jobs")
    .update(
      sent
        ? { status: "done", last_error: "Đã thay bằng lần gửi mới theo trạng thái hiện tại (xem job mới nhất).", updated_at: new Date().toISOString() }
        : { last_error: "Không gửi lại được: không xác định được giáo xứ (người dùng đã gỡ liên kết Giáo Lý Số).", updated_at: new Date().toISOString() }
    )
    .eq("id", job.id);
}
